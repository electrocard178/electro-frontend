import React, { useState, useEffect, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useDataContext } from './context/DataContext';
import LayoutHeader from './components/LayoutHeader';

// Lazy load components for better performance
///
////////

const DashboardHome = React.lazy(() => import('./components/DashboardHome'));
const PersonList = React.lazy(() => import('./components/PersonList'));
const PersonForm = React.lazy(() => import('./components/PersonForm'));
const ProductList = React.lazy(() => import('./components/ProductList'));
const ProductForm = React.lazy(() => import('./components/ProductForm'));
const SalesModule = React.lazy(() => import('./components/SalesModule'));
const PurchasesModule = React.lazy(() => import('./components/PurchasesModule'));
const ReportsModule = React.lazy(() => import('./components/ReportsModule'));
const ProfitModule = React.lazy(() => import('./components/ProfitModule'));
const LoginScreen = React.lazy(() => import('./components/LoginScreen'));
const DefectiveProductsModule = React.lazy(() => import('./components/DefectiveProductsModule'));
const UserList = React.lazy(() => import('./components/UserList'));
const UserForm = React.lazy(() => import('./components/UserForm'));
const BranchList = React.lazy(() => import('./components/BranchList'));
const BranchForm = React.lazy(() => import('./components/BranchForm'));
const TestConnection = React.lazy(() => import('./components/TestConnection'));

// Importar servicios de API
import {
  userService,
  productService,
  personService,
  saleService,
  purchaseService,
  branchService,
  defectiveProductService
} from './services/apiService';

const AppContent = () => {
  const { isLoggedIn, currentUser, token, login, logout } = useAuth();
  const { refresh, refreshAll } = useDataContext();
  const [currentPage, setCurrentPage] = useState('login');
  const [branches, setBranches] = useState([]);
  const [editingBranch, setEditingBranch] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('');

  // Estados para datos de la API
  const [persons, setPersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [defectiveProducts, setDefectiveProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);





  // Removida validateAndFixUserState - no aplicable sin localStorage

  // Función para cargar todos los datos desde la API
  const loadDataFromAPI = async (branchIdOverride = null, tokenParam) => {
    let effectiveToken = tokenParam;
    if (effectiveToken === undefined) {
      effectiveToken = token;
    }
    if (!effectiveToken) {
      console.log('❌ No hay token disponible para cargar datos de la API');
      return;
    }

    // Log detallado para debugging en producción
    console.log('🔍 DEBUG loadDataFromAPI - Token length:', effectiveToken ? effectiveToken.length : 'null');
    console.log('🔍 DEBUG - API_BASE_URL:', process.env.REACT_APP_API_URL || 'FALLBACK a localhost');
    console.log('🔍 DEBUG - Usuario:', currentUser);
    console.log('🔍 DEBUG - Is production:', process.env.REACT_APP_ENVIRONMENT === 'production');

    // Evitar múltiples llamadas simultáneas
    if (loading) {
      console.log('⚠️ Ya hay una carga en progreso, omitiendo...');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Cargando datos desde la API con token:', effectiveToken ? 'disponible' : 'ausente');

      // Usar branchIdOverride si se proporciona, de lo contrario usar selectedBranch SOLO para admins
      let currentBranchId = null;
      if (currentUser?.role === 'admin') {
        // Solo usar selectedBranch si branchIdOverride es undefined (no si es null o '')
        currentBranchId = branchIdOverride !== undefined ? branchIdOverride : selectedBranch;
      } else if (currentUser?.role === 'cashier' && currentUser.branchId) {
        // Para cajeros, usar su branchId asignada
        currentBranchId = branchIdOverride || currentUser.branchId;
      }

      // Preparar parámetros de filtrado por sucursal si hay una sucursal
      // Solo incluir branchId en los parámetros si es un valor no vacío
      const branchParams = currentBranchId ? { branchId: currentBranchId } : {};

      console.log('🏢 Parámetros de sucursal:', branchParams);
      console.log('👤 Usuario actual:', currentUser);
      console.log('🏪 Sucursal usada:', currentBranchId);
      console.log('🔄 BranchId override:', branchIdOverride);
      if (currentUser && currentUser.role === 'admin') {
        console.log('👑 Admin: Cargando datos filtrados por sucursal seleccionada');
      } else if (currentUser && currentUser.role === 'cashier') {
        console.log('👨‍💼 Cajero: Cargando datos filtrados por sucursal asignada');
      }

      // Cargar datos de forma individual para manejar errores de permisos
      const loadPromises = [
        personService.getAll(effectiveToken, currentUser, branchParams).catch(err => {
          console.error('❌ Error detallado cargando personas:', err.message, err.stack || err);
          return [];
        }),
        productService.getAll(effectiveToken, currentUser, branchParams).catch(err => {
          console.error('❌ Error detallado cargando productos:', err.message, err.stack || err);
          return [];
        }),
        saleService.getAll(effectiveToken, currentUser, branchParams).catch(err => {
          console.error('❌ Error detallado cargando ventas:', err.message, err.stack || err);
          return [];
        }),
        purchaseService.getAll(effectiveToken, currentUser, branchParams).catch(err => {
          console.warn('⚠️ Error cargando compras (posible falta de permisos):', err.message);
          return []; // Cajeros no pueden ver compras, devolver array vacío
        }),
        defectiveProductService.getAll(effectiveToken, currentUser, branchParams).catch(err => {
          console.error('❌ Error detallado cargando productos defectuosos:', err.message, err.stack || err);
          return [];
        }),
        userService.getAll(effectiveToken, currentUser).catch(err => {
          console.error('❌ Error detallado cargando usuarios:', err.message, err.stack || err);
          return [];
        }),
        branchService.getAll(effectiveToken, currentUser).catch(err => {
          console.error('❌ Error detallado cargando sucursales:', err.message, err.stack || err);
          return [];
        })
      ];

      const [
        personsData,
        productsData,
        salesData,
        purchasesData,
        defectiveProductsData,
        usersData,
        branchesData
      ] = await Promise.all(loadPromises);

      console.log('✅ Datos recibidos de la API:');
      console.log('  - Personas:', personsData?.length || 0);
      console.log('  - Productos:', productsData?.length || 0);
      console.log('  - Ventas:', salesData?.length || 0);
      console.log('  - Compras:', purchasesData?.length || 0);
      console.log('  - Usuarios:', usersData?.length || 0);
      console.log('  - Sucursales:', branchesData?.length || 0);

      // Actualizar datos preservando las ventas existentes para evitar pérdida
      setPersons(Array.isArray(personsData) ? personsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setDefectiveProducts(Array.isArray(defectiveProductsData) ? defectiveProductsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);

      // Para ventas, reemplazar completamente con los datos de la API
      // ya que las ventas pueden ser eliminadas y no deben fusionarse
      if (Array.isArray(salesData)) {
        setSales(salesData);
      } else {
        setSales([]);
      }

      // Verificar automáticamente si hay usuarios disponibles (sin mostrar en consola por seguridad)
      if (Array.isArray(usersData) && usersData.length > 0) {
        console.log(`✅ ${usersData.length} usuarios encontrados en el sistema`);
      }

      // Log final de éxito o advertencia si datos son 0 en producción
      const isProd = process.env.REACT_APP_ENVIRONMENT === 'production';
      if (isProd && (productsData?.length || 0) === 0) {
        console.warn('🚨 EN PRODUCCIÓN: No se cargaron productos. Verifica env vars y backend.');
      }
    } catch (error) {
      console.error('❌ Error general cargando datos:', error);
      console.error('❌ Stack trace:', error.stack);
      setError('Error cargando datos desde el servidor: ' + error.message);
      // No limpiar todos los datos, solo los que fallaron
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos desde la API cuando el usuario se loguea
  useEffect(() => {
    if (isLoggedIn && currentUser && token) {
      loadDataFromAPI();
    }
  }, [isLoggedIn, currentUser, token]);

  // Función de auto-reparación simplificada (solo verificar conexión)
  const autoRepairSystem = async () => {
    console.log('🔧 Verificando conexión al backend...');

    try {
      // Verificar conexión con backend
      const usersResponse = await userService.getAll(token, currentUser);
      const dbUsers = usersResponse || [];

      console.log('✅ Backend conectado - Usuarios encontrados:', dbUsers.length);

      // Verificar usuarios disponibles (sin mostrar detalles por seguridad)
      if (dbUsers.length > 0) {
        console.log(`✅ ${dbUsers.length} usuarios encontrados en el sistema`);
      }

      console.log('✅ Sistema funcionando correctamente');

    } catch (error) {
      console.error('❌ Error conectando a backend:', error);
      console.log('💡 Verifica que el backend esté ejecutándose en puerto 5001');
    }
  };

  // Ejecutar auto-reparación al cargar la aplicación
  useEffect(() => {
    autoRepairSystem();
  }, []);

  // Función para recuperar el estado del usuario desde el backend (solo para casos especiales)
  // Removida: No persistencia local

  // Inicialización simplificada sin localStorage

  // Debug: Verificar estado de datos
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      console.log('=== ESTADO DE DATOS EN APP ===');
      console.log('Productos:', products.length);
      console.log('Clientes:', persons.length);
      console.log('Ventas:', sales.length);
      console.log('Sucursales:', branches.length);
      console.log('Usuarios:', users.length);
    }
  }, [products, persons, sales, branches, users, isLoggedIn, currentUser]);


  // No guardar en localStorage - estado en memoria

  // No guardar branches en localStorage - siempre fetch

  // Control de acceso basado en roles
  const checkAccess = (page) => {
    if (!currentUser) return false;

    // El administrador tiene acceso a todas las páginas
    if (currentUser.role === 'admin') return true;

    // El cajero solo tiene acceso a ciertas páginas
    if (currentUser.role === 'cashier') {
      const allowedPages = ['dashboard', 'persons', 'products', 'sales', 'reports', 'defective'];
      return allowedPages.includes(page);
    }

    return false;
  };

  // Redirigir si el usuario no tiene acceso a la página actual
  useEffect(() => {
    if (isLoggedIn && currentUser && !checkAccess(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [isLoggedIn, currentUser, currentPage]);




  // Estados para edición de formularios
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Persistir el estado de los módulos de ventas y compras
  const [salesModuleState, setSalesModuleState] = useState({
    selectedPerson: '',
    selectedProduct: '',
    quantity: 1,
    priceOverride: '',
    paymentMethod: 'efectivo',
    saleDetails: [],
    amountReceived: '',
  });




  const handleSaveBranch = async (branch) => {
    try {
      let savedBranch;
      if (branch._id) {
        // Editar sucursal
        const id = branch._id;
        const response = await branchService.update(token, currentUser, id, branch);
        savedBranch = response.branch;
        setBranches(prevBranches =>
          prevBranches.map(b => (b._id === id ? savedBranch : b))
        );
      } else {
        // Crear sucursal
        const response = await branchService.create(token, currentUser, branch);
        savedBranch = response.branch;
        setBranches(prevBranches => [...prevBranches, savedBranch]);
      }

      // Actualizar la asignación de sucursal en los usuarios
      if (branch.assignedCashiers) {
        // Primero, remover branchId de usuarios que ya no están asignados a esta sucursal
        setUsers(prevUsers =>
          prevUsers.map(user => {
            // Si el usuario estaba en esta sucursal pero ya no está en assignedCashiers
            if (user.branchId === savedBranch._id && !branch.assignedCashiers.includes(user._id)) {
              return { ...user, branchId: null };
            }
            // Si el usuario está en assignedCashiers, asignarle esta sucursal
            if (branch.assignedCashiers.includes(user._id)) {
              return { ...user, branchId: savedBranch._id };
            }
            return user;
          })
        );

        // También actualizar en la base de datos
        try {
          await Promise.all([
            // Remover branchId de usuarios que ya no están asignados
            ...users
              .filter(user => user.branchId === savedBranch._id && !branch.assignedCashiers.includes(user._id))
              .map(user => userService.update(user._id, { branchId: null })),
            // Asignar branchId a usuarios que están en assignedCashiers
            ...branch.assignedCashiers.map(userId =>
              userService.update(userId, { branchId: savedBranch._id })
            )
          ]);
        } catch (error) {
          console.error('Error actualizando usuarios en la base de datos:', error);
        }
      }

      setEditingBranch(null);
      setCurrentPage('branches');

      // Mostrar mensaje de éxito
      const action = branch._id ? 'actualizada' : 'creada';
      alert(`Sucursal ${action} exitosamente`);

    } catch (error) {
      console.error('Error guardando sucursal:', error);
      alert('Error guardando sucursal: ' + (error.message || error));
    }
  };

  const handleDeleteBranch = async (id, password = null) => {
    // Validación para prevenir llamadas inválidas
    if (!id) {
      console.error('❌ ID de sucursal inválido:', id);
      alert('Error: ID de la sucursal no válido. Intenta recargar la página.');
      return;
    }
    if (!token) {
      console.error('❌ Token no disponible para eliminación');
      alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
      logout();
      return;
    }
    console.log('🗑️ Eliminando sucursal - ID:', id, 'Token presente:', !!token);

    // Verificar si hay usuarios asociados a esta sucursal
    const usersInBranch = users.filter(u => u.branchId === id);
    if (usersInBranch.length > 0) {
      alert('No se puede eliminar esta sucursal porque hay usuarios asociados a ella.');
      return;
    }

    try {
      // Eliminar de la base de datos
      await branchService.delete(token, currentUser, id, password);

      // Eliminar del estado local
      setBranches(branches.filter(b => b._id !== id));

      alert('Sucursal eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminando sucursal:', error);
      if (error.message.includes('Token')) {
        alert('Sesión expirada. Inicia sesión nuevamente.');
        logout();
      } else {
        alert('Error eliminando sucursal: ' + (error.message || 'Inténtalo de nuevo'));
      }
      // Re-lanzar para que el llamador sepa que no hubo éxito
      throw error;
    }
  };

  const [purchasesModuleState, setPurchasesModuleState] = useState({
    selectedPerson: '',
    selectedProduct: '',
    quantity: 1,
    priceOverride: '',
    purchaseDetails: [],
  });

  const handleLogin = async (loginData) => {
    try {
      console.log('🔍 DEBUG handleLogin - loginData recibido:', loginData);
      console.log('🔍 DEBUG - Tipo de loginData:', typeof loginData);
      console.log('🔍 DEBUG - loginData keys:', loginData ? Object.keys(loginData) : 'null');

      const { token, user } = loginData;
      console.log('🔍 DEBUG - token extraído:', token, 'Tipo:', typeof token, 'Longitud:', token ? token.length : 'N/A');
      console.log('🔍 DEBUG - user extraído:', user);

      if (typeof token !== 'string' || !token.trim()) {
        console.error('❌ ERROR: Token no es string válido en handleLogin');
        throw new Error('Token inválido recibido del login');
      }

      console.log('✅ Login exitoso - Usuario validado por backend:', user.name);
      console.log('✅ Usuario completo:', JSON.stringify(user, null, 2));

      // Establecer estado de login vía Context
      login(token, user);

      console.log('✅ Usuario logueado completamente:', user.name);
      console.log('🔍 DEBUG post-setToken - Token en state debería ser string');

      console.log('🎉 Login completado exitosamente - Datos se cargarán vía useEffect');

      // Mostrar mensaje
      setTimeout(() => {
        alert(`🎉 ¡Login exitoso!\n\n` +
          `👤 Usuario: ${user.name}\n` +
          `🔐 Rol: ${user.role === 'admin' ? 'Administrador' : 'Cajero'}\n` +
          `🌐 Datos cargados desde servidor (no local).`);
      }, 1000);

    } catch (error) {
      console.error('❌ Error en handleLogin:', error);
      console.error('❌ Stack:', error.stack);
      alert('Error al procesar el login: ' + error.message);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Cerrando sesión...');

    // Limpiar estado vía Context
    logout();

    // Limpiar datos de la aplicación (en memoria)
    setPersons([]);
    setProducts([]);
    setSales([]);
    setPurchases([]);
    setDefectiveProducts([]);
    setUsers([]);
    setBranches([]);

    setCurrentPage('login');

    console.log('✅ Sesión cerrada completamente - Todo en memoria');
  };

  const handleSavePerson = async (person) => {
    try {
      if (person._id) {
        const response = await personService.update(token, currentUser, person._id, person);
        setPersons(persons.map(p => (p._id === person._id ? response.person : p)));
      } else {
        const response = await personService.create(token, currentUser, person);
        setPersons([...persons, response.person]);
      }
      setEditingPerson(null);
      setCurrentPage('persons');
    } catch (error) {
      console.error('Error guardando persona:', error);
      alert(`Error guardando persona: ${error.message}`);
    }
  };

  const handleDeletePerson = async (id, password = null) => {
    if (!id) {
      alert('Error: ID de la persona no válido. Intenta recargar la página.');
      return;
    }
    if (!token) {
      alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
      logout();
      return;
    }
    try {
      const response = await personService.delete(token, currentUser, id, password);
      setPersons(prev => prev.filter(p => p._id !== id));
      alert(response?.message || 'Persona eliminada exitosamente.');
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Error eliminando persona';
      alert(message);
      if (message.toLowerCase().includes('token')) logout();
      // Re-lanzar para que el componente llamante lo maneje si es necesario
      throw error;
    }
  };

  const handleSaveProduct = async (product) => {
    try {
      console.log('🔍 Guardando producto:', product);

      if (product._id) {
        console.log('🔍 Actualizando producto existente...');
        const response = await productService.update(token, currentUser, product._id, product);
        setProducts(products.map(p => (p._id === product._id ? response.product : p)));
      } else {
        console.log('🔍 Creando nuevo producto...');
        const response = await productService.create(token, currentUser, product);
        setProducts([...products, response.product]);
      }
      refresh('products'); // Invalidar caché
      setEditingProduct(null);
      setCurrentPage('products');
    } catch (error) {
      console.error('❌ Error guardando producto:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Stack trace:', error.stack);

      // Mostrar mensaje de error más específico
      let errorMessage = 'Error guardando producto';

      if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'No se pudo conectar al servidor. Verifica que el backend esté ejecutándose.';
      }

      alert(errorMessage);
    }
  };

  const handleDeleteProduct = async (id, password = null) => {
    // DEBUG: Log detallado para diagnosticar ID
    console.log('🔍 DEBUG handleDeleteProduct - ID recibido:', id, 'typeof:', typeof id, 'es truthy:', !!id, 'password:', !!password);
    console.log('🔍 DEBUG - Ejemplo de productos:', products.slice(0, 1)); // Primer producto para ver estructura

    // Validación para prevenir llamadas inválidas
    if (!id) {
      console.error('❌ ID de producto inválido:', id);
      alert('Error: ID del producto no válido. Intenta recargar la página.');
      return;
    }
    if (!token) {
      console.error('❌ Token no disponible para eliminación');
      alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
      logout();
      return;
    }
    console.log('🗑️ Eliminando producto - ID:', id, 'Token presente:', !!token);

    try {
      await productService.delete(token, currentUser, id, password);
      setProducts(products.filter(p => p._id !== id));
      refresh('products'); // Invalidar caché
    } catch (error) {
      console.error('Error eliminando producto:', error);
      if (error.message.includes('Token')) {
        alert('Sesión expirada. Inicia sesión nuevamente.');
        logout();
      } else {
        alert('Error eliminando producto: ' + (error.message || 'Inténtalo de nuevo'));
      }
      // Re-lanzar el error para que el componente llamante (modal) lo capture
      throw error;
    }
  };

  const handleSaveUser = async (user) => {
    try {
      console.log('🔍 Guardando usuario:', user);

      if (user._id) {
        console.log('🔍 Actualizando usuario existente...');
        const response = await userService.update(token, currentUser, user._id, user);
        setUsers(users.map(u => (u._id === user._id ? response.user : u)));
      } else {
        console.log('🔍 Creando nuevo usuario...');
        const response = await userService.create(token, currentUser, user);
        setUsers([...users, response.user]);
      }
      setEditingUser(null);
      setCurrentPage('users');
    } catch (error) {
      console.error('❌ Error guardando usuario:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Stack trace:', error.stack);

      // Mostrar mensaje de error más específico
      let errorMessage = 'Error guardando usuario';

      if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'No se pudo conectar al servidor. Verifica que el backend esté ejecutándose.';
      }

      alert(errorMessage);
    }
  };

  const handleDeleteUser = async (id, password = null) => {
    // Validación para prevenir llamadas inválidas
    if (!id) {
      console.error('❌ ID de usuario inválido:', id);
      alert('Error: ID del usuario no válido. Intenta recargar la página.');
      return;
    }
    if (!token) {
      console.error('❌ Token no disponible para eliminación');
      alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
      logout();
      return;
    }
    console.log('🗑️ Eliminando usuario - ID:', id, 'Token presente:', !!token);

    try {
      // Evitar eliminar al usuario actual
      if (currentUser && currentUser._id === id) {
        alert('No puedes eliminar tu propio usuario mientras estás conectado.');
        return;
      }

      await userService.delete(token, currentUser, id, password);
      setUsers(users.filter(u => u._id !== id));
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      if (error.message.includes('Token')) {
        alert('Sesión expirada. Inicia sesión nuevamente.');
        logout();
      } else {
        alert('Error eliminando usuario: ' + (error.message || 'Inténtalo de nuevo'));
      }
      // Re-lanzar para que el componente llamante pueda manejarlo correctamente
      throw error;
    }
  };

  const handleAddSale = async (sale, branchId, saleDetails) => {
    try {
      console.log('🛒 INICIANDO VENTA - Estado actual:');
      console.log('   - currentUser:', currentUser);
      console.log('   - currentUser?._id:', currentUser?._id);
      console.log('   - isLoggedIn:', isLoggedIn);

      // VALIDACIÓN CRÍTICA: Verificar que el usuario esté logueado
      // El backend puede devolver 'id' o '_id', verificar ambas
      const userId = currentUser?._id || currentUser?.id;
      if (!currentUser || !userId) {
        console.error('❌ Usuario no logueado o sin ID');
        console.error('❌ Estado completo:', { currentUser, isLoggedIn });
        console.error('❌ currentUser._id:', currentUser?._id);
        console.error('❌ currentUser.id:', currentUser?.id);
        return { success: false, error: 'Usuario no logueado. Por favor, inicia sesión nuevamente.' };
      }

      // Crear venta con datos garantizados del usuario actual
      const newSale = {
        personId: sale.personId,
        cashierId: userId, // Usar la variable userId que maneja tanto _id como id
        branchId: branchId || currentUser.branchId,
        date: sale.date || new Date().toISOString(),
        details: sale.details || saleDetails,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        amountReceived: sale.amountReceived,
        change: sale.change,
        userId: userId, // Usar la variable userId que maneja tanto _id como id
        // Información adicional para debugging
        userInfo: {
          id: userId,
          name: currentUser.name,
          username: currentUser.username,
          role: currentUser.role
        }
      };

      console.log('📤 Creando venta con usuario actual:', {
        userId: newSale.userId,
        cashierId: newSale.cashierId,
        currentUser: currentUser.name,
        userIdType: currentUser._id ? '_id' : 'id',
        total: newSale.total
      });

      const response = await saleService.create(token, currentUser, newSale);

      // Agregar la nueva venta al estado local inmediatamente
      setSales(prevSales => [...prevSales, response.sale]);

      // Invalidar caché de ventas y productos (por el stock)
      refresh('sales');
      refresh('products');

      // NO recargar todos los datos - el caché se encargará de actualizar cuando sea necesario

      console.log('✅ Venta agregada exitosamente:', {
        nuevaVenta: response.sale._id,
        totalVentas: sales.length + 1
      });

      return { success: true, sale: response.sale, message: 'Venta guardada exitosamente!' };

    } catch (error) {
      console.error('❌ Error en handleAddSale:', error);

      let errorMessage = 'Error guardando venta';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  };

  const handleDeleteSale = async (id, password = null) => {
    // Validación para prevenir llamadas inválidas
    if (!id) {
      console.error('❌ ID de venta inválido:', id);
      alert('Error: ID de la venta no válido. Intenta recargar la página.');
      return;
    }
    if (!token) {
      console.error('❌ Token no disponible para eliminación');
      alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
      logout();
      return;
    }

    try {
      await saleService.delete(token, currentUser, id, password);
      setSales(sales.filter(s => s._id !== id));

      // Invalidar caché de ventas y productos (por el stock)
      refresh('sales');
      refresh('products');

      // NO recargar todos los datos - el caché se encargará
    } catch (error) {
      console.error('Error eliminando venta:', error);
      if (error.message.includes('Token')) {
        alert('Sesión expirada. Inicia sesión nuevamente.');
        logout();
      } else {
        alert('Error eliminando venta: ' + (error.message || 'Inténtalo de nuevo'));
      }
      // Re-lanzar para que el modal detecte el fallo y no muestre éxito
      throw error;
    }
  };

  const handleEditSale = async (updatedSale, adminPassword = null) => {
    try {
      // Pasar adminPassword opcional a la llamada al servicio para que el backend lo valide
      const response = await saleService.update(token, currentUser, updatedSale._id, updatedSale, adminPassword);
      // El backend responde con { message, sale }
      const updated = response?.sale || response;
      setSales(prev => prev.map(sale => (sale._id === updatedSale._id ? updated : sale)));
    } catch (error) {
      console.error('Error actualizando venta:', error);
      alert('Error actualizando venta: ' + (error.response?.data?.message || error.message || 'Error desconocido'));
      throw error;
    }
  };

  const handleAddPurchase = async (purchase) => {
    try {
      const newPurchase = {
        ...purchase,
        branchId: purchase.branchId || currentUser?.branchId
      };

      const response = await purchaseService.create(token, currentUser, newPurchase);
      setPurchases([...purchases, response.purchase]);

      // Invalidar caché de compras y productos (por el stock)
      refresh('purchases');
      refresh('products');

      // NO recargar todos los datos - el caché se encargará
      alert('Compra guardada exitosamente!');
    } catch (error) {
      console.error('Error guardando compra:', error);
      let errorMessage = 'Error guardando compra';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage += `: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      alert(errorMessage);
    }
  };

  const handleEditPurchase = async (updatedPurchase, adminPassword = null) => {
    try {
      const response = await purchaseService.update(token, currentUser, updatedPurchase._id, updatedPurchase, adminPassword);
      setPurchases(purchases.map(purchase =>
        purchase._id === updatedPurchase._id ? response.purchase : purchase
      ));

      // Invalidar caché de compras y productos
      refresh('purchases');
      refresh('products');

      // NO recargar todos los datos - el caché se encargará
    } catch (error) {
      console.error('Error actualizando compra:', error);
      alert('Error actualizando compra');
    }
  };

  const handleDeletePurchase = async (purchaseId, password = null) => {
    // Validación para prevenir llamadas inválidas
    if (!purchaseId) {
      console.error('❌ ID de compra inválido:', purchaseId);
      alert('Error: ID de la compra no válido. Intenta recargar la página.');
      return;
    }
    if (!token) {
      console.error('❌ Token no disponible para eliminación');
      alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
      logout();
      return;
    }
    console.log('🗑️ Eliminando compra - ID:', purchaseId, 'Token presente:', !!token, 'Password provided:', !!password);

    try {
      // Encontrar la compra a eliminar para revertir el stock
      const purchaseToDelete = purchases.find(p => p._id === purchaseId);

      if (purchaseToDelete && purchaseToDelete.branchId && purchaseToDelete.details) {
        // Revertir el stock de productos comprados
        setProducts(products.map(product => {
          const boughtItem = purchaseToDelete.details.find(item => item._id === product._id);
          if (boughtItem && product.stockBySucursal && product.stockBySucursal[purchaseToDelete.branchId] !== undefined) {
            const newStockBySucursal = { ...product.stockBySucursal };
            newStockBySucursal[purchaseToDelete.branchId] = Math.max(0, (newStockBySucursal[purchaseToDelete.branchId] || 0) - boughtItem.quantity);

            // Calcular nuevo stock total
            const newTotalStock = Object.values(newStockBySucursal).reduce((sum, stock) => sum + stock, 0);

            return {
              ...product,
              stock: newTotalStock,
              stockBySucursal: newStockBySucursal
            };
          }
          return product;
        }));
      }

      await purchaseService.delete(token, currentUser, purchaseId, password);
      setPurchases(purchases.filter(p => p._id !== purchaseId));
      // Recargar todos los datos para asegurar la consistencia del stock
      await loadDataFromAPI();
      alert('Compra eliminada exitosamente!');
    } catch (error) {
      console.error('Error eliminando compra:', error);

      // Manejar diferentes tipos de errores
      if (error?.response?.status === 401) {
        const errorData = error?.response?.data;
        if (errorData?.errorType === 'TOKEN_EXPIRED' || errorData?.errorType === 'NO_TOKEN') {
          alert('Sesión expirada. Inicia sesión nuevamente.');
          logout();
        } else {
          // Para otros errores 401, usar el mensaje del backend
          alert(errorData?.message || 'Error de autenticación. Verifica la contraseña.');
        }
      } else if (error.message.includes('Token')) {
        alert('Sesión expirada. Inicia sesión nuevamente.');
        logout();
      } else {
        let errorMessage = 'Error eliminando compra';
        if (error.response && error.response.data && error.response.data.message) {
          errorMessage += `: ${error.response.data.message}`;
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }
        alert(errorMessage);
      }
      // Re-lanzar para que el componente llamante no asuma éxito
      throw error;
    }
  };

  const handleDeleteDefectiveProduct = async (id, password = null) => {
    // Validación para prevenir llamadas inválidas
    if (!id) {
      console.error('❌ ID de producto defectuoso inválido:', id);
      alert('Error: ID del producto defectuoso no válido. Intenta recargar la página.');
      return;
    }
    if (!token) {
      console.error('❌ Token no disponible para eliminación');
      alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
      logout();
      return;
    }
    console.log('🗑️ Eliminando producto defectuoso - ID:', id, 'Token presente:', !!token);

    try {
      await defectiveProductService.delete(token, currentUser, id, password);
      setDefectiveProducts(defectiveProducts.filter(dp => dp._id !== id));
      await loadDataFromAPI();
    } catch (error) {
      console.error('Error eliminando producto defectuoso:', error);

      // Manejar diferentes tipos de errores
      if (error?.response?.status === 401) {
        const errorData = error?.response?.data;
        if (errorData?.errorType === 'TOKEN_EXPIRED' || errorData?.errorType === 'NO_TOKEN') {
          alert('Sesión expirada. Inicia sesión nuevamente.');
          logout();
        } else {
          // Para otros errores 401, usar el mensaje del backend
          alert(errorData?.message || 'Error de autenticación. Verifica la contraseña.');
        }
      } else if (error.message.includes('Token')) {
        alert('Sesión expirada. Inicia sesión nuevamente.');
        logout();
      } else {
        alert('Error eliminando producto defectuoso: ' + (error.message || 'Inténtalo de nuevo'));
      }
      // Re-lanzar para que el componente que abrió el modal lo capture
      throw error;
    }
  };

  const handleAddDefectiveProduct = async (defectiveProduct) => {
    try {
      console.log('📦 Enviando producto defectuoso al backend:', defectiveProduct);
      console.log('👤 Estado del usuario actual:', {
        currentUser: currentUser,
        isLoggedIn: isLoggedIn,
        userId: currentUser?._id || currentUser?.id,
        userName: currentUser?.name,
        branchId: currentUser?.branchId,
        selectedBranch: selectedBranch
      });

      // Verificación CRÍTICA: Asegurar que el usuario esté completamente logueado
      if (!isLoggedIn) {
        alert('Error: No estás logueado. Por favor, inicia sesión nuevamente.');
        return;
      }

      if (!currentUser) {
        alert('Error: Información del usuario no disponible. Por favor, refresca la página e inicia sesión nuevamente.');
        return;
      }

      // Verificar tanto _id como id
      const userId = currentUser._id || currentUser.id;
      if (!userId) {
        console.error('❌ ID de usuario no disponible:', {
          currentUser: currentUser,
          hasId: !!currentUser._id,
          hasIdAlt: !!currentUser.id,
          userId: userId
        });
        alert('Error: ID de usuario no disponible. Por favor, refresca la página e inicia sesión nuevamente.');
        return;
      }

      // Validación de sucursal por rol
      let effectiveBranchId;
      if (currentUser.role === 'admin') {
        if (!selectedBranch) {
          alert('Como administrador, debes seleccionar una sucursal en el header antes de registrar un producto defectuoso.');
          return;
        }
        effectiveBranchId = selectedBranch;
      } else if (currentUser.role === 'cashier') {
        if (!currentUser.branchId) {
          alert('Error: No tienes una sucursal asignada. Contacta al administrador.');
          return;
        }
        effectiveBranchId = currentUser.branchId;
      } else {
        alert('Rol de usuario no autorizado para registrar productos defectuosos.');
        return;
      }

      // Verificar que los datos básicos del producto defectuoso estén completos
      if (!defectiveProduct.productId || !defectiveProduct.supplierId) {
        console.error('❌ Datos del producto defectuoso incompletos:', defectiveProduct);
        alert('Error: Datos del producto defectuoso incompletos. Por favor, intenta nuevamente.');
        return;
      }

      if (!defectiveProduct.quantity || defectiveProduct.quantity <= 0) {
        console.error('❌ Cantidad inválida:', defectiveProduct.quantity);
        alert('Error: La cantidad debe ser mayor a 0.');
        return;
      }

      if (!defectiveProduct.description || defectiveProduct.description.trim() === '') {
        console.error('❌ Descripción vacía:', defectiveProduct.description);
        alert('Error: La descripción del defecto es requerida.');
        return;
      }

      console.log('✅ Todas las validaciones pasaron, enviando al backend con branchId:', effectiveBranchId);

      // Agregar branchId al defectiveProduct si no está presente
      const defectiveWithBranch = {
        ...defectiveProduct,
        branchId: effectiveBranchId
      };

      const response = await defectiveProductService.create(token, currentUser, defectiveWithBranch);
      console.log('✅ Producto defectuoso guardado exitosamente:', response.defectiveProduct);

      // Actualizar el estado local
      setDefectiveProducts(prevDefectiveProducts => [...prevDefectiveProducts, response.defectiveProduct]);
      // Recargar datos para reflejar el stock actualizado en Productos y Valor Total
      await loadDataFromAPI();

      alert('Producto defectuoso registrado exitosamente en la base de datos!');
    } catch (error) {
      console.error('❌ Error guardando producto defectuoso:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Manejo de errores más específico
      let errorMessage = 'Error guardando producto defectuoso';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.details) {
        errorMessage += `: ${error.response.data.details}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      // Mensajes específicos para errores comunes
      if (errorMessage.includes('sucursal') || errorMessage.includes('branchId')) {
        errorMessage = 'Error: La sucursal seleccionada no es válida o no tienes permisos.';
      } else if (errorMessage.includes('producto') || errorMessage.includes('productId')) {
        errorMessage = 'Error: El producto seleccionado no es válido.';
      } else if (errorMessage.includes('proveedor') || errorMessage.includes('supplierId')) {
        errorMessage = 'Error: El proveedor seleccionado no pertenece a la sucursal especificada.';
      } else if (errorMessage.includes('autenticación') || errorMessage.includes('token')) {
        errorMessage = 'Error de sesión: Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error interno del servidor. Por favor, intenta nuevamente en unos momentos.';
      }

      alert(errorMessage);
    }
  };


  const handleNavigate = (page) => {
    if (checkAccess(page)) {
      console.log(`🧭 Navegando a: ${page}`);
      setCurrentPage(page);

      // No guardar en local - en memoria

      // Recargar datos cuando se va a páginas que los necesitan
      if (isLoggedIn && currentUser && ['sales', 'purchases', 'reports', 'products', 'persons', 'defective'].includes(page)) {
        console.log(`🔄 Recargando datos para la página: ${page}`);
        loadDataFromAPI();
      }
    } else {
      alert('No tienes permisos para acceder a esta sección.');
    }
  };

  // Función para recargar datos manualmente
  const handleReloadData = () => {
    console.log('🔄 Recargando datos manualmente...');
    loadDataFromAPI();
  };

  // Función para manejar cambio de sucursal seleccionada
  const handleBranchChange = async (branchId) => {
    console.log('🏢 Cambiando a sucursal:', branchId || 'Todas');
    setSelectedBranch(branchId);

    // Invalidar caché para forzar recarga con nueva sucursal
    // Esto es MUCHO más rápido que loadDataFromAPI porque usa caché si existe
    if (currentUser && currentUser.role === 'admin') {
      console.log('🔄 Invalidando caché para cambio de sucursal');

      // Invalidar caché de todas las entidades que dependen de sucursal
      refresh('products');
      refresh('persons');
      refresh('sales');
      refresh('purchases');
      refresh('defectiveProducts');

      console.log('✅ Caché invalidado - los datos se recargarán automáticamente al acceder');
    }
  };

  // Función específica para recargar productos defectuosos
  const handleReloadDefectiveProducts = async () => {
    try {
      console.log('🔄 Recargando productos defectuosos...');
      const defectiveProductsData = await defectiveProductService.getAll();
      setDefectiveProducts(Array.isArray(defectiveProductsData) ? defectiveProductsData : []);
      console.log('✅ Productos defectuosos recargados:', defectiveProductsData?.length || 0);
    } catch (error) {
      console.error('❌ Error recargando productos defectuosos:', error);
    }
  };

  // Función de diagnóstico para verificar el estado del usuario
  const diagnoseUserState = () => {
    console.log('🔍 === DIAGNÓSTICO DE ESTADO DEL USUARIO ===');
    console.log('📊 Estado de login:', {
      isLoggedIn: isLoggedIn,
      currentUser: currentUser,
      userId: currentUser?._id,
      userName: currentUser?.name,
      userRole: currentUser?.role,
      branchId: currentUser?.branchId
    });

    console.log('💾 Estado en localStorage:', {
      savedUser: localStorage.getItem('currentUser'),
      savedLogin: localStorage.getItem('isLoggedIn'),
      savedToken: localStorage.getItem('token') ? 'Presente' : 'Ausente'
    });

    // Verificar si el usuario puede hacer operaciones
    const canCreateDefective = isLoggedIn && currentUser && currentUser._id && currentUser.branchId;
    console.log('✅ Puede crear productos defectuosos:', canCreateDefective);

    if (!canCreateDefective) {
      console.log('❌ Problemas detectados:');
      if (!isLoggedIn) console.log('  - No está logueado');
      if (!currentUser) console.log('  - currentUser es null');
      if (!currentUser?._id) console.log('  - currentUser._id es undefined');
      if (!currentUser?.branchId) console.log('  - currentUser.branchId es undefined');
    }

    return {
      isLoggedIn,
      hasUser: !!currentUser,
      hasUserId: !!currentUser?._id,
      hasBranchId: !!currentUser?.branchId,
      canCreateDefective
    };
  };

  // Función de diagnóstico completa para verificar persistencia de sesión
  const diagnoseSessionPersistence = () => {
    console.log('🔍 === DIAGNÓSTICO DE PERSISTENCIA DE SESIÓN ===');

    const savedUser = localStorage.getItem('currentUser');
    const savedLogin = localStorage.getItem('isLoggedIn');
    const savedPage = localStorage.getItem('currentPage');

    console.log('💾 Estado en localStorage:');
    console.log('   - currentUser:', savedUser ? '✅ Presente' : '❌ Ausente');
    console.log('   - isLoggedIn:', savedLogin);
    console.log('   - currentPage:', savedPage);

    console.log('📊 Estado en React:');
    console.log('   - isLoggedIn:', isLoggedIn);
    console.log('   - currentUser:', currentUser ? `✅ ${currentUser.name}` : '❌ null');
    console.log('   - currentPage:', currentPage);

    const sessionValid = isLoggedIn && currentUser && savedUser && savedLogin === 'true';
    console.log('🎯 Estado de sesión:', sessionValid ? '✅ VÁLIDA' : '❌ INVÁLIDA');

    if (sessionValid) {
      console.log('✅ La persistencia de sesión está funcionando correctamente');
      console.log('💡 F5 NUNCA te sacará - Solo "Cerrar Sesión" termina la sesión');
      console.log('🛡️ El sistema es tolerante a errores de conexión');
    } else {
      console.log('❌ Hay problemas con la persistencia de sesión');
    }

    return {
      sessionValid,
      localStorage: { savedUser: !!savedUser, savedLogin, savedPage },
      reactState: { isLoggedIn, hasUser: !!currentUser, currentPage }
    };
  };

  // Removidas funciones de diagnóstico localStorage - no aplican

  const renderPage = () => {
    const LoadingFallback = () => (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );

    if (!isLoggedIn) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <LoginScreen onLogin={handleLogin} users={users} branches={branches} />
        </Suspense>
      );
    }

    // Verificar acceso a la página actual
    if (!checkAccess(currentPage)) {
      // Redirigir a una página permitida si la actual no está permitida
      return (
        <Suspense fallback={<LoadingFallback />}>
          <DashboardHome
            onNavigate={handleNavigate}
            currentUser={currentUser}
            sales={sales}
            purchases={purchases}
            users={users}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
          switch (currentPage) {
            case 'dashboard':
              return <DashboardHome onNavigate={handleNavigate} />;
            case 'persons':
              return editingPerson ? (
                <PersonForm person={editingPerson} onSave={handleSavePerson} onCancel={() => setEditingPerson(null)} branches={branches} currentUser={currentUser} />
              ) : (
                <PersonList
                  persons={persons}
                  onEdit={setEditingPerson}
                  onDelete={handleDeletePerson}
                  onAdd={() => setEditingPerson({})}
                  branches={branches}
                  currentUser={currentUser}
                  selectedBranch={currentUser?.role === 'admin' ? selectedBranch : null}
                />
              );
            case 'products':
              return editingProduct ? (
                <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={() => setEditingProduct(null)} branches={branches} currentUser={currentUser} />
              ) : (
                <ProductList
                  products={products}
                  onEdit={setEditingProduct}
                  onDelete={handleDeleteProduct}
                  onAdd={() => setEditingProduct({})}
                  branches={branches}
                  currentUser={currentUser}
                  selectedBranch={currentUser?.role === 'admin' ? selectedBranch : null}
                />
              );
            case 'sales':
              return (
                <SalesModule
                  persons={persons}
                  products={products}
                  onAddSale={handleAddSale}
                  onEditSale={handleEditSale}
                  onDeleteSale={handleDeleteSale}
                  sales={sales}
                  moduleState={salesModuleState}
                  setModuleState={setSalesModuleState}
                  branches={branches}
                  currentUser={currentUser}
                  users={users}
                  onReloadData={handleReloadData}
                  selectedBranch={currentUser?.role === 'admin' ? selectedBranch : null}
                />
              );
            case 'purchases':
              return (
                <PurchasesModule
                  persons={persons}
                  products={products}
                  onAddPurchase={handleAddPurchase}
                  onEditPurchase={handleEditPurchase}
                  onDeletePurchase={handleDeletePurchase}
                  purchases={purchases}
                  moduleState={purchasesModuleState}
                  setModuleState={setPurchasesModuleState}
                  currentUser={currentUser}
                  users={users}
                  branches={branches}
                  selectedBranch={selectedBranch}
                />
              );
            case 'reports':
              return <ReportsModule sales={sales} purchases={purchases} persons={persons} products={products} branches={branches} users={users} currentUser={currentUser} selectedBranch={currentUser?.role === 'admin' ? selectedBranch : null} />;
            case 'profit':
              return <ProfitModule
                sales={sales}
                purchases={purchases}
                products={products}
                defectiveProducts={defectiveProducts}
                branches={branches}
                currentUser={currentUser}
                selectedBranch={currentUser?.role === 'admin' ? selectedBranch : null}
              />;
            case 'defective':
              console.log('🔍 App.js - Pasando currentUser a DefectiveProductsModule:', {
                currentUser: currentUser,
                hasCurrentUser: !!currentUser,
                hasId: !!(currentUser && currentUser._id),
                hasIdAlt: !!(currentUser && currentUser.id),
                userId: currentUser?._id || currentUser?.id,
                userName: currentUser?.name,
                userRole: currentUser?.role,
                branchId: currentUser?.branchId
              });

              return <DefectiveProductsModule
                products={products}
                persons={persons}
                users={users}
                branches={branches}
                selectedBranch={selectedBranch}
                onAddDefectiveProduct={handleAddDefectiveProduct}
                onReloadDefectiveProducts={handleReloadDefectiveProducts}
                onDeleteDefectiveProduct={handleDeleteDefectiveProduct}
                currentUser={currentUser}
              />;
            case 'users':
              return editingUser ? (
                <UserForm
                  user={editingUser}
                  onSave={handleSaveUser}
                  onCancel={() => setEditingUser(null)}
                  branches={branches}
                />
              ) : (
                <UserList
                  users={users}
                  onEdit={setEditingUser}
                  onDelete={handleDeleteUser}
                  onAdd={() => setEditingUser({})}
                  branches={branches}
                />
              );
            case 'branches':
              return editingBranch ? (
                <BranchForm branch={editingBranch} onSave={handleSaveBranch} onCancel={() => setEditingBranch(null)} users={users} />
              ) : (
                <BranchList
                  branches={branches}
                  onEdit={setEditingBranch}
                  onDelete={handleDeleteBranch}
                  onAdd={() => setEditingBranch({})}
                  users={users}
                />
              );
            case 'test-connection':
              return <TestConnection />;
            default:
              return <DashboardHome onNavigate={handleNavigate} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {isLoggedIn && (
        <LayoutHeader
          currentPage={currentPage}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onLogout={handleLogout}
          branches={branches}
          selectedBranch={selectedBranch}
          onBranchChange={handleBranchChange}
        />
      )}
      <main className="flex-grow p-6">
        {renderPage()}
      </main>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <DataProvider>
      <AppContent />
    </DataProvider>
  </AuthProvider>
);

export default App;
