/**
 * Obtiene la URL del backend.
 * En producción: usa ruta relativa (nginx hace proxy reverso de /api/* al backend)
 * En desarrollo local: usa localhost:8000 directamente
 */
const getBackendUrl = (): string => {
  // En el navegador
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    
    // Si está en localhost o 127.0.0.1, usar puerto 8000 directamente (desarrollo local)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:8000`
    }
    
    // En producción, usar ruta relativa vacía (nginx hará proxy de /api/* al backend)
    // Esto hace que las peticiones vayan a la misma URL del frontend
    return ''
  }
  
  return 'http://localhost:8000'
}

export default getBackendUrl

