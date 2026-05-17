import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'
import getBackendUrl from '../utils/backendUrl'
import './Members.css'

interface Member {
  id: string
  member_number: number
  first_name: string
  last_name: string
  email?: string
  identity_document?: string
  phone_number?: string
  is_bjcp_judge?: string
  business_name?: string
  member_type_id: string
  member_type: {
    id: string
    name: string
  }
  last_payment_date?: string
}

interface MemberType {
  id: string
  name: string
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([])
  const [memberTypes, setMemberTypes] = useState<MemberType[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  
  // Filtros tipo Excel para las columnas (arrays para selección múltiple)
  const [filterMemberType, setFilterMemberType] = useState<string[]>([])
  const [filterBjcpJudge, setFilterBjcpJudge] = useState<string[]>([])
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [showTypeFilter, setShowTypeFilter] = useState<boolean>(false)
  const [showBjcpFilter, setShowBjcpFilter] = useState<boolean>(false)
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false)
  // Estados temporales para los filtros antes de aplicar
  const [tempFilterMemberType, setTempFilterMemberType] = useState<string[]>([])
  const [tempFilterBjcpJudge, setTempFilterBjcpJudge] = useState<string[]>([])
  const [tempFilterDateFrom, setTempFilterDateFrom] = useState<string>('')
  const [tempFilterDateTo, setTempFilterDateTo] = useState<string>('')
  
  // Estados para el ancho de las columnas (porcentajes fijos)
  const columnWidths: Record<string, number> = {
    checkbox: 3,      // 3%
    numero: 5,        // 5%
    nombre: 10,       // 10%
    apellido: 10,     // 10%
    email: 15,        // 15%
    telefono: 10,     // 10%
    tipo: 10,         // 10%
    juez: 8,          // 8%
    comercial: 12,    // 12%
    pago: 10,         // 10%
    acciones: 7,      // 7%
  }
  
  // Estados de paginación
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalMembers, setTotalMembers] = useState<number>(0)
  
  // Ref para mantener el foco en el input de búsqueda
  const searchInputRef = useRef<HTMLInputElement>(null)
  const wasSearchFocused = useRef<boolean>(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    identity_document: '',
    phone_number: '',
    is_bjcp_judge: 'false',
    business_name: '',
    member_type_id: '',
    last_payment_date: '',
  })

  // Carga inicial
  useEffect(() => {
    fetchData(true)
  }, [])

  // Búsquedas y filtros dinámicos (sin recargar toda la página)
  useEffect(() => {
    if (!initialLoading) {
      fetchData(false)
    }
  }, [currentPage, pageSize, search, filterMemberType, filterBjcpJudge, filterDateFrom, filterDateTo])

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterMemberType, filterBjcpJudge, filterDateFrom, filterDateTo])
  

  // Estado para controlar qué menú de acciones está abierto
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const [bajaConfirmMember, setBajaConfirmMember] = useState<Member | null>(null)
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<Member | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')

  // Cerrar filtros al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.filter-icon-wrapper') && !target.closest('.filter-dropdown')) {
        setShowTypeFilter(false)
        setShowBjcpFilter(false)
        setShowDateFilter(false)
      }
      if (!target.closest('.action-menu-wrapper') && !target.closest('.action-menu-dropdown')) {
        setOpenActionMenu(null)
      }
    }
    if (showTypeFilter || showBjcpFilter || showDateFilter || openActionMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTypeFilter, showBjcpFilter, showDateFilter, openActionMenu])

  // Restaurar el foco en el input de búsqueda después de que se complete la carga
  useEffect(() => {
    if (!searching && !initialLoading && wasSearchFocused.current && searchInputRef.current) {
      // Usar requestAnimationFrame para asegurar que el DOM esté completamente actualizado
      requestAnimationFrame(() => {
        if (searchInputRef.current && wasSearchFocused.current) {
          searchInputRef.current.focus()
          // Restaurar la posición del cursor al final del texto
          const input = searchInputRef.current
          const length = input.value.length
          input.setSelectionRange(length, length)
        }
      })
    }
  }, [searching, initialLoading, members])

  const fetchData = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setInitialLoading(true)
    } else {
      setSearching(true)
    }
    try {
      // Si hay filtros de columna activos, necesitamos cargar TODOS los datos para filtrar en el frontend
      const hasColumnFilters = filterMemberType.length > 0 || filterBjcpJudge.length > 0 || filterDateFrom || filterDateTo
      
      // Siempre cargar todos los datos cuando hay filtros de columna, o cuando pageSize es 0 (todos)
      // Si no hay filtros de columna y hay paginación, cargar solo la página solicitada
      const skip = (hasColumnFilters || pageSize === 0) ? 0 : (currentPage - 1) * pageSize
      const limit = (hasColumnFilters || pageSize === 0) ? 50000 : pageSize
      
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      })
      
      if (search) {
        params.append('search', search)
      }
      
      // Obtener total de miembros para calcular paginación
      // Cuando hay filtros de columna, el total se calculará después de filtrar en el frontend
      const countParams = new URLSearchParams()
      if (search) countParams.append('search', search)
      countParams.append('skip', '0')
      countParams.append('limit', '50000') // Obtener todos para contar
      
      const [membersRes, typesRes, countRes] = await Promise.all([
        api.get(`/api/members?${params.toString()}`),
        api.get('/api/member-types'),
        api.get(`/api/members?${countParams.toString()}`),
      ])
      
      setMembers(membersRes.data)
      setMemberTypes(typesRes.data)
      // Si hay filtros de columna, el totalMembers se actualizará después del filtrado
      // Si no hay filtros, usar el total del backend
      if (!hasColumnFilters) {
        setTotalMembers(countRes.data.length)
      }
      
      if (!formData.member_type_id && typesRes.data.length > 0) {
        const activeType = typesRes.data.find((t: MemberType) => t.name === 'ACTIVO')
        setFormData({ ...formData, member_type_id: activeType?.id || typesRes.data[0].id })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false)
      } else {
        setSearching(false)
      }
    }
  }

  const handleCreate = () => {
    setEditingMember(null)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      identity_document: '',
      phone_number: '',
      is_bjcp_judge: 'false',
      business_name: '',
      member_type_id: memberTypes.find(t => t.name === 'ACTIVO')?.id || memberTypes[0]?.id || '',
      last_payment_date: '',
    })
    setShowModal(true)
  }

  // Función helper para formatear fecha a YYYY-MM-DD (solo fecha, sin tiempo)
  // Extrae directamente del string para evitar problemas de zona horaria
  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return ''
    // Si ya está en formato YYYY-MM-DD, devolverlo directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    // Si tiene tiempo (formato ISO), extraer solo la parte de fecha (primeros 10 caracteres)
    // Ejemplo: "2024-01-15T00:00:00" -> "2024-01-15"
    if (dateString.includes('T')) {
      return dateString.split('T')[0]
    }
    // Si tiene espacio (otro formato común), tomar la primera parte
    if (dateString.includes(' ')) {
      return dateString.split(' ')[0]
    }
    return dateString
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email || '',
      identity_document: member.identity_document || '',
      phone_number: member.phone_number || '',
      is_bjcp_judge: member.is_bjcp_judge || 'false',
      business_name: member.business_name || '',
      member_type_id: member.member_type_id,
      last_payment_date: formatDateForInput(member.last_payment_date),
    })
    setShowModal(true)
  }

  const handleSetBaja = (member: Member) => {
    setBajaConfirmMember(member)
  }

  const confirmSetBaja = async () => {
    if (!bajaConfirmMember) return
    const bajaType = memberTypes.find(t => t.name === 'BAJA')
    if (!bajaType) return
    try {
      await api.put(`/api/members/${bajaConfirmMember.id}`, { member_type_id: bajaType.id })
      fetchData()
    } catch (error) {
      console.error('Error al dar de baja:', error)
    } finally {
      setBajaConfirmMember(null)
    }
  }

  const handlePermanentDelete = (member: Member) => {
    setDeleteConfirmInput('')
    setDeleteConfirmMember(member)
  }

  const confirmPermanentDelete = async () => {
    if (!deleteConfirmMember || deleteConfirmInput !== 'ELIMINAR') return
    try {
      await api.delete(`/api/members/${deleteConfirmMember.id}`)
      fetchData()
    } catch (error) {
      console.error('Error al eliminar:', error)
    } finally {
      setDeleteConfirmMember(null)
      setDeleteConfirmInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingMember) {
        await api.put(`/api/members/${editingMember.id}`, formData)
      } else {
        await api.post('/api/members', formData)
      }
      setShowModal(false)
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al guardar el socio')
    }
  }

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMembers.length === 0) {
      alert('Seleccione al menos un socio')
      return
    }

    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    const updateData: any = {}
    
    if (formData.get('member_type_id')) {
      updateData.member_type_id = formData.get('member_type_id')
    }
    if (formData.get('last_payment_date')) {
      updateData.last_payment_date = formData.get('last_payment_date')
    }

    if (Object.keys(updateData).length === 0) {
      alert('Seleccione al menos un campo para actualizar')
      return
    }

    try {
      await api.post('/api/members/bulk-update', {
        member_ids: selectedMembers,
        ...updateData,
      })
      setShowBulkModal(false)
      setSelectedMembers([])
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al actualizar los socios')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token')
      const backendUrl = getBackendUrl()
      
      // Construir URL con el filtro de tipo de socio si existe
      let url = `${backendUrl}/api/members/export`
      if (filterMemberType.length > 0) {
        // Si hay múltiples tipos seleccionados, exportar todos (o el primero)
        url += `?member_type_id=${filterMemberType[0]}`
      }
      
      // Realizar petición con fetch para manejar la descarga del archivo
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al exportar socios')
      }
      
      // Obtener el nombre del archivo del header Content-Disposition o usar uno por defecto
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'socios.csv'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      // Convertir respuesta a blob y descargar
      const blob = await response.blob()
      const url_blob = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url_blob
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url_blob)
    } catch (error: any) {
      console.error('Error exporting members:', error)
      alert(error.message || 'Error al exportar los socios')
    }
  }

  // Aplicar filtros tipo Excel en el frontend
  const filteredMembers = members.filter((member) => {
    // Filtro por tipo de socio (múltiple)
    if (filterMemberType.length > 0 && !filterMemberType.includes(member.member_type_id)) {
      return false
    }
    
    // Filtro por Juez BJCP (múltiple)
    if (filterBjcpJudge.length > 0) {
      const isJudge = member.is_bjcp_judge === 'true'
      if (filterBjcpJudge.includes('si') && !isJudge) {
        return false
      }
      if (filterBjcpJudge.includes('no') && isJudge) {
        return false
      }
      // Si solo hay una opción seleccionada y no coincide
      if (filterBjcpJudge.length === 1) {
        if (filterBjcpJudge[0] === 'si' && !isJudge) return false
        if (filterBjcpJudge[0] === 'no' && isJudge) return false
      }
    }
    
    // Filtro por fecha de último pago
    if (filterDateFrom || filterDateTo) {
      if (!member.last_payment_date) {
        return false // Si no tiene fecha de pago y hay filtro, excluir
      }
      
      // Normalizar la fecha del miembro a formato YYYY-MM-DD (sin tiempo)
      const memberDateStr = formatDateForInput(member.last_payment_date)
      const memberDate = new Date(memberDateStr + 'T00:00:00')
      
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom + 'T00:00:00')
        if (memberDate < fromDate) {
          return false
        }
      }
      
      if (filterDateTo) {
        const toDate = new Date(filterDateTo + 'T23:59:59.999')
        if (memberDate > toDate) {
          return false
        }
      }
    }
    
    return true
  })
  
  // Aplicar paginación en el frontend cuando hay filtros de columna activos
  const hasColumnFilters = filterMemberType.length > 0 || filterBjcpJudge.length > 0 || filterDateFrom || filterDateTo
  
  // Si hay filtros de columna, actualizar el total basado en los miembros filtrados
  useEffect(() => {
    if (hasColumnFilters) {
      setTotalMembers(filteredMembers.length)
    }
  }, [hasColumnFilters, filteredMembers.length])
  
  // Aplicar paginación sobre los miembros filtrados
  // Si hay filtros de columna, siempre paginar en el frontend sobre todos los datos filtrados
  // Si no hay filtros y pageSize > 0, los datos ya vienen paginados del backend
  const paginatedMembers = (hasColumnFilters || pageSize === 0) && pageSize > 0
    ? filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredMembers

  if (initialLoading) {
    return (
      <Layout>
        <div className="loading">Cargando socios...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="members-page">
        <div className="members-header">
          <h1>Gestión de Socios</h1>
          <div className="header-actions">
            {selectedMembers.length > 0 && (
              <button
                onClick={() => setShowBulkModal(true)}
                className="btn btn-primary"
              >
                Actualizar Seleccionados ({selectedMembers.length})
              </button>
            )}
            <button onClick={handleCreate} className="btn btn-primary">
              Nuevo Socio
            </button>
          </div>
        </div>

        <div className="filters">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar por nombre, email, teléfono o número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => {
              wasSearchFocused.current = true
            }}
            onBlur={() => {
              // Solo marcar como no enfocado si el nuevo foco no está en el mismo componente
              // Esto previene que se pierda el foco durante re-renders
              setTimeout(() => {
                if (document.activeElement !== searchInputRef.current) {
                  wasSearchFocused.current = false
                }
              }, 0)
            }}
            className="search-input"
          />
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="filter-select"
            style={{ marginLeft: '10px' }}
          >
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
            <option value={500}>500 por página</option>
            <option value={0}>Todos</option>
          </select>
          <button 
            onClick={handleExport} 
            className="btn btn-secondary"
            style={{ marginLeft: '10px' }}
          >
            Exportar CSV
          </button>
        </div>

        <div className="table-container" style={{ position: 'relative' }}>
          {searching && (
            <div className="search-loading-overlay">
              <div className="search-loading-spinner"></div>
            </div>
          )}
          <table className="table resizable-table">
            <thead>
              <tr>
                <th style={{ width: `${columnWidths.checkbox}%` }}>
                  <input
                    type="checkbox"
                    checked={
                      paginatedMembers.length > 0 &&
                      paginatedMembers.every(m => selectedMembers.includes(m.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers(paginatedMembers.map(m => m.id))
                      } else {
                        setSelectedMembers([])
                      }
                    }}
                  />
                </th>
                <th 
                  style={{ width: `${columnWidths.numero}%` }}
                  className="resizable-header"
                >
                  <div className="th-content">
                    Nro
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.nombre}%` }}
                  className="resizable-header"
                >
                  <div className="th-content">
                    Nombre
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.apellido}%` }}
                  className="resizable-header"
                >
                  <div className="th-content">
                    Apellido
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.email}%` }}
                  className="resizable-header"
                >
                  <div className="th-content">
                    Email
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.telefono}%` }}
                  className="resizable-header"
                >
                  <div className="th-content">
                    Teléfono
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.tipo}%` }}
                  className="resizable-header"
                >
                  <div className="table-filter-header">
                    <span>Tipo</span>
                    <div className="filter-icon-wrapper" onClick={(e) => {
                      e.stopPropagation()
                      if (!showTypeFilter) {
                        setTempFilterMemberType([...filterMemberType])
                      }
                      setShowTypeFilter(!showTypeFilter)
                      setShowBjcpFilter(false)
                    }}>
                      <svg 
                        className={`filter-icon ${filterMemberType.length > 0 ? 'filter-active' : ''}`}
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {showTypeFilter && (
                        <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
                          <div className="filter-options">
                            {memberTypes.map((type) => (
                              <label key={type.id} className="filter-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={tempFilterMemberType.includes(type.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTempFilterMemberType([...tempFilterMemberType, type.id])
                                    } else {
                                      setTempFilterMemberType(tempFilterMemberType.filter(id => id !== type.id))
                                    }
                                  }}
                                />
                                <span>{type.name}</span>
                              </label>
                            ))}
                          </div>
                          <div className="filter-actions">
                            <button
                              className="btn-filter-apply"
                              onClick={() => {
                                setFilterMemberType([...tempFilterMemberType])
                                setShowTypeFilter(false)
                              }}
                            >
                              Aplicar
                            </button>
                            <button
                              className="btn-filter-clear"
                              onClick={() => {
                                setTempFilterMemberType([])
                                setFilterMemberType([])
                                setShowTypeFilter(false)
                              }}
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.juez}%` }}
                  className="resizable-header"
                >
                  <div className="table-filter-header">
                    <span>Juez/A</span>
                    <div className="filter-icon-wrapper" onClick={(e) => {
                      e.stopPropagation()
                      if (!showBjcpFilter) {
                        setTempFilterBjcpJudge([...filterBjcpJudge])
                      }
                      setShowBjcpFilter(!showBjcpFilter)
                      setShowTypeFilter(false)
                    }}>
                      <svg 
                        className={`filter-icon ${filterBjcpJudge.length > 0 ? 'filter-active' : ''}`}
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {showBjcpFilter && (
                        <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
                          <div className="filter-options">
                            <label className="filter-checkbox-label">
                              <input
                                type="checkbox"
                                checked={tempFilterBjcpJudge.includes('si')}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTempFilterBjcpJudge([...tempFilterBjcpJudge, 'si'])
                                  } else {
                                    setTempFilterBjcpJudge(tempFilterBjcpJudge.filter(v => v !== 'si'))
                                  }
                                }}
                              />
                              <span>Sí</span>
                            </label>
                            <label className="filter-checkbox-label">
                              <input
                                type="checkbox"
                                checked={tempFilterBjcpJudge.includes('no')}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTempFilterBjcpJudge([...tempFilterBjcpJudge, 'no'])
                                  } else {
                                    setTempFilterBjcpJudge(tempFilterBjcpJudge.filter(v => v !== 'no'))
                                  }
                                }}
                              />
                              <span>No</span>
                            </label>
                          </div>
                          <div className="filter-actions">
                            <button
                              className="btn-filter-apply"
                              onClick={() => {
                                setFilterBjcpJudge([...tempFilterBjcpJudge])
                                setShowBjcpFilter(false)
                              }}
                            >
                              Aplicar
                            </button>
                            <button
                              className="btn-filter-clear"
                              onClick={() => {
                                setTempFilterBjcpJudge([])
                                setFilterBjcpJudge([])
                                setShowBjcpFilter(false)
                              }}
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.comercial}%` }}
                  className="resizable-header"
                >
                  <div className="th-content">
                    Marca
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.pago}%` }}
                  className="resizable-header"
                >
                  <div className="table-filter-header">
                    <span>Último Pago</span>
                    <div className="filter-icon-wrapper" onClick={(e) => {
                      e.stopPropagation()
                      if (!showDateFilter) {
                        setTempFilterDateFrom(filterDateFrom)
                        setTempFilterDateTo(filterDateTo)
                      }
                      setShowDateFilter(!showDateFilter)
                      setShowTypeFilter(false)
                      setShowBjcpFilter(false)
                    }}>
                      <svg 
                        className={`filter-icon ${(filterDateFrom || filterDateTo) ? 'filter-active' : ''}`}
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {showDateFilter && (
                        <div className="filter-dropdown filter-date-dropdown" onClick={(e) => e.stopPropagation()}>
                          <div className="filter-date-inputs">
                            <div className="filter-date-group">
                              <label>Desde:</label>
                              <input
                                type="date"
                                value={tempFilterDateFrom}
                                onChange={(e) => setTempFilterDateFrom(e.target.value)}
                                className="filter-date-input"
                              />
                            </div>
                            <div className="filter-date-group">
                              <label>Hasta:</label>
                              <input
                                type="date"
                                value={tempFilterDateTo}
                                onChange={(e) => setTempFilterDateTo(e.target.value)}
                                className="filter-date-input"
                              />
                            </div>
                          </div>
                          <div className="filter-actions">
                            <button
                              className="btn-filter-apply"
                              onClick={() => {
                                setFilterDateFrom(tempFilterDateFrom)
                                setFilterDateTo(tempFilterDateTo)
                                setShowDateFilter(false)
                              }}
                            >
                              Aplicar
                            </button>
                            <button
                              className="btn-filter-clear"
                              onClick={() => {
                                setTempFilterDateFrom('')
                                setTempFilterDateTo('')
                                setFilterDateFrom('')
                                setFilterDateTo('')
                                setShowDateFilter(false)
                              }}
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th 
                  style={{ width: `${columnWidths.acciones}%` }}
                  className="resizable-header"
                >
                  <div className="th-content" style={{ justifyContent: 'center' }}>
                    Más
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleSelect(member.id)}
                    />
                  </td>
                  <td>{member.member_number}</td>
                  <td>{member.first_name}</td>
                  <td>{member.last_name}</td>
                  <td>{member.email || '-'}</td>
                  <td>{member.phone_number || '-'}</td>
                  <td>{member.member_type.name}</td>
                  <td>{member.is_bjcp_judge === 'true' ? 'Sí' : 'No'}</td>
                  <td>{member.business_name || '-'}</td>
                  <td>
                    {member.last_payment_date
                      ? (() => {
                          const dateOnly = formatDateForInput(member.last_payment_date)
                          const [year, month, day] = dateOnly.split('-')
                          return `${day}/${month}/${year}`
                        })()
                      : '-'}
                  </td>
                  <td style={{ position: 'relative', overflow: 'visible' }}>
                    <div className="action-menu-wrapper">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          const spaceBelow = window.innerHeight - rect.bottom
                          const dropdownHeight = 80
                          const top = spaceBelow < dropdownHeight
                            ? rect.top - dropdownHeight
                            : rect.bottom + 4
                          setMenuPosition({ top, right: window.innerWidth - rect.right })
                          setOpenActionMenu(openActionMenu === member.id ? null : member.id)
                        }}
                        className="btn-icon btn-more"
                        title="Más opciones"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="8" cy="4" r="1.5" fill="currentColor"/>
                          <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                          <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
                        </svg>
                      </button>
                      {openActionMenu === member.id && menuPosition && (
                        <div
                          className="action-menu-dropdown"
                          style={{ position: 'fixed', top: menuPosition.top, right: menuPosition.right }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              handleEdit(member)
                              setOpenActionMenu(null)
                            }}
                            className="action-menu-item action-menu-item-edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.333 2.00001C11.5084 1.82475 11.7163 1.68603 11.9447 1.59131C12.1731 1.49659 12.4173 1.44775 12.6667 1.44775C12.916 1.44775 13.1602 1.49659 13.3886 1.59131C13.617 1.68603 13.8249 1.82475 14 2.00001C14.1753 2.17527 14.314 2.38318 14.4087 2.6116C14.5034 2.84002 14.5523 3.0842 14.5523 3.33334C14.5523 3.58249 14.5034 3.82667 14.4087 4.05509C14.314 4.28351 14.1753 4.49141 14 4.66668L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => {
                              setOpenActionMenu(null)
                              handleSetBaja(member)
                            }}
                            className="action-menu-item action-menu-item-warning"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                              <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                            <span>Dar de Baja</span>
                          </button>
                          <button
                            onClick={() => {
                              setOpenActionMenu(null)
                              handlePermanentDelete(member)
                            }}
                            className="action-menu-item action-menu-item-danger"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 4H14M6.66667 4V2.66667C6.66667 2.31305 6.80714 1.97391 7.05719 1.72386C7.30724 1.47381 7.64638 1.33334 8 1.33334C8.35362 1.33334 8.69276 1.47381 8.94281 1.72386C9.19286 1.97391 9.33333 2.31305 9.33333 2.66667V4M11.3333 4V13.3333C11.3333 13.687 11.1929 14.0261 10.9428 14.2761C10.6928 14.5262 10.3536 14.6667 10 14.6667H6C5.64638 14.6667 5.30724 14.5262 5.05719 14.2761C4.80714 14.0261 4.66667 13.687 4.66667 13.3333V4H11.3333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Eliminar definitivamente</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Controles de paginación */}
        {(() => {
          const filteredTotal = filteredMembers.length
          const hasColumnFilters = filterMemberType.length > 0 || filterBjcpJudge.length > 0 || filterDateFrom || filterDateTo
          const displayTotal = hasColumnFilters ? filteredTotal : totalMembers
          
          if (hasColumnFilters && pageSize > 0 && filteredTotal > pageSize) {
            const totalPages = Math.ceil(filteredTotal / pageSize)
            return (
              <div className="pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredTotal)} de {filteredTotal} socios
                  <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>(filtrados)</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-secondary"
                  >
                    Anterior
                  </button>
                  <span>
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="btn btn-secondary"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )
          }
          
          if (!hasColumnFilters && pageSize > 0 && totalMembers > pageSize) {
            return (
              <div className="pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalMembers)} de {totalMembers} socios
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-secondary"
                  >
                    Anterior
                  </button>
                  <span>
                    Página {currentPage} de {Math.ceil(totalMembers / pageSize)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalMembers / pageSize), prev + 1))}
                    disabled={currentPage >= Math.ceil(totalMembers / pageSize)}
                    className="btn btn-secondary"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )
          }
          
          if (pageSize === 0 && displayTotal > 0) {
            return (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                Mostrando todos los {displayTotal} socios
                {hasColumnFilters && <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>(filtrados)</span>}
              </div>
            )
          }
          
          return null
        })()}

        {showModal && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingMember ? 'Editar Socio' : 'Nuevo Socio'}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Documento de Identidad</label>
                  <input
                    type="text"
                    value={formData.identity_document}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        identity_document: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Número de Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phone_number: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group form-group-inline">
                  <label htmlFor="is_bjcp_judge" className="inline-label">
                    Es Juez BJCP
                  </label>
                  <div className="checkbox-wrapper-inline">
                    <input
                      type="checkbox"
                      id="is_bjcp_judge"
                      checked={formData.is_bjcp_judge === 'true'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_bjcp_judge: e.target.checked ? 'true' : 'false',
                        })
                      }
                      className="checkbox-input"
                    />
                    <span className="checkbox-label-inline">
                      {formData.is_bjcp_judge === 'true' ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Tipo de Socio</label>
                  <select
                    value={formData.member_type_id}
                    onChange={(e) => {
                      const newTypeId = e.target.value
                      const newType = memberTypes.find(t => t.id === newTypeId)
                      // Si cambia de ADHERENTE a otro tipo, limpiar business_name
                      const currentType = memberTypes.find(t => t.id === formData.member_type_id)
                      const updatedFormData: any = { ...formData, member_type_id: newTypeId }
                      if (currentType?.name === 'ADHERENTE' && newType?.name !== 'ADHERENTE') {
                        updatedFormData.business_name = ''
                      }
                      setFormData(updatedFormData)
                    }}
                    required
                  >
                    {memberTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                {(memberTypes.find(t => t.id === formData.member_type_id)?.name === 'ADHERENTE' || 
                  editingMember?.member_type?.name === 'ADHERENTE') && (
                  <div className="form-group">
                    <label>Nombre Comercial del Emprendimiento/Cervecería</label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          business_name: e.target.value,
                        })
                      }
                      placeholder="Nombre del emprendimiento o cervecería"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Último Pago</label>
                  <input
                    type="date"
                    value={formData.last_payment_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        last_payment_date: e.target.value,
                      })
                    }
                  />
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
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBulkModal && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Actualizar Múltiples Socios</h2>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleBulkUpdate}>
                <div className="form-group">
                  <label>Tipo de Socio</label>
                  <select name="member_type_id" className="form-control">
                    <option value="">No cambiar</option>
                    {memberTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Último Pago</label>
                  <input type="date" name="last_payment_date" className="form-control" />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Actualizar {selectedMembers.length} Socios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {bajaConfirmMember && (
          <div className="modal">
            <div className="modal-content" style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h2>Dar de Baja</h2>
                <button onClick={() => setBajaConfirmMember(null)} className="close-btn">×</button>
              </div>
              <p style={{ margin: '0 0 8px' }}>
                ¿Confirmás dar de baja a{' '}
                <strong>{bajaConfirmMember.first_name} {bajaConfirmMember.last_name}</strong>?
              </p>
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                El socio pasará al estado <strong>BAJA</strong> y podrá ser reactivado en cualquier momento.
              </p>
              <div className="modal-actions">
                <button onClick={() => setBajaConfirmMember(null)} className="btn btn-secondary">Cancelar</button>
                <button onClick={confirmSetBaja} className="btn" style={{ backgroundColor: '#e07b00', color: '#fff', border: 'none' }}>
                  Dar de Baja
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirmMember && (
          <div className="modal">
            <div className="modal-content" style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h2>Eliminar definitivamente</h2>
                <button onClick={() => setDeleteConfirmMember(null)} className="close-btn">×</button>
              </div>
              <p style={{ margin: '0 0 8px' }}>
                Estás por eliminar permanentemente a{' '}
                <strong>{deleteConfirmMember.first_name} {deleteConfirmMember.last_name}</strong>.
              </p>
              <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Esta acción es <strong>irreversible</strong>. Para confirmar, escribí <strong>ELIMINAR</strong> a continuación:
              </p>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                placeholder="ELIMINAR"
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  marginBottom: 20,
                }}
              />
              <div className="modal-actions">
                <button onClick={() => setDeleteConfirmMember(null)} className="btn btn-secondary">Cancelar</button>
                <button
                  onClick={confirmPermanentDelete}
                  disabled={deleteConfirmInput !== 'ELIMINAR'}
                  className="btn"
                  style={{
                    backgroundColor: deleteConfirmInput === 'ELIMINAR' ? '#dc3545' : 'var(--bg-secondary)',
                    color: deleteConfirmInput === 'ELIMINAR' ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: deleteConfirmInput === 'ELIMINAR' ? 'pointer' : 'not-allowed',
                  }}
                >
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

