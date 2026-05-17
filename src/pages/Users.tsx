import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Users.css'

interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  is_active: string
}

export default function Users() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/auth/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user',
    })
    setShowModal(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // No prellenar contraseña
      role: user.role,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        // Actualizar usuario (sin contraseña si está vacía)
        const updateData: any = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
        }
        await api.put(`/api/auth/users/${editingUser.id}`, updateData)
      } else {
        // Crear nuevo usuario
        await api.post('/api/auth/users', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        })
      }
      setShowModal(false)
      fetchUsers()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al guardar el usuario')
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: string) => {
    try {
      await api.put(`/api/auth/users/${userId}`, {
        is_active: currentStatus === 'true' ? 'false' : 'true',
      })
      fetchUsers()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al cambiar el estado del usuario')
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
        <div className="loading">Cargando usuarios...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="users-page">
        <div className="users-header">
          <h1>Gestión de Usuarios</h1>
          <button onClick={handleCreate} className="btn btn-primary">
            Nuevo Usuario
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.role === 'admin' ? 'Administrador' : 'Usuario'}</td>
                  <td>
                    <span className={`status-badge ${u.is_active === 'true' ? 'active' : 'inactive'}`}>
                      {u.is_active === 'true' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleEdit(u)}
                      className="btn btn-secondary"
                      style={{ marginRight: '5px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`btn ${u.is_active === 'true' ? 'btn-warning' : 'btn-success'}`}
                    >
                      {u.is_active === 'true' ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                <button onClick={() => setShowModal(false)} className="close-btn">
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Usuario</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                {!editingUser && (
                  <div className="form-group">
                    <label>Contraseña</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      minLength={6}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    required
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingUser ? 'Actualizar' : 'Crear'}
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

