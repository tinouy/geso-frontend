import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import getBackendUrl from '../utils/backendUrl'
import './CheckMember.css'

export default function CheckMember() {
  const { memberNumber: memberNumberParam } = useParams<{ memberNumber?: string }>()
  const [memberNumber, setMemberNumber] = useState(memberNumberParam || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    has_benefit: boolean
    message: string
    member_number: number
  } | null>(null)
  const [error, setError] = useState('')
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const checkMember = async () => {
    if (!memberNumber || isNaN(Number(memberNumber))) {
      setError('Por favor ingrese un número de socio válido')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      // Usar fetch directamente para evitar interceptores de autenticación
      const backendUrl = getBackendUrl()
      const response = await fetch(`${backendUrl}/api/public/check-benefit?member_number=${memberNumber}`)
      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
        // Actualizar la URL sin recargar la página
        navigate(`/check-member/${memberNumber}`, { replace: true })
      } else {
        setError(data.detail || 'Error al consultar el socio')
      }
    } catch (err: any) {
      setError('Error de conexión. Por favor intente nuevamente.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    checkMember()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkMember()
    }
  }

  // Si hay un número en la URL, consultar automáticamente al cargar
  useEffect(() => {
    if (memberNumberParam && !result && !loading) {
      setMemberNumber(memberNumberParam)
      const checkAuto = async () => {
        setLoading(true)
        try {
          const backendUrl = getBackendUrl()
          const response = await fetch(`${backendUrl}/api/public/check-benefit?member_number=${memberNumberParam}`)
          const data = await response.json()
          if (response.ok) {
            setResult(data)
          }
        } catch (err) {
          // Silenciar errores en carga automática
        } finally {
          setLoading(false)
        }
      }
      checkAuto()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberNumberParam])

  return (
    <div className="check-member-container">
      <div className="check-member-header">
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
      <div className="check-member-content">
        <h1>Verificar Estado de Socio</h1>
        <p className="subtitle">Ingrese el número de socio para verificar si puede usar los beneficios del club</p>
        
        <form onSubmit={handleSubmit} className="check-member-form">
          <div className="form-group">
            <label htmlFor="memberNumber">Número de Socio</label>
            <div className="input-group">
              <input
                id="memberNumber"
                type="number"
                value={memberNumber}
                onChange={(e) => setMemberNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ej: 3"
                min="1"
                autoFocus
                className="member-input"
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Consultando...' : 'Consultar'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {result && (
          <div className={`result-card ${result.has_benefit ? 'enabled' : 'disabled'}`}>
            <div className="result-icon">
              {result.has_benefit ? '✓' : '✗'}
            </div>
            <div className="result-content">
              <h2 className={result.has_benefit ? 'enabled-text' : 'disabled-text'}>
                {result.has_benefit ? 'Socio Habilitado' : 'No Habilitado'}
              </h2>
              <p className="result-number">Número de socio: {result.member_number}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

