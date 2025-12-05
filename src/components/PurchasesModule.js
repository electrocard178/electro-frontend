import React, { useState, useMemo, useEffect } from 'react';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { purchaseService, authService } from '../services/apiService';

const PurchasesModule = ({ persons, products, onAddPurchase, onEditPurchase, onDeletePurchase, purchases, moduleState, setModuleState, currentUser, users = [], branches = [], selectedBranch }) => {
  const { token } = useAuth();

  console.log('🔍 DEBUG PurchasesModule - Token disponible:', token ? 'Sí' : 'No');
  console.log('🔍 DEBUG PurchasesModule - Token longitud:', token ? token.length : 0);
  const { selectedPerson, selectedProduct, quantity, priceOverride, purchaseDetails } = moduleState;

  // Estados para el modal de contraseña de admin / usuario
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para proteger la edición de compras con contraseña de administrador
  const [showAdminPasswordModalForEdit, setShowAdminPasswordModalForEdit] = useState(false);
  const [adminPasswordForEdit, setAdminPasswordForEdit] = useState('');
  const [pendingEditPurchase, setPendingEditPurchase] = useState(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [verifiedAdminPassword, setVerifiedAdminPassword] = useState(null);

  // Estado para indicar si se está confirmando una compra
  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);

  // Debug: información del usuario y productos
  console.log('🔍 PurchasesModule - Información de debug:', {
    userRole: currentUser?.role,
    userBranchId: currentUser?.branchId,
    userName: currentUser?.name,
    productsCount: products?.length || 0,
    personsCount: persons?.length || 0,
    productsSample: products?.slice(0, 3).map(p => ({ name: p.name, branchId: p.branchId })) || []
  });

  // Validar que los datos sean arrays
  if (!Array.isArray(persons) || !Array.isArray(products) || !Array.isArray(purchases)) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-7xl mx-auto my-8">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Cargando datos de compras...</p>
        </div>
      </div>
    );
  }

  // Definir variables auxiliares antes del useMemo
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Filtrar productos por sucursal para cajeros (igual que en SalesModule)
  const filteredProducts = useMemo(() => {
    console.log('PurchasesModule: Filtrando productos - total:', products?.length || 0);
    if (!Array.isArray(products)) {
      console.log('PurchasesModule: products no es array:', products);
      return [];
    }

    let result = products;

    // Para cajeros: filtrar productos que pertenezcan a su sucursal
    if (!isAdmin && currentUser && currentUser.branchId) {
      console.log('PurchasesModule: Filtrando para cajero - branchId:', currentUser.branchId);
      result = result.filter(product => {
        const productBranchId = product.branchId;
        console.log('PurchasesModule: Producto', product.name, '- BranchId:', productBranchId);
        return productBranchId === currentUser.branchId;
      });
      console.log('PurchasesModule: Productos después de filtro cajero:', result.length);
    } else if (isAdmin && selectedBranch) {
      console.log('PurchasesModule: Filtrando para admin - selectedBranch:', selectedBranch);
      result = result.filter(product => {
        const productBranchId = product.branchId;
        console.log('PurchasesModule: Producto', product.name, '- BranchId:', productBranchId);
        return productBranchId === selectedBranch;
      });
      console.log('PurchasesModule: Productos después de filtro admin:', result.length);
    }

    return result;
  }, [products, currentUser, isAdmin, selectedBranch]);

  // Filtrar proveedores por sucursal para cajeros
  const filteredPersons = useMemo(() => {
    console.log('PurchasesModule: Filtrando proveedores - total:', persons?.length || 0);
    if (!Array.isArray(persons)) {
      console.log('PurchasesModule: persons no es array:', persons);
      return [];
    }

    let result = persons;

    // Para cajeros: filtrar proveedores que pertenezcan a su sucursal
    if (!isAdmin && currentUser && currentUser.branchId) {
      console.log('PurchasesModule: Filtrando proveedores para cajero - branchId:', currentUser.branchId);
      result = result.filter(person => {
        const personBranchIds = person.branchIds || [];
        console.log('PurchasesModule: Proveedor', person.name, '- BranchIds:', personBranchIds);
        return personBranchIds.includes(currentUser.branchId);
      });
      console.log('PurchasesModule: Proveedores después de filtro cajero:', result.length);
    } else if (isAdmin && selectedBranch) {
      console.log('PurchasesModule: Filtrando proveedores para admin - selectedBranch:', selectedBranch);
      result = result.filter(person => {
        const personBranchIds = person.branchIds || [];
        console.log('PurchasesModule: Proveedor', person.name, '- BranchIds:', personBranchIds);
        return personBranchIds.includes(selectedBranch);
      });
      console.log('PurchasesModule: Proveedores después de filtro admin:', result.length);
    }

    return result;
  }, [persons, currentUser, isAdmin, selectedBranch]);

  // Filtrar compras por sucursal del usuario actual (manejo robusto de branchId poblado o string)
  const filteredPurchases = useMemo(() => {
    console.log('PurchasesModule: Filtrando historial de compras - total:', purchases?.length || 0);
    if (!Array.isArray(purchases)) {
      console.log('PurchasesModule: purchases no es array:', purchases);
      return [];
    }

    const normalizeBranchId = (b) => {
      if (!b) return null;
      if (typeof b === 'object') return b._id || b.id || null;
      return b;
    };

    let filtered = [];

    if (currentUser?.role === 'admin') {
      if (selectedBranch) {
        console.log('PurchasesModule: Admin - filtrando por selectedBranch:', selectedBranch);
        filtered = purchases.filter(purchase => {
          const purchaseBranchId = normalizeBranchId(purchase.branchId);
          console.log('PurchasesModule: Compra', purchase._id, '- BranchId(normalized):', purchaseBranchId);
          return String(purchaseBranchId) === String(selectedBranch);
        });
        console.log('PurchasesModule: Compras después de filtro admin:', filtered.length);
      } else {
        console.log('PurchasesModule: Admin - mostrando todas las compras');
        filtered = purchases;
      }
    } else if (currentUser?.role === 'cashier' && currentUser?.branchId) {
      console.log('PurchasesModule: Filtrando compras para cajero - branchId:', currentUser.branchId);
      filtered = purchases.filter(purchase => {
        const purchaseBranchId = normalizeBranchId(purchase.branchId);
        console.log('PurchasesModule: Compra', purchase._id, '- BranchId(normalized):', purchaseBranchId);
        return String(purchaseBranchId) === String(currentUser.branchId);
      });
      console.log('PurchasesModule: Compras después de filtro cajero:', filtered.length);
    } else {
      console.log('PurchasesModule: Usuario sin rol definido o sin sucursal');
      filtered = [];
    }

    // El backend ya ordena las compras por fecha descendente, no reordenar aquí

    return filtered;
  }, [purchases, currentUser, selectedBranch]);

  // Paginación para el historial
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Mostrar 10 compras por página

  // Función para obtener compras paginadas
  const getPaginatedPurchases = () => {
    const filtered = filteredPurchases;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  // Debug: mostrar resultado del filtrado
  console.log('📊 Resultado del filtrado:', {
    totalProducts: products.length,
    filteredProducts: filteredProducts.length,
    totalPersons: persons.length,
    filteredPersons: filteredPersons.length,
    totalPurchases: purchases.length,
    filteredPurchases: filteredPurchases.length,
    userRole: currentUser?.role,
    userBranchId: currentUser?.branchId
  });

  // Helper para extraer ID cuando el campo viene poblado como objeto o como string
  const getIdFromPopulatedField = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object') return field._id || field.id || null;
    return String(field);
  };

  const getPersonName = (personId) => {
    if (!personId) return 'Sin proveedor';

    // Si viene poblado como objeto con nombre
    if (typeof personId === 'object' && personId.name) {
      return personId.name;
    }

    const pid = getIdFromPopulatedField(personId);
    const person = filteredPersons.find(p => (p._id === pid || p.id === pid));
    return person ? person.name : 'Proveedor no encontrado';
  };

  const formatGuarani = (amount) => {
    return `₲ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (d) => {
    if (!d) return '';

    try {
      // Si es string en formato YYYY-MM-DD
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        // Formatear directamente sin conversión de zona horaria
        const [year, month, day] = d.split('-');
        return `${day}/${month}/${year}`;
      }

      // Si es string con formato ISO
      if (typeof d === 'string' && d.includes('T')) {
        const dateObj = new Date(d);
        return dateObj.toLocaleDateString('es-PY', {
          timeZone: 'America/Asuncion',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }

      // Si es Date object
      if (d instanceof Date) {
        return d.toLocaleDateString('es-PY', {
          timeZone: 'America/Asuncion',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }

      // Para cualquier otro caso, convertir a string
      return String(d);
    } catch (error) {
      console.error('Error formateando fecha:', error, 'Valor:', d);
      return String(d);
    }
  };

  const handleProductSelect = (e) => {
    const productId = e.target.value;
    const product = filteredProducts.find(p => (p._id === productId));
    setModuleState(prev => ({
      ...prev,
      selectedProduct: productId,
      priceOverride: product ? (product.purchasePrice || '') : '', // Prefill con precio de compra si existe
    }));
  };

  const handleAddProductToPurchase = () => {
    const product = filteredProducts.find(p => (p._id === selectedProduct));
    const finalPrice = priceOverride !== '' ? parseFloat(priceOverride) : (product ? product.price : 0);

    if (!product) {
      alert('Selecciona un producto válido.');
      return;
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) {
      alert('La cantidad debe ser mayor a 0.');
      return;
    }
    if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
      alert('El precio debe ser mayor a 0.');
      return;
    }
    // Si todo es válido, agregar al carrito
    if (product && quantity > 0 && finalPrice > 0) {
      const existingItemIndex = purchaseDetails.findIndex(item => item._id === product._id);
      if (existingItemIndex > -1) {
        const updatedDetails = [...purchaseDetails];
        const existingItem = updatedDetails[existingItemIndex];
        updatedDetails[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
          subtotal: finalPrice * (existingItem.quantity + quantity),
        };
        setModuleState(prev => ({ ...prev, purchaseDetails: updatedDetails }));
      } else {
        setModuleState(prev => ({
          ...prev,
          purchaseDetails: [...prev.purchaseDetails, { ...product, quantity, price: finalPrice, subtotal: finalPrice * quantity }],
        }));
      }
      setModuleState(prev => ({ ...prev, selectedProduct: '', quantity: 1, priceOverride: '' }));
    } else {
      alert('Cantidad o precio inválido.');
    }
  };

  const handleRemoveProductFromPurchase = (productId) => {
    setModuleState(prev => {
      // Crear copia defensiva del arreglo de detalles
      const updatedDetails = prev.purchaseDetails.map(d => ({ ...d }));
      const idx = updatedDetails.findIndex(detail => detail._id === productId);
      if (idx === -1) {
        // No está en el carrito; no hacer nada
        return { ...prev };
      }
      const item = updatedDetails[idx];
      const currentQty = Number(item.quantity ?? 0);
      const newQty = currentQty - 1;
      if (newQty > 0) {
        // Reducir cantidad y actualizar subtotal
        updatedDetails[idx] = {
          ...item,
          quantity: newQty,
          subtotal: Number((item.price * newQty).toFixed(2))
        };
        return { ...prev, purchaseDetails: updatedDetails };
      } else {
        // Si la cantidad llega a 0, eliminar la línea
        const filtered = updatedDetails.filter((_, i) => i !== idx);
        return { ...prev, purchaseDetails: filtered };
      }
    });
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPerson || purchaseDetails.length === 0) {
      alert('Por favor, selecciona un proveedor y agrega al menos un producto.');
      return;
    }

    // Validar que el admin haya seleccionado una sucursal
    if (currentUser?.role === 'admin' && !selectedBranch) {
      alert('Por favor, selecciona una sucursal para la compra.');
      return;
    }

    setIsConfirmingPurchase(true);

    try {
      const total = purchaseDetails.reduce((sum, item) => sum + item.subtotal, 0);

      // Determinar la sucursal y el cajero para la compra usando el currentUser recibido como prop
      // (NO usar localStorage aquí; confiar en el currentUser que pasó App.js)
      let branchId = null;
      let cashierId = null;
      if (currentUser) {
        cashierId = currentUser._id || currentUser.id || null;
        if (currentUser.role === 'admin') {
          // Para admin, usar la sucursal seleccionada por el administrador o tomar la sucursal del primer producto si existe
          branchId = selectedBranch || (purchaseDetails.length > 0 ? purchaseDetails[0].branchId : null);
        } else if (currentUser.role === 'cashier') {
          branchId = currentUser.branchId;
        }
      }

      // Mapear los detalles para enviar productId, name, quantity, price, subtotal
      const details = purchaseDetails.map(item => ({
        productId: item._id || item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));

      // Obtener fecha y hora actual para mantener el orden correcto
      const now = new Date();

      await onAddPurchase({
        personId: selectedPerson,
        cashierId: cashierId,
        branchId: branchId,
        date: now.toISOString(), // Enviar fecha completa con hora
        details,
        total,
        userId: cashierId
      });

      // Limpiar el estado del módulo después de la confirmación
      setModuleState({
        selectedPerson: '',
        selectedProduct: '',
        quantity: 1,
        priceOverride: '',
        purchaseDetails: [],
      });
    } catch (error) {
      console.error('Error al confirmar compra:', error);
      alert('Error al confirmar la compra. Inténtalo de nuevo.');
    } finally {
      setIsConfirmingPurchase(false);
    }
  };

  const handleClearPurchase = () => {
    setModuleState({
      selectedPerson: '',
      selectedProduct: '',
      quantity: 1,
      priceOverride: '',
      purchaseDetails: [],
    });
    // Limpiar estado de edición
    setEditingPurchase(null);
    setIsEditing(false);
  };

  const handleEditPurchase = (purchase) => {
    // Solicitar primero la contraseña del administrador
    setPendingEditPurchase(purchase);
    setShowAdminPasswordModalForEdit(true);
  };

  const handleDeletePurchase = async (purchaseId) => {
    console.log('🔍 DEBUG handleDeletePurchase - Token del contexto:', token ? 'Presente' : 'Ausente');
    console.log('🔍 DEBUG handleDeletePurchase - Token longitud:', token ? token.length : 0);
    console.log('🔍 DEBUG handleDeletePurchase - currentUser:', currentUser);
    console.log('🔍 DEBUG handleDeletePurchase - purchaseId:', purchaseId);

    try {
      // Primero verificar si se puede eliminar la compra
      const canDeleteResponse = await purchaseService.canDelete(token, currentUser, purchaseId);

      if (!canDeleteResponse.canDelete) {
        alert(canDeleteResponse.message || 'No se puede eliminar esta compra.');
        return;
      }

      // Si se puede eliminar, pedir confirmación
      if (window.confirm('¿Estás seguro de que quieres eliminar esta compra?')) {
        setPendingDeleteId(purchaseId);
        setShowAdminPasswordModal(true);
      }
    } catch (error) {
      console.error('Error verificando si se puede eliminar compra:', error);

      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al verificar si se puede eliminar la compra. Inténtalo de nuevo.';

      if (error?.status === 401 || error?.response?.status === 401) {
        // Verificar si es un error de token expirado o falta de autenticación
        const errorData = error?.response?.data;
        if (errorData?.errorType === 'TOKEN_EXPIRED' || errorData?.errorType === 'NO_TOKEN') {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          // Opcionalmente, redirigir al login o recargar la página
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          // Para otros errores 401, usar el mensaje del backend
          errorMessage = errorData?.message || 'Error de autenticación. Por favor, inicia sesión nuevamente.';
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    }
  };

  const handleConfirmDeleteWithPassword = async () => {
    if (!adminPassword.trim()) {
      alert('Por favor, ingresa la contraseña del administrador.');
      return;
    }

    if (!pendingDeleteId) {
      alert('ID de compra inválido. Recarga la página e inténtalo de nuevo.');
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      setPendingDeleteId(null);
      return;
    }

    setIsDeleting(true);
    try {
      // Llamar al handler pasado desde App.js con la contraseña
      await onDeletePurchase(pendingDeleteId, adminPassword);
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      setPendingDeleteId(null);
      alert('Compra eliminada exitosamente.');
    } catch (error) {
      console.error('Error eliminando compra:', error);

      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al eliminar la compra.';

      if (error?.status === 401 || error?.response?.status === 401) {
        // Verificar si es un error de token expirado o falta de autenticación
        const errorData = error?.response?.data;
        if (errorData?.errorType === 'TOKEN_EXPIRED' || errorData?.errorType === 'NO_TOKEN') {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          // Opcionalmente, redirigir al login o recargar la página
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          // Para otros errores 401, usar el mensaje del backend
          errorMessage = errorData?.message || 'Error de autenticación. Verifica la contraseña.';
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 403) {
        errorMessage = 'No tienes permisos para eliminar esta compra.';
      } else if (error?.response?.status === 400) {
        errorMessage = 'No se puede eliminar esta compra. Verifica que no tenga ventas asociadas.';
      }

      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowAdminPasswordModal(false);
    setAdminPassword('');
    setPendingDeleteId(null);
  };

  // Confirmar contraseña de admin para iniciar edición
  const handleConfirmEditWithPassword = async () => {
    if (!adminPasswordForEdit || !adminPasswordForEdit.trim()) {
      alert('Por favor, ingresa la contraseña del administrador.');
      return;
    }

    setIsVerifyingPassword(true);
    try {
      const data = await authService.verifyAdminPassword(token, currentUser, adminPasswordForEdit);

      if (data && data.success) {
        const purchase = pendingEditPurchase;
        setEditingPurchase(purchase);
        setIsEditing(true);

        // Guardar la contraseña verificada temporalmente para usarla al enviar la actualización
        setVerifiedAdminPassword(adminPasswordForEdit);

        // Cargar datos de la compra en el formulario
        setModuleState({
          selectedPerson: purchase.personId,
          selectedProduct: '',
          quantity: 1,
          priceOverride: '',
          purchaseDetails: purchase.details,
        });

        setShowAdminPasswordModalForEdit(false);
        setAdminPasswordForEdit('');
        setPendingEditPurchase(null);
      } else {
        const msg = data?.message || 'Contraseña de administrador inválida';
        alert(msg);
      }
    } catch (err) {
      console.error('Error validando contraseña de admin:', err);
      const errMsg = err?.message || err?.response?.data?.message || 'Error verificando la contraseña. Intenta nuevamente.';
      alert(errMsg);
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleCancelEditPassword = () => {
    setShowAdminPasswordModalForEdit(false);
    setAdminPasswordForEdit('');
    setPendingEditPurchase(null);
  };

  const handleUpdatePurchase = () => {
    if (!selectedPerson || purchaseDetails.length === 0) {
      alert('Por favor, selecciona un proveedor y agrega al menos un producto.');
      return;
    }

    const total = purchaseDetails.reduce((sum, item) => sum + item.subtotal, 0);

    const updatedPurchase = {
      ...editingPurchase,
      personId: selectedPerson,
      details: purchaseDetails,
      total,
      branchId: currentUser?.role === 'admin' ? selectedBranch : editingPurchase.branchId,
    };

    onEditPurchase(updatedPurchase, verifiedAdminPassword);

    // Limpiar contraseña verificada tras usarla
    setVerifiedAdminPassword(null);

    // Limpiar estado
    setModuleState({
      selectedPerson: '',
      selectedProduct: '',
      quantity: 1,
      priceOverride: '',
      purchaseDetails: [],
    });
    setEditingPurchase(null);
    setIsEditing(false);
    alert('Compra actualizada con éxito!');
  };

  const handleCancelEdit = () => {
    setEditingPurchase(null);
    setIsEditing(false);
    setModuleState({
      selectedPerson: '',
      selectedProduct: '',
      quantity: 1,
      priceOverride: '',
      purchaseDetails: [],
    });
  };

  const totalPurchaseAmount = purchaseDetails.reduce((sum, item) => sum + item.subtotal, 0);

  // Estado local para el historial
  const [showHistory, setShowHistory] = useState(true);

  // Estado para edición
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch]);

  return (
    <div
      className="h-full flex flex-col relative p-4"
      style={{
        backgroundImage: 'url(/fondo.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>

      <div className="relative bg-white bg-opacity-95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl max-w-4xl mx-auto z-10 h-full overflow-auto w-full">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">
          Módulo de Compras
          {isEditing && (
            <span className="block text-2xl text-blue-600 mt-2">
              ✏️ Editando Compra: {editingPurchase?.id}
            </span>
          )}
        </h2>

        {/* Mostrar información de la sucursal actual o seleccionada */}
        {currentUser && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-lg font-semibold text-blue-800">
              {currentUser.role === 'admin' && selectedBranch ? (
                <>Sucursal seleccionada: {(() => {
                  const sel = branches.find(b => b._id === selectedBranch);
                  return sel ? sel.name : selectedBranch;
                })()}</>
              ) : currentUser.branchId ? (
                <>Sucursal actual: {(() => {
                  const userBranch = branches.find(b => b._id === currentUser.branchId);
                  return userBranch ? userBranch.name : currentUser.branchId;
                })()}</>
              ) : (
                'Sucursal no asignada'
              )}
            </p>
            <p className="text-sm text-blue-600">
              {currentUser.role === 'admin' && selectedBranch
                ? 'Se muestran productos y proveedores disponibles en la sucursal seleccionada'
                : 'Solo se muestran productos y proveedores disponibles en esta sucursal'
              }
            </p>
          </div>
        )}

        {/* Mensaje informativo para cajeros */}
        {!isAdmin && currentUser && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <h3 className="text-lg font-semibold text-orange-800 mb-3">
              🛒 Compras Registradas
            </h3>
            <div className="text-sm text-orange-700">
              Solo se muestran proveedores y productos asignados a tu sucursal: <strong>{(() => {
                const userBranch = branches.find(b => b._id === currentUser.branchId);
                return userBranch ? userBranch.name : currentUser.branchId;
              })()}</strong>
            </div>
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label htmlFor="person" className="block text-gray-700 text-lg font-medium mb-2">
              Proveedor:
            </label>
            <select
              id="person"
              value={selectedPerson}
              onChange={(e) => setModuleState(prev => ({ ...prev, selectedPerson: e.target.value }))}
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200 text-lg bg-white"
            >
              <option value="">Selecciona un proveedor</option>
              {filteredPersons.filter(p => p.type === 'proveedor').map(person => (
                <option key={person._id} value={person._id}>{person.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="product" className="block text-gray-700 text-lg font-medium mb-2">
              Producto:
            </label>
            <select
              id="product"
              value={selectedProduct}
              onChange={handleProductSelect}
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200 text-lg bg-white"
            >
              <option value="">Selecciona un producto</option>
              {filteredProducts.map(product => (
                <option key={product._id} value={product._id}>{product.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quantity" className="block text-gray-700 text-lg font-medium mb-2">
              Cantidad:
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setModuleState(prev => ({ ...prev, quantity: parseInt(e.target.value, 10) }))}
              min="1"
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200 text-lg"
            />
          </div>
          <div className="flex items-end">
            <label htmlFor="priceOverride" className="block text-gray-700 text-lg font-medium mb-2">
              Precio de Compra (₲):
            </label>
            <input
              type="number"
              id="priceOverride"
              value={priceOverride}
              onChange={(e) => setModuleState(prev => ({ ...prev, priceOverride: e.target.value }))}
              step="0.01"
              placeholder="Ingresa el precio de compra"
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200 text-lg"
            />
            <p className="text-sm text-gray-500 mt-1">
              💰 {priceOverride ? 'Precio editable' : 'Precio sugerido del producto (editable)'}
            </p>
          </div>
          <div className="flex items-end space-x-4">
            <button
              onClick={handleAddProductToPurchase}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Agregar al Carrito
            </button>
            <button
              onClick={handleClearPurchase}
              className="w-full px-6 py-3 bg-gray-400 text-white font-semibold rounded-xl shadow-md hover:bg-gray-500 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Limpiar
            </button>
          </div>
        </div>

        {purchaseDetails.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Detalle de la Compra Actual:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl overflow-hidden">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="py-3 px-5 text-left text-md font-semibold text-gray-700">Producto</th>
                    <th className="py-3 px-5 text-left text-md font-semibold text-gray-700">Precio de Compra</th>
                    <th className="py-3 px-5 text-left text-md font-semibold text-gray-700">Cantidad</th>
                    <th className="py-3 px-5 text-left text-md font-semibold text-gray-700">Subtotal</th>
                    <th className="py-3 px-5 text-center text-md font-semibold text-gray-700">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseDetails.map(item => (
                    <tr key={item._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-3 px-5 text-md text-gray-800">{item.name}</td>
                      <td className="py-3 px-5 text-md text-gray-800">{formatGuarani(item.price)}</td>
                      <td className="py-3 px-5 text-md text-gray-800">{item.quantity}</td>
                      <td className="py-3 px-5 text-md text-gray-800">{formatGuarani(item.subtotal)}</td>
                      <td className="py-3 px-5 flex justify-center">
                        <button
                          onClick={() => handleRemoveProductFromPurchase(item._id)}
                          className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-110"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-2xl font-bold text-gray-900 mt-6">
              Total: {formatGuarani(totalPurchaseAmount)}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          {!isConfirmingPurchase && (
            <button
              onClick={isEditing ? handleUpdatePurchase : handleConfirmPurchase}
              className={`flex-1 px-8 py-4 text-white text-xl font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${isEditing
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                }`}
            >
              {isEditing ? 'Actualizar Compra' : 'Confirmar Compra'}
            </button>
          )}
          {isConfirmingPurchase && (
            <div className="flex-1 px-8 py-4 bg-red-600 text-white text-xl font-semibold rounded-xl shadow-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              Procesando Compra...
            </div>
          )}

          {isEditing && (
            <button
              onClick={handleCancelEdit}
              className="px-8 py-4 bg-gray-500 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
            >
              Cancelar Edición
            </button>
          )}
        </div>

        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-3xl font-bold text-gray-800">Historial de Compras</h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showHistory ? 'Minimizar' : 'Maximizar'}
            </button>
          </div>
          {showHistory && (
            (() => {
              const historyPurchases = getPaginatedPurchases();
              const totalFilteredPurchases = filteredPurchases.length;

              return totalFilteredPurchases === 0 ? (
                <p className="text-center text-gray-600 text-xl py-10">No hay compras registradas aún.</p>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-xl overflow-hidden">
                      <thead className="bg-gray-100 border-b-2 border-gray-200">
                        <tr>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">ID Compra</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Proveedor</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Fecha</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Total</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Productos</th>
                          <th className="py-4 px-6 text-center text-lg font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyPurchases.map((purchase) => (
                          <tr key={purchase._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                            <td className="py-4 px-6 text-lg text-gray-800">{purchase._id}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{getPersonName(purchase.personId)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{formatDate(purchase.date)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{formatGuarani(purchase.total)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">
                              <ul className="list-disc list-inside">
                                {purchase.details.map((detail, idx) => (
                                  <li key={idx}>
                                    {detail.name} ({detail.quantity}) — {formatGuarani(detail.price)}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleEditPurchase(purchase)}
                                  className="p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-all duration-200 transform hover:scale-110"
                                  title="Editar compra"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeletePurchase(purchase._id)}
                                  className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-110"
                                  title="Eliminar compra"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Controles de paginación */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex justify-center items-center space-x-4">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Anterior
                      </button>

                      <div className="flex space-x-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Mostrar páginas cercanas a la actual
                            const diff = Math.abs(page - currentPage);
                            return diff <= 2 || page === 1 || page === totalPages;
                          })
                          .map((page, index, array) => {
                            // Agregar "..." si hay saltos
                            const prevPage = array[index - 1];
                            if (prevPage && page - prevPage > 1) {
                              return (
                                <React.Fragment key={`ellipsis-${page}`}>
                                  <span className="px-2 py-2 text-gray-500">...</span>
                                  <button
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-2 rounded-lg transition-colors ${currentPage === page
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                  >
                                    {page}
                                  </button>
                                </React.Fragment>
                              );
                            }
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded-lg transition-colors ${currentPage === page
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}

                  {/* Información de paginación */}
                  <div className="mt-4 text-center text-sm text-gray-600">
                    Mostrando {historyPurchases.length} de {totalFilteredPurchases} compras
                    {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Modal de contraseña de administrador (Eliminar Compra) */}
        {showAdminPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Confirmar Eliminación
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Para eliminar esta compra, ingresa la contraseña del administrador:
              </p>
              <div className="mb-6">
                <label htmlFor="adminPassword" className="block text-gray-700 text-sm font-medium mb-2">
                  Contraseña del Administrador:
                </label>
                <input
                  type="password"
                  id="adminPassword"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-200"
                  placeholder="Ingresa la contraseña..."
                  disabled={isDeleting}
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-3 bg-gray-400 text-white font-semibold rounded-xl shadow-md hover:bg-gray-500 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteWithPassword}
                  disabled={isDeleting || !adminPassword.trim()}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-md hover:bg-red-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Eliminando...
                    </>
                  ) : (
                    'Eliminar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de contraseña de administrador (Editar Compra) */}
        {showAdminPasswordModalForEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Autorizar Edición
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Para editar esta compra, ingresa la contraseña del administrador:
              </p>
              <div className="mb-6">
                <label htmlFor="adminPasswordForEdit" className="block text-gray-700 text-sm font-medium mb-2">
                  Contraseña del Administrador:
                </label>
                <input
                  type="password"
                  id="adminPasswordForEdit"
                  value={adminPasswordForEdit}
                  onChange={(e) => setAdminPasswordForEdit(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                  placeholder="Ingresa la contraseña..."
                  disabled={isVerifyingPassword}
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleCancelEditPassword}
                  disabled={isVerifyingPassword}
                  className="flex-1 px-6 py-3 bg-gray-400 text-white font-semibold rounded-xl shadow-md hover:bg-gray-500 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmEditWithPassword}
                  disabled={isVerifyingPassword || !adminPasswordForEdit.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isVerifyingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verificando...
                    </>
                  ) : (
                    'Validar y Editar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

  );
};


export default PurchasesModule;