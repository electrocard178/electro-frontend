// Configuración de la API
// En producción, forzar URL si no está definida (temporal para debug)
const isProduction = process.env.NODE_ENV === 'production';
const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (isProduction ? 'https://sistema-backend-api-db-vp.onrender.com/api' : 'http://localhost:5001/api');

// Configuración de headers
export const getHeaders = (token, currentUser) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Validar token antes de agregar header para evitar "jwt malformed"
  if (token && typeof token === 'string' && token.trim().length > 0) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
    console.log('🔑 Authorization header agregado con token válido (longitud:', token.length, ')');
  } else {
    console.warn('⚠️ Token inválido, vacío o ausente - No se agrega Authorization header. Token:', token);
  }
  
  // Agregar información del usuario para el backend
  if (currentUser?.branchId) {
    headers['x-user-branch-id'] = currentUser.branchId;
  }
  
  if (currentUser?.role) {
    headers['x-user-role'] = currentUser.role;
  }
  
  return headers;
};

// Función para manejar errores de la API
export const handleApiError = (error) => {
  console.error('🔴 Error en API:', error);

  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    const isProd = process.env.REACT_APP_ENVIRONMENT === 'production';
    const backendUrl = isProd
      ? 'https://sistema-backend-api-db-vp.onrender.com/api'
      : 'http://localhost:5001';

    const connectionError = new Error(
      `No se pudo conectar al servidor. ${
        isProd
          ? 'El servicio de producción puede estar temporalmente indisponible.'
          : 'Verifica que el backend esté ejecutándose en ' + backendUrl
      }`
    );
    connectionError.status = 0;
    throw connectionError;
  }

  if (error.response) {
    console.error('🔴 Respuesta de error:', {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    });

    // Para errores 401 en login, usar mensaje específico
    let message = error.response.data?.message || error.response.data?.error || `Error HTTP ${error.response.status}`;
    if (error.response.status === 401 && error.response.config?.url?.includes('/auth/login')) {
      message = 'Usuario incorrecto o contraseña incorrecta';
    }

    const apiError = new Error(message);
    apiError.status = error.response.status;
    apiError.response = error.response;
    throw apiError;
  }

  // Si no hay response, es un error de red u otro tipo
  console.error('🔴 Error sin respuesta HTTP:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  const networkError = new Error(error.message || 'Error de red desconocido');
  networkError.status = -1;
  throw networkError;
};

// Función para hacer peticiones HTTP
export const apiRequest = async (endpoint, options = {}, token, currentUser) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const baseHeaders = getHeaders(token, currentUser);
  
  console.log('🔍 DEBUG apiRequest - URL:', url);
  console.log('🔍 DEBUG apiRequest - Headers:', baseHeaders);
  console.log('🔍 DEBUG apiRequest - Token recibido:', token ? 'Presente' : 'Ausente');

  // Clonar options para no mutar el original
  const config = {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers || {})
    }
  };

  // Si existe body y es JSON string, intentar parsear para detectar adminPassword/userPassword
  if (config.body && typeof config.body === 'string') {
    try {
      const parsed = JSON.parse(config.body);
      if (parsed && typeof parsed === 'object') {
        if (parsed.adminPassword) {
          // Agregar también en header para compatibilidad
          config.headers['x-admin-password'] = parsed.adminPassword;
          // Nota: dejamos el adminPassword también en el body (backend soporta ambos)
        }
        if (parsed.userPassword) {
          config.headers['x-user-password'] = parsed.userPassword;
        }
      }
    } catch (e) {
      // Si no se puede parsear, ignorar (puede ser que no sea JSON)
    }
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Para errores 401 en login, usar mensaje específico
      let errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      if (response.status === 401 && url.includes('/auth/login')) {
        errorMessage = 'Usuario incorrecto o contraseña incorrecta';
      }

      const error = new Error(errorMessage);
      error.response = response;
      error.status = response.status;
      throw error;
    }

    // Intentar parsear JSON, si no hay contenido devolver objeto vacío
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return text;
    }
  } catch (error) {
    handleApiError(error);
  }
};

// Funciones de API específicas
export const api = {
  // GET request
  get: (endpoint, token, currentUser) => apiRequest(endpoint, {}, token, currentUser),

  // POST request
  post: (endpoint, data, token, currentUser) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token, currentUser),

  // PUT request
  put: (endpoint, data, token, currentUser) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token, currentUser),

  // DELETE request
  // Si se pasa data (por ejemplo { adminPassword: '...' } o { userPassword: '...' }), se incluirá en body
  // y además se colocará en headers x-admin-password / x-user-password para compatibilidad con middleware.
  delete: (endpoint, data, token, currentUser) => apiRequest(endpoint, {
    method: 'DELETE',
    ...(data && { body: JSON.stringify(data) }),
  }, token, currentUser),
};

export default api;