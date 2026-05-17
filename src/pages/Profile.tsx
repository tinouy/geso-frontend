import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import './Profile.css'

export default function Profile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  })
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/auth/me')
      setProfileData({
        username: response.data.username,
        email: response.data.email,
      })
    } catch (error: any) {
      setError('Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.put('/api/auth/me', profileData)
      setSuccess('Perfil actualizado correctamente')
      // Recargar el perfil para obtener los datos actualizados
      await fetchProfile()
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordSaving(true)
    setError('')
    setSuccess('')

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Las contraseñas no coinciden')
      setPasswordSaving(false)
      return
    }

    if (passwordData.new_password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setPasswordSaving(false)
      return
    }

    try {
      await api.put('/api/auth/me/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      })
      setSuccess('Contraseña actualizada correctamente')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error al actualizar la contraseña')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="loading">Cargando perfil...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="profile-page">
        <h1>Mi Perfil</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="card">
          <h2>Información Personal</h2>
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <input
                type="text"
                value={user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                disabled
                className="disabled-input"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Cambiar Contraseña</h2>
          <form onSubmit={handlePasswordUpdate}>
            <div className="form-group">
              <label htmlFor="current_password">Contraseña Actual</label>
              <input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new_password">Nueva Contraseña</label>
              <input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm_password">Confirmar Nueva Contraseña</label>
              <input
                id="confirm_password"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
              {passwordSaving ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}

