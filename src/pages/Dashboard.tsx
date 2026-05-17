import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../services/api'
import './Dashboard.css'

interface Stats {
  total_members: number
  active_members: number
  members_by_type: Record<string, number>
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [membersRes, typesRes] = await Promise.all([
        api.get('/api/members?limit=1000'),
        api.get('/api/member-types'),
      ])

      const members = membersRes.data
      const types = typesRes.data
      const typeMap: Record<string, string> = {}
      types.forEach((t: any) => {
        typeMap[t.id] = t.name
      })

      const activeTypes = ['ACTIVO', 'NOVATO', 'HONORARIO']
      const activeMembers = members.filter((m: any) =>
        activeTypes.includes(typeMap[m.member_type_id])
      )

      const byType: Record<string, number> = {}
      members.forEach((m: any) => {
        const typeName = typeMap[m.member_type_id] || 'Unknown'
        byType[typeName] = (byType[typeName] || 0) + 1
      })

      setStats({
        total_members: members.length,
        active_members: activeMembers.length,
        members_by_type: byType,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="loading">Cargando estadísticas...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="dashboard">
        <h1>Dashboard</h1>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total de Socios</h3>
            <p className="stat-number">{stats?.total_members || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Socios Activos</h3>
            <p className="stat-number">{stats?.active_members || 0}</p>
          </div>
        </div>

        <div className="card">
          <h2>Socios por Tipo</h2>
          <div className="type-stats">
            {stats?.members_by_type &&
              Object.entries(stats.members_by_type).map(([type, count]) => (
                <div key={type} className="type-stat-item">
                  <span className="type-name">{type}</span>
                  <span className="type-count">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="quick-actions">
          <Link to="/members" className="btn btn-primary">
            Gestionar Socios
          </Link>
        </div>
      </div>
    </Layout>
  )
}

