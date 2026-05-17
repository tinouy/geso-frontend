import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Config.css'

interface MemberType {
  id: string
  name: string
  description?: string
}

export default function Config() {
  const { user } = useAuth()
  const [memberTypes, setMemberTypes] = useState<MemberType[]>([])
  const [loading, setLoading] = useState(true)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [editingType, setEditingType] = useState<MemberType | null>(null)
  const [typeFormData, setTypeFormData] = useState({ name: '', description: '' })
  const [configFormData, setConfigFormData] = useState({
    club_name: '',
    annual_fee_amount: 0,
    period_type: 'yearly',
    prorrate_type: 'monthly',
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      const [configRes, typesRes] = await Promise.all([
        api.get('/api/config'),
        api.get('/api/member-types'),
      ])
      setConfigFormData({
        club_name: configRes.data.club_name,
        annual_fee_amount: configRes.data.annual_fee_amount,
        period_type: configRes.data.period_type,
        prorrate_type: configRes.data.prorrate_type,
      })
      setMemberTypes(typesRes.data)
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.put('/api/config', configFormData)
      alert('Configuración actualizada correctamente')
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al actualizar la configuración')
    }
  }

  const handleTypeCreate = () => {
    setEditingType(null)
    setTypeFormData({ name: '', description: '' })
    setShowTypeModal(true)
  }

  const handleTypeEdit = (type: MemberType) => {
    setEditingType(type)
    setTypeFormData({ name: type.name, description: type.description || '' })
    setShowTypeModal(true)
  }

  const handleTypeDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este tipo de socio?')) return
    try {
      await api.delete(`/api/member-types/${id}`)
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al eliminar el tipo de socio')
    }
  }

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingType) {
        await api.put(`/api/member-types/${editingType.id}`, typeFormData)
      } else {
        await api.post('/api/member-types', typeFormData)
      }
      setShowTypeModal(false)
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al guardar el tipo de socio')
    }
  }

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="error-message">No tiene permisos para acceder a esta página</div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div className="loading">Cargando configuración...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="config-page">
        <h1>Configuración</h1>

        <div className="card">
          <h2>Configuración del Club</h2>
          <form onSubmit={handleConfigSubmit}>
            <div className="form-group">
              <label>Nombre del Club</label>
              <input
                type="text"
                value={configFormData.club_name}
                onChange={(e) =>
                  setConfigFormData({ ...configFormData, club_name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Cuota Anual</label>
              <input
                type="number"
                value={configFormData.annual_fee_amount}
                onChange={(e) =>
                  setConfigFormData({
                    ...configFormData,
                    annual_fee_amount: parseFloat(e.target.value),
                  })
                }
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="form-group">
              <label>Tipo de Período</label>
              <select
                value={configFormData.period_type}
                onChange={(e) =>
                  setConfigFormData({ ...configFormData, period_type: e.target.value })
                }
              >
                <option value="yearly">Anual (12 meses)</option>
                <option value="december_to_december">Diciembre a Diciembre</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de Prorrateo</label>
              <select
                value={configFormData.prorrate_type}
                onChange={(e) =>
                  setConfigFormData({ ...configFormData, prorrate_type: e.target.value })
                }
              >
                <option value="monthly">Mensual</option>
                <option value="bimonthly">Bimensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="fourmonthly">Cuatrimestral</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Guardar Configuración
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Tipos de Socios</h2>
            <button onClick={handleTypeCreate} className="btn btn-primary">
              Nuevo Tipo
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {memberTypes.map((type) => (
                <tr key={type.id}>
                  <td>{type.name}</td>
                  <td>{type.description || '-'}</td>
                  <td>
                    <button
                      onClick={() => handleTypeEdit(type)}
                      className="btn btn-secondary"
                      style={{ marginRight: '5px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleTypeDelete(type.id)}
                      className="btn btn-danger"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showTypeModal && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingType ? 'Editar Tipo de Socio' : 'Nuevo Tipo de Socio'}</h2>
                <button onClick={() => setShowTypeModal(false)} className="close-btn">
                  ×
                </button>
              </div>
              <form onSubmit={handleTypeSubmit}>
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={typeFormData.name}
                    onChange={(e) =>
                      setTypeFormData({ ...typeFormData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={typeFormData.description}
                    onChange={(e) =>
                      setTypeFormData({ ...typeFormData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowTypeModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

