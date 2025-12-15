import api from '../config/api';
import cache from '../utils/cache';

// Servicio de autenticación
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyAdminPassword: (token, currentUser, adminPassword) => {
    if (!token) {
      throw new Error('Token de autenticación requerido');
    }
    if (!adminPassword) {
      throw new Error('Contraseña de administrador requerida');
    }
    return api.post('/auth/verify-admin-password', { adminPassword }, token, currentUser);
  },
};

// Servicio de usuarios
export const userService = {
  getAll: (token, currentUser) => {
    const cacheKey = 'users';
    if (cache.has(cacheKey)) {
      return Promise.resolve(cache.get(cacheKey));
    }
    return api.get('/users', token, currentUser).then(result => {
      cache.set(cacheKey, result);
      return result;
    });
  },
  getById: (token, currentUser, id) => api.get(`/users/${id}`, token, currentUser),
  create: (token, currentUser, userData) => {
    cache.delete('users'); // Invalidate cache
    return api.post('/users', userData, token, currentUser);
  },
  update: (token, currentUser, id, userData) => {
    cache.delete('users'); // Invalidate cache
    return api.put(`/users/${id}`, userData, token, currentUser);
  },
  delete: (token, currentUser, id, password = null) => {
    if (!id) {
      throw new Error('ID del usuario requerido para eliminación');
    }
    if (!token) {
      throw new Error('Token de autenticación requerido para eliminación');
    }
    // Envío de contraseña adaptado según el rol del currentUser:
    // - admin -> { adminPassword }
    // - otros (p.ej. cajero) -> { userPassword }
    const data = password ? { adminPassword: password } : null;
    cache.delete('users'); // Invalidate cache
    return api.delete(`/users/${id}`, data, token, currentUser);
  },
};

// Servicio de productos
export const productService = {
  getAll: (token, currentUser, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products${queryString ? `?${queryString}` : ''}`, token, currentUser);
  },
  getById: (token, currentUser, id) => api.get(`/products/${id}`, token, currentUser),
  create: (token, currentUser, productData) => api.post('/products', productData, token, currentUser),
  update: (token, currentUser, id, productData) => api.put(`/products/${id}`, productData, token, currentUser),
  delete: (token, currentUser, id, password = null) => {
    if (!id) {
      throw new Error('ID del producto requerido para eliminación');
    }
    if (!token) {
      throw new Error('Token de autenticación requerido para eliminación');
    }
    const data = password ? { adminPassword: password } : null;
    return api.delete(`/products/${id}`, data, token, currentUser);
  },
};

// Servicio de categorías de productos
export const productCategoryService = {
  getAll: (token, currentUser) => api.get('/product-categories', token, currentUser),
  getById: (token, currentUser, id) => api.get(`/product-categories/${id}`, token, currentUser),
  create: (token, currentUser, categoryData) => api.post('/product-categories', categoryData, token, currentUser),
  update: (token, currentUser, id, categoryData) => api.put(`/product-categories/${id}`, categoryData, token, currentUser),
  delete: (token, currentUser, id) => api.delete(`/product-categories/${id}`, null, token, currentUser),
};

// Servicio de servicios (Servicios de barbería)
export const serviceService = {
  getAll: (token, currentUser) => api.get('/services', token, currentUser),
  getById: (token, currentUser, id) => api.get(`/services/${id}`, token, currentUser),
  create: (token, currentUser, serviceData) => api.post('/services', serviceData, token, currentUser),
  update: (token, currentUser, id, serviceData) => api.put(`/services/${id}`, serviceData, token, currentUser),
  delete: (token, currentUser, id) => api.delete(`/services/${id}`, null, token, currentUser),
};


// Servicio de personas
export const personService = {
  getAll: (token, currentUser, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/persons${queryString ? `?${queryString}` : ''}`, token, currentUser);
  },
  getById: (token, currentUser, id) => api.get(`/persons/${id}`, token, currentUser),
  create: (token, currentUser, personData) => api.post('/persons', personData, token, currentUser),
  update: (token, currentUser, id, personData) => api.put(`/persons/${id}`, personData, token, currentUser),
  delete: (token, currentUser, id, password = null) => {
    if (!id) {
      throw new Error('ID de la persona requerido para eliminación');
    }
    if (!token) {
      throw new Error('Token de autenticación requerido para eliminación');
    }
    const data = password ? { adminPassword: password } : null;
    return api.delete(`/persons/${id}`, data, token, currentUser);
  },
};

// Servicio de sucursales
export const branchService = {
  getAll: (token, currentUser) => {
    return api.get('/branches', token, currentUser);
  },
  getById: (token, currentUser, id) => api.get(`/branches/${id}`, token, currentUser),
  create: (token, currentUser, branchData) => {
    cache.delete('branches'); // Invalidate cache
    return api.post('/branches', branchData, token, currentUser);
  },
  update: (token, currentUser, id, branchData) => {
    cache.delete('branches'); // Invalidate cache
    return api.put(`/branches/${id}`, branchData, token, currentUser);
  },
  delete: (token, currentUser, id, password = null) => {
    if (!id) {
      throw new Error('ID de la sucursal requerido para eliminación');
    }
    if (!token) {
      throw new Error('Token de autenticación requerido para eliminación');
    }
    const data = password ? { adminPassword: password } : null;
    cache.delete('branches'); // Invalidate cache
    return api.delete(`/branches/${id}`, data, token, currentUser);
  },
};

// Servicio de ventas
export const saleService = {
  getAll: (token, currentUser, params = {}) => {
    const cacheKey = `sales_${JSON.stringify(params)}`;
    if (cache.has(cacheKey)) {
      return Promise.resolve(cache.get(cacheKey));
    }
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/sales${queryString ? `?${queryString}` : ''}`, token, currentUser).then(result => {
      cache.set(cacheKey, result);
      return result;
    });
  },
  getById: (token, currentUser, id) => api.get(`/sales/${id}`, token, currentUser),
  create: (token, currentUser, saleData) => {
    // Invalidate all sales caches
    cache.clear(); // Simple approach: clear all cache when sales change
    return api.post('/sales', saleData, token, currentUser);
  },
  // Ahora aceptamos un quinto parámetro opcional `adminPassword` que NO se persistirá en la venta.
  // Se incluirá en el body para que el backend pueda verificarlo y luego lo removerá antes de actualizar.
  update: (token, currentUser, id, saleData, adminPassword = null) => {
    const payload = adminPassword ? { ...saleData, adminPassword } : saleData;
    // Invalidate all sales caches
    cache.clear(); // Simple approach: clear all cache when sales change
    return api.put(`/sales/${id}`, payload, token, currentUser);
  },
  delete: (token, currentUser, id, password = null) => {
    if (!id) {
      throw new Error('ID de la venta requerido para eliminación');
    }
    if (!token) {
      throw new Error('Token de autenticación requerido para eliminación');
    }
    const data = password ? { adminPassword: password } : null;
    // Invalidate all sales caches
    cache.clear(); // Simple approach: clear all cache when sales change
    return api.delete(`/sales/${id}`, data, token, currentUser);
  },
};

// Servicio de compras
export const purchaseService = {
  getAll: (token, currentUser, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/purchases${queryString ? `?${queryString}` : ''}`, token, currentUser);
  },
  getById: (token, currentUser, id) => api.get(`/purchases/${id}`, token, currentUser),
  create: (token, currentUser, purchaseData) => api.post('/purchases', purchaseData, token, currentUser),
  update: (token, currentUser, id, purchaseData, adminPassword = null) => {
    const payload = adminPassword ? { ...purchaseData, adminPassword } : purchaseData;
    return api.put(`/purchases/${id}`, payload, token, currentUser);
  },
  delete: (token, currentUser, id, password = null) => {
    if (!id) {
      throw new Error('ID de la compra requerido para eliminación');
    }
    if (!token) {
      throw new Error('Token de autenticación requerido para eliminación');
    }
    const data = password ? { adminPassword: password } : null;
    return api.delete(`/purchases/${id}`, data, token, currentUser);
  },
  canDelete: (token, currentUser, id) => {
    if (!id) {
      throw new Error('ID de la compra requerido para verificar eliminación');
    }
    if (!token) {
      throw new Error('Token de autenticación requerido para verificar eliminación');
    }
    return api.get(`/purchases/${id}/can-delete`, token, currentUser);
  },
};

// Servicio de productos defectuosos
export const defectiveProductService = {
  getAll: (token, currentUser, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/defective-products${queryString ? `?${queryString}` : ''}`, token, currentUser);
  },
  getById: (token, currentUser, id) => api.get(`/defective-products/${id}`, token, currentUser),
  create: (token, currentUser, defectiveProductData) => api.post('/defective-products', defectiveProductData, token, currentUser),
  update: (token, currentUser, id, defectiveProductData) => api.put(`/defective-products/${id}`, defectiveProductData, token, currentUser),
  delete: (token, currentUser, id, password = null) => {
    if (!id) {
      throw new Error('ID del producto defectuoso requerido para eliminación');
    }
    if (!token) {
      throw new Error('Token de autenticación requerido para eliminación');
    }
    const data = password ? { adminPassword: password } : null;
    return api.delete(`/defective-products/${id}`, data, token, currentUser);
  },
};