import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import getBackendUrl from '../utils/backendUrl'
import './Wizard.css'

interface WizardProps {
  onComplete: () => void
}

export default function Wizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingInit, setCheckingInit] = useState(true)
  const navigate = useNavigate()
  const { checkInitialization } = useAuth()
  
  const [clubName, setClubName] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('')
  const [annualFee, setAnnualFee] = useState(1000)
  const [periodType, setPeriodType] = useState('yearly')
  const [prorrateType, setProrrateType] = useState('monthly')
  
  const { theme, toggleTheme } = useTheme()

  // Verificar que el sistema no esté ya inicializado y cargar valores del conf si existen
  useEffect(() => {
    const checkInitAndLoadConf = async () => {
      try {
        const initialized = await checkInitialization()
        if (initialized) {
          // Si ya está inicializado, redirigir al login
          navigate('/login', { replace: true })
          return
        }

        // Cargar valores del archivo geso.conf si existen
        try {
          const backendUrl = getBackendUrl()
          const confResponse = await fetch(`${backendUrl}/api/config/conf`)
          if (confResponse.ok) {
            const confData = await confResponse.json()
            const conf = confData.conf || {}
            
            // Cargar valores del club
            if (conf.CLUB?.name && conf.CLUB.name !== '${CLUB_NAME}') {
              setClubName(conf.CLUB.name)
            }
            if (conf.ANNUAL_FEE?.amount && conf.ANNUAL_FEE.amount !== '${ANNUAL_FEE_AMOUNT}') {
              setAnnualFee(parseFloat(conf.ANNUAL_FEE.amount) || 1000)
            }
            if (conf.ANNUAL_FEE?.period_type && conf.ANNUAL_FEE.period_type !== '${PERIOD_TYPE}') {
              setPeriodType(conf.ANNUAL_FEE.period_type)
            }
            if (conf.ANNUAL_FEE?.prorrate_type && conf.ANNUAL_FEE.prorrate_type !== '${PRORRATE_TYPE}') {
              setProrrateType(conf.ANNUAL_FEE.prorrate_type)
            }
            
            // Cargar valores del admin
            if (conf.ADMIN?.username && conf.ADMIN.username !== '${ADMIN_USERNAME}') {
              setAdminUsername(conf.ADMIN.username)
            }
            if (conf.ADMIN?.email && conf.ADMIN.email !== '${ADMIN_EMAIL}') {
              setAdminEmail(conf.ADMIN.email)
            }
            if (conf.ADMIN?.password && conf.ADMIN.password !== '${ADMIN_PASSWORD}') {
              setAdminPassword(conf.ADMIN.password)
              setAdminPasswordConfirm(conf.ADMIN.password)
            }
          }
        } catch (confError) {
          console.log('No se pudo cargar geso.conf o no existe aún')
        }
      } catch (error) {
        console.error('Error checking initialization:', error)
      } finally {
        setCheckingInit(false)
      }
    }
    checkInitAndLoadConf()
  }, [checkInitialization, navigate])

  const handleStep1 = () => {
    if (!clubName.trim()) {
      setError('El nombre del club es requerido')
      return
    }
    setError('')
    setStep(2)
  }

  const handleStep2 = () => {
    if (!adminUsername.trim() || !adminEmail.trim() || !adminPassword) {
      setError('Todos los campos son requeridos')
      return
    }
    if (adminPassword !== adminPasswordConfirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (adminPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setError('')
    setStep(3)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // Escribir configuración en geso.conf
      const backendUrl = getBackendUrl()
      await fetch(`${backendUrl}/api/config/conf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          CLUB: {
            name: clubName,
            frontend_url: '${FRONTEND_URL}',
          },
          ANNUAL_FEE: {
            amount: annualFee.toString(),
            period_type: periodType,
            prorrate_type: prorrateType,
          },
          ADMIN: {
            username: adminUsername,
            email: adminEmail,
            password: adminPassword,
          },
        }),
      })

      // Crear configuración del club en la base de datos
      await api.post('/api/config', {
        club_name: clubName,
        annual_fee_amount: annualFee,
        period_type: periodType,
        prorrate_type: prorrateType,
      })

      // Crear usuario administrador (usará los valores del conf automáticamente)
      await api.post('/api/auth/users', {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      })

      onComplete()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al inicializar el sistema')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se verifica el estado de inicialización
  if (checkingInit) {
    return (
      <div className="wizard-container">
        <div className="loading">Verificando estado del sistema...</div>
      </div>
    )
  }

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
      <div className="wizard-card">
        <h1>Configuración Inicial</h1>
        <div className="wizard-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        {step === 1 && (
          <div className="wizard-step">
            <h2>Información del Club</h2>
            <div className="form-group">
              <label htmlFor="clubName">Nombre del Club</label>
              <input
                id="clubName"
                type="text"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Ej: Club de Cervezas"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="annualFee">Cuota Anual</label>
              <input
                id="annualFee"
                type="number"
                value={annualFee}
                onChange={(e) => setAnnualFee(parseFloat(e.target.value))}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="periodType">Tipo de Período</label>
              <select
                id="periodType"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
              >
                <option value="yearly">Anual (12 meses)</option>
                <option value="december_to_december">Diciembre a Diciembre</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="prorrateType">Tipo de Prorrateo</label>
              <select
                id="prorrateType"
                value={prorrateType}
                onChange={(e) => setProrrateType(e.target.value)}
              >
                <option value="monthly">Mensual</option>
                <option value="bimonthly">Bimensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="fourmonthly">Cuatrimestral</option>
              </select>
            </div>
            {error && <div className="error-message">{error}</div>}
            <button onClick={handleStep1} className="btn btn-primary">
              Siguiente
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step">
            <h2>Usuario Administrador</h2>
            <div className="form-group">
              <label htmlFor="adminUsername">Usuario</label>
              <input
                id="adminUsername"
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="adminEmail">Email</label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="adminPassword">Contraseña</label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="adminPasswordConfirm">Confirmar Contraseña</label>
              <input
                id="adminPasswordConfirm"
                type="password"
                value={adminPasswordConfirm}
                onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="wizard-buttons">
              <button onClick={() => setStep(1)} className="btn btn-secondary">
                Atrás
              </button>
              <button onClick={handleStep2} className="btn btn-primary">
                Siguiente
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step">
            <h2>Resumen</h2>
            <div className="summary">
              <p><strong>Club:</strong> {clubName}</p>
              <p><strong>Cuota Anual:</strong> ${annualFee}</p>
              <p><strong>Período:</strong> {periodType === 'yearly' ? 'Anual (12 meses)' : 'Diciembre a Diciembre'}</p>
              <p><strong>Prorrateo:</strong> {
                prorrateType === 'monthly' ? 'Mensual' :
                prorrateType === 'bimonthly' ? 'Bimensual' :
                prorrateType === 'quarterly' ? 'Trimestral' : 'Cuatrimestral'
              }</p>
              <p><strong>Administrador:</strong> {adminUsername} ({adminEmail})</p>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="wizard-buttons">
              <button onClick={() => setStep(2)} className="btn btn-secondary">
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Inicializando...' : 'Finalizar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

