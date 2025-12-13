import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Select from 'react-select';
import SaleTicketModal from './SaleTicketModal';
import api from '../config/api';

const SalesModule = ({ persons, products, onAddSale, onEditSale, onDeleteSale, sales, moduleState, setModuleState, branches = [], currentUser = null, users = [], onReloadData, selectedBranch }) => {
  const { selectedPerson = '', selectedProduct = '', quantity = 1, priceOverride = '', paymentMethod = 'efectivo', saleDetails = [], amountReceived = '', cashAmount = '', cardAmount = '' } = moduleState || {};

  // Validar currentUser
  if (!currentUser) {
    console.error('❌ SalesModule: currentUser es null - No se puede proceder');
    return <div className="bg-red-50 p-8 rounded-3xl text-center">Error: Usuario no autenticado. Por favor, inicia sesión nuevamente.</div>;
  }

  const userRole = currentUser.role;
  const userBranchId = currentUser.branchId || currentUser._id?.branchId; // Fallback por si acaso

  // Validar que los datos sean arrays
  if (!Array.isArray(persons) || !Array.isArray(products) || !Array.isArray(sales)) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-7xl mx-auto my-8">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Cargando datos de ventas...</p>
        </div>
      </div>
    );
  }

  // Filtrar personas según el rol del usuario y sucursal (manejo robusto de branchIds)
  const filteredPersons = (() => {
    const termIsAdmin = userRole === 'admin';
    const branchToUse = termIsAdmin ? selectedBranch : userBranchId;

    return persons.filter(person => {
      // Solo trabajar con clientes en ventas
      if (person.type !== 'cliente') return false;

      // Obtener branchIds de la persona
      const personBranchIds = person.branchIds || [];

      // Si el usuario es admin y no hay selectedBranch -> mostrar todos los clientes
      if (termIsAdmin && (!branchToUse || String(branchToUse).trim() === '')) {
        return true;
      }

      // Si existe una sucursal a comparar, filtrar por ella
      if (branchToUse) {
        return personBranchIds.includes(branchToUse);
      }

      // Por defecto (cajero sin branch asignada o caso no contemplado), si no hay branch en persona permitirla solo si admin
      if (!branchToUse && termIsAdmin) return true;

      // Si llegamos acá sin condiciones, negar
      return false;
    });
  })();

  // Definir variables auxiliares antes del useMemo
  const isAdmin = userRole === 'admin';

  // Filtrar productos por sucursal para cajeros y para admin cuando haya selectedBranch
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) {
      return [];
    }

    let result = products;

    // Para cajeros: filtrar productos que tengan stock > 0 en su sucursal
    if (!isAdmin && userBranchId) {
      result = result.filter(product => {
        const stockInBranch = product.stockBySucursal?.[userBranchId] || 0;
        return stockInBranch > 0;
      });
    }

    // Para admin: si seleccionó una sucursal específica, mostrar productos relacionados a esa sucursal
    if (isAdmin && selectedBranch) {
      result = result.filter(product => {
        const stock = product.stockBySucursal?.[selectedBranch] || 0;
        const productBranchId = product.branchId || (product.branch && product.branch._id);
        // Mostrar producto si tiene stock en la sucursal seleccionada o si su branchId coincide
        return stock > 0 || String(productBranchId) === String(selectedBranch);
      });
    }

    return result;
  }, [products, isAdmin, currentUser, selectedBranch]);


  // Función helper para extraer ID de objetos poblados
  const getIdFromPopulatedField = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field._id) return field._id;
    return String(field);
  };

  // Admin ve todas las ventas por defecto; si hay selectedBranch la limita a esa sucursal.
  let filteredSales = sales;

  if (userRole === 'admin') {
    if (selectedBranch) {
      filteredSales = sales.filter(sale => {
        // Compatibilidad con campos poblados o no
        const saleBranch = getIdFromPopulatedField(sale.branchId);
        return String(saleBranch) === String(selectedBranch);
      });
    } else {
      filteredSales = sales;
    }
  } else if (userRole === 'cashier') {
    // Si el cajero no tiene branchId asignado, mostrar todas las ventas (compatibilidad)
    if (!userBranchId) {
      console.warn('SalesModule: Cajero sin branchId asignado - mostrando todas las ventas');
      filteredSales = sales;
    } else {
      // Filtrar por branchId con manejo robusto de valores null/undefined
      filteredSales = sales.filter(sale => {
        // Si la venta no tiene branchId, permitirla (compatibilidad con ventas antiguas)
        if (!sale.branchId) {
          return true;
        }

        const saleBranch = getIdFromPopulatedField(sale.branchId);
        const userBranch = String(userBranchId).trim();
        return saleBranch === userBranch;
      });
    }
  } else {
    // Usuario sin rol definido
    console.warn('SalesModule: Usuario sin rol definido - no mostrar ventas');
    filteredSales = [];
  }


  const getPersonName = (personId) => {
    if (!personId) return 'Sin cliente';

    // Si personId es un objeto (datos poblados del backend)
    if (typeof personId === 'object' && personId.name) {
      return personId.name;
    }

    // Si es solo un ID (string), buscar en el array local
    const personIdStr = getIdFromPopulatedField(personId);
    const person = persons.find(p => p._id === personIdStr);
    return person ? person.name : 'Cliente no encontrado';
  };

  const getCashierName = (cashierId) => {
    if (!cashierId) return 'Sin cajero';

    // Si cashierId es un objeto (datos poblados del backend)
    if (typeof cashierId === 'object' && cashierId.name) {
      return cashierId.name;
    }

    // Si es solo un ID (string), buscar en el array de usuarios primero
    const cashierIdStr = getIdFromPopulatedField(cashierId);
    if (Array.isArray(users) && users.length > 0) {
      const user = users.find(u => u._id === cashierIdStr);
      if (user) {
        return user.name || user.username || 'Usuario encontrado';
      }
    }

    return `Cajero (${cashierIdStr})`;
  };

  const formatGuarani = (amount = 0) => {
    try {
      const num = Number(amount) || 0;
      return `₲ ${num.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } catch (e) {
      console.error('formatGuarani error:', e, amount);
      return '₲ 0';
    }
  };

  // Formatea una fecha ISO/Date para mostrar solo la fecha en la zona local (es-PY)
  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      // Mostrar solo la fecha corta (sin hora)
      return d.toLocaleDateString('es-PY', { dateStyle: 'short' });
    } catch (e) {
      return String(iso);
    }
  };

  const getBranchName = (branchId) => {
    if (!branchId) return 'Sin Sucursal';

    // Si branchId es un objeto (datos poblados del backend)
    if (typeof branchId === 'object' && branchId.name) {
      return branchId.name;
    }

    // Si es solo un ID (string), buscar en el array local
    const branchIdStr = getIdFromPopulatedField(branchId);
    const branch = branches.find(b => b._id === branchIdStr);
    return branch ? branch.name : 'Sucursal no encontrada';
  };


  const handlePaymentMethodChange = (e) => {
    const newPaymentMethod = e.target.value;
    setModuleState(prev => ({
      ...prev,
      paymentMethod: newPaymentMethod,
      // Limpiar monto recibido si se cambia a tarjeta
      amountReceived: newPaymentMethod === 'tarjeta' ? '' : prev.amountReceived,
      // Inicializar montos mixtos si es mixto, limpiar si no lo es
      cashAmount: newPaymentMethod === 'mixto' ? (prev.cashAmount !== undefined && prev.cashAmount !== null ? prev.cashAmount : '') : '',
      cardAmount: newPaymentMethod === 'mixto' ? (prev.cardAmount !== undefined && prev.cardAmount !== null ? prev.cardAmount : '') : '',
    }));
  };

  const handleAddProductToSale = useCallback(() => {
    const product = products.find(p => p._id === selectedProduct);
    const finalPrice = priceOverride !== '' ? parseFloat(priceOverride) : (product ? product.price : 0);

    // Usar currentUser del prop (no localStorage, ya que no se usa)
    // Determinar el stock disponible según el rol y sucursal del usuario actual
    let availableStock = 0;

    if (product) {
      if (isAdmin) {
        // Admin puede ver stock total
        availableStock = product.stock || 0;
      } else if (userRole === 'cashier' && userBranchId) {
        // Cajeros solo ven stock de su sucursal
        if (product.stockBySucursal && product.stockBySucursal[userBranchId] !== undefined) {
          availableStock = product.stockBySucursal[userBranchId];
        } else {
          // Si no hay stock específico para esta sucursal, mostrar alerta
          alert('Este producto no tiene stock asignado a tu sucursal. Contacta al administrador.');
          return;
        }
      } else {
        alert('Error: No se pudo determinar el stock disponible. Verifica tu rol y sucursal asignada.');
        return;
      }
    }


    if (product && quantity > 0 && quantity <= availableStock && finalPrice > 0) {
      const existingItemIndex = saleDetails.findIndex(item => item._id === product._id);
      if (existingItemIndex > -1) {
        const updatedDetails = [...saleDetails];
        const existingItem = updatedDetails[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > availableStock) {
          alert(`No hay suficiente stock para la cantidad total solicitada (${newQuantity} > ${availableStock}). Stock disponible en tu sucursal: ${availableStock}`);
          return;
        }
        updatedDetails[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          subtotal: finalPrice * newQuantity,
        };
        setModuleState(prev => ({ ...prev, saleDetails: updatedDetails }));
      } else {
        setModuleState(prev => ({
          ...prev,
          saleDetails: [...prev.saleDetails, {
            _id: product._id || product.id, // Asegurar que _id esté disponible
            productId: product._id || product.id, // Campo adicional para compatibilidad
            name: product.name,
            quantity,
            price: finalPrice,
            subtotal: finalPrice * quantity
          }],
        }));
      }
      setModuleState(prev => ({ ...prev, selectedProduct: '', quantity: 1, priceOverride: '' }));
    } else {
      let errorMsg = 'Cantidad, precio o stock inválido.';
      if (quantity > availableStock) {
        errorMsg += ` Stock disponible en tu sucursal: ${availableStock}`;
      }
      alert(errorMsg);
    }
  }, [products, selectedProduct, priceOverride, isAdmin, userRole, userBranchId, quantity, saleDetails, setModuleState]);

  const handleRemoveProductFromSale = useCallback((productId) => {
    setModuleState(prev => {
      // Crear copia del arreglo para no mutar el estado anterior
      const updatedDetails = Array.isArray(prev.saleDetails) ? prev.saleDetails.map(d => ({ ...d })) : [];
      const idx = updatedDetails.findIndex(detail => {
        const detailId = detail._id || detail.productId || detail.id;
        return String(detailId) === String(productId);
      });

      // Si no existe, devolver el estado previo sin cambios
      if (idx === -1) return prev;

      const item = updatedDetails[idx];
      const currentQty = Number(item.quantity || 0);

      if (currentQty > 1) {
        const newQty = currentQty - 1;
        updatedDetails[idx] = {
          ...item,
          quantity: newQty,
          subtotal: Number((Number(item.price || 0) * newQty).toFixed(2))
        };
      } else {
        // Si la cantidad es 1 o menor, eliminar la línea
        updatedDetails.splice(idx, 1);
      }

      return {
        ...prev,
        saleDetails: updatedDetails,
      };
    });
  }, [setModuleState]);

  const handleConfirmSale = async () => {
    if (!selectedPerson || saleDetails.length === 0) {
      alert('Por favor, selecciona un cliente y agrega al menos un producto.');
      return;
    }

    // Prevenir clics múltiples
    if (isProcessingSale) {
      return;
    }

    // Ocultar el botón inmediatamente al presionar
    setShowConfirmButton(false);
    setIsConfirmingSale(true);
    setIsProcessingSale(true);

    const total = saleDetails.reduce((sum, item) => sum + item.subtotal, 0);


    // Validar sucursal según el rol del usuario
    let currentBranch;
    if (isAdmin) {
      // Admin debe seleccionar una sucursal
      if (!selectedBranch) {
        alert('Por favor, selecciona una sucursal para la venta desde el selector superior.');
        // Resetear estado si hay error
        setShowConfirmButton(true);
        setIsConfirmingSale(false);
        return;
      }
      currentBranch = selectedBranch;
    } else {
      // Cajeros usan su sucursal asignada automáticamente
      if (!userBranchId) {
        console.error('❌ Cajero sin branchId:', userBranchId);
        alert('Error: No tienes una sucursal asignada. Contacta al administrador para asignarte una sucursal.');
        // Resetear estado si hay error
        setShowConfirmButton(true);
        setIsConfirmingSale(false);
        return;
      }
      currentBranch = userBranchId;
    }

    // Validar monto recibido según el método de pago
    let receivedAmount = 0;
    let change = 0;

    // --- SOLUCIÓN: Forzar valores numéricos para pagos mixtos ---
    let safeCashAmount = 0;
    let safeCardAmount = 0;
    if (paymentMethod === 'mixto') {
      safeCashAmount = parseFloat(cashAmount) || 0;
      safeCardAmount = parseFloat(cardAmount) || 0;
    }

    if (paymentMethod === 'tarjeta') {
      // Para pagos con tarjeta, no se requiere monto recibido
      receivedAmount = total; // Se considera que se recibió el total
      change = 0;
    } else if (paymentMethod === 'efectivo') {
      // Para pagos en efectivo, validar que el monto recibido sea obligatorio y suficiente
      if (!amountReceived || amountReceived.trim() === '' || isNaN(parseFloat(amountReceived))) {
        alert('Por favor, ingresa el monto recibido. Este campo es obligatorio para pagos en efectivo.');
        // Resetear estado si hay error
        setShowConfirmButton(true);
        setIsConfirmingSale(false);
        setIsProcessingSale(false);
        return;
      }

      receivedAmount = parseFloat(amountReceived);
      if (receivedAmount < total) {
        alert(`El monto recibido (₲${receivedAmount.toLocaleString()}) es insuficiente. Debe ser al menos ₲${total.toLocaleString()}.`);
        // Resetear estado si hay error
        setShowConfirmButton(true);
        setIsConfirmingSale(false);
        setIsProcessingSale(false);
        return;
      }
      change = receivedAmount - total;
    } else if (paymentMethod === 'mixto') {
      // Validar que la suma de montos sea igual al total
      const totalMixto = safeCashAmount + safeCardAmount;
      if (totalMixto !== total) {
        alert(`La suma de efectivo (₲${safeCashAmount}) y tarjeta (₲${safeCardAmount}) debe ser igual al total (₲${total.toLocaleString()}).`);
        // Resetear estado si hay error
        setShowConfirmButton(true);
        setIsConfirmingSale(false);
        setIsProcessingSale(false);
        return;
      }
      receivedAmount = safeCashAmount; // Para compatibilidad
      change = 0;
    }

    // Obtener userId del currentUser prop (no localStorage)
    const userId = currentUser._id || currentUser.id;
    if (!userId) {
      console.error('❌ No se pudo obtener userId del currentUser');
      alert('Error interno: No se pudo identificar el usuario. Refresca la página e inicia sesión nuevamente.');
      // Resetear estado si hay error
      setShowConfirmButton(true);
      setIsConfirmingSale(false);
      setIsProcessingSale(false);
      return;
    }

    // Crear objeto de venta con usuario actual garantizado
    const newSale = {
      personId: selectedPerson,
      cashierId: userId,
      branchId: currentBranch,
      // Enviar timestamp completo en ISO para preservar hora y zona (evita 'YYYY-MM-DD' que se interpreta como UTC midnight)
      date: new Date().toISOString(),
      details: saleDetails.map(item => ({
        productId: item._id || item.productId, // Usar _id o productId según esté disponible
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      })),
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'tarjeta' ? null : receivedAmount,
      change: paymentMethod === 'tarjeta' ? 0 : change,
      // --- SOLUCIÓN: Usar los valores seguros ---
      cashAmount: paymentMethod === 'mixto' ? safeCashAmount : null,
      cardAmount: paymentMethod === 'mixto' ? safeCardAmount : null,
      // Asegurar que userId sea exactamente el del usuario logueado
      userId: userId,
      // Agregar información adicional del usuario para debugging
      userInfo: {
        id: userId,
        name: currentUser.name,
        username: currentUser.username,
        role: userRole
      }
    };




    try {
      // Esperar el resultado de onAddSale
      const result = await onAddSale(newSale, currentBranch, saleDetails);

      if (result && result.success) {
        // Solo limpiar el estado y mostrar ticket si la venta fue exitosa
        setModuleState({
          selectedPerson: '',
          selectedProduct: '',
          quantity: 1,
          priceOverride: '',
          paymentMethod: 'efectivo',
          saleDetails: [],
          amountReceived: '',
        });

        // Mostrar mensaje de éxito
        alert(result.message || 'Venta guardada exitosamente!');

        // Mostrar el ticket con los datos de la venta guardada
        setCurrentSaleTicket(result.sale || newSale);
        setShowTicketModal(true);

        // Mantener el botón oculto hasta que se cierre el ticket
        setIsProcessingSale(false);
      } else {
        // Si la venta falló, mostrar el error y NO limpiar el estado
        const errorMessage = result?.error || 'Error desconocido al guardar la venta';
        alert(`Error al guardar la venta: ${errorMessage}`);
        console.error('Error en venta:', errorMessage);
        // Resetear estado si hay error
        setShowConfirmButton(true);
        setIsConfirmingSale(false);
        setIsProcessingSale(false);
      }
    } catch (error) {
      // Manejar errores inesperados
      console.error('Error inesperado en handleConfirmSale:', error);
      alert('Error inesperado al procesar la venta. Por favor, intenta nuevamente.');
      // Resetear estado si hay error
      setShowConfirmButton(true);
      setIsConfirmingSale(false);
      setIsProcessingSale(false);
    }
  };

  const handleClearSale = () => {
    setModuleState({
      selectedPerson: '',
      selectedProduct: '',
      quantity: 1,
      priceOverride: '',
      paymentMethod: 'efectivo',
      saleDetails: [],
      amountReceived: '',
      cashAmount: '',
      cardAmount: '',
    });
    // Limpiar estado de edición
    setEditingSale(null);
    setIsEditing(false);
    // Nota: La sucursal seleccionada se maneja en el componente padre
  };

  const requestEditSale = (sale) => {
    // En vez de entrar directamente en edición, solicitar contraseña de admin primero.
    setPendingEditSale(sale);
    setShowAdminPasswordModalForEdit(true);
  };

  const handleConfirmEditWithPassword = async () => {
    if (!adminPasswordForEdit || !adminPasswordForEdit.trim()) {
      alert('Por favor, ingresa la contraseña del administrador.');
      return;
    }

    setIsVerifyingPassword(true);
    try {
      // Usar helper API (maneja baseURL y headers) — no es necesario token para esta verificación
      const data = await api.post('/auth/verify-admin-password', { adminPassword: adminPasswordForEdit }, null, currentUser);

      if (data && data.success) {
        // Contraseña válida: iniciar edición y conservar la contraseña verificada
        const sale = pendingEditSale;
        setEditingSale(sale);
        setIsEditing(true);

        // Guardar la contraseña verificada temporalmente para usarla al enviar la actualización
        setVerifiedAdminPassword(adminPasswordForEdit);

        setModuleState({
          selectedPerson: sale.personId,
          selectedProduct: '',
          quantity: 1,
          priceOverride: '',
          paymentMethod: sale.paymentMethod || 'efectivo',
          saleDetails: sale.details,
          amountReceived: (sale.paymentMethod === 'tarjeta' || !sale.amountReceived) ? '' : sale.amountReceived.toString(),
          // Asegurar que cashAmount y cardAmount sean números o strings vacíos
          cashAmount: (sale.paymentMethod === 'mixto' && sale.cashAmount != null) ? Number(sale.cashAmount) : '',
          cardAmount: (sale.paymentMethod === 'mixto' && sale.cardAmount != null) ? Number(sale.cardAmount) : '',
        });

        setShowAdminPasswordModalForEdit(false);
        setAdminPasswordForEdit('');
        setPendingEditSale(null);
      } else {
        const msg = data?.message || 'Contraseña de administrador inválida';
        alert(msg);
      }
    } catch (err) {
      console.error('Error validando contraseña de admin:', err);
      // Extraer mensaje proveniente del helper api si está disponible
      const errMsg = err?.message || err?.response?.data?.message || 'Error verificando la contraseña. Intenta nuevamente.';
      alert(errMsg);
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleCancelEditPassword = () => {
    setShowAdminPasswordModalForEdit(false);
    setAdminPasswordForEdit('');
    setPendingEditSale(null);
  };

  const handleUpdateSale = async () => {
    if (!selectedPerson || saleDetails.length === 0) {
      alert('Por favor, selecciona un cliente y agrega al menos un producto.');
      return;
    }

    const total = saleDetails.reduce((sum, item) => sum + item.subtotal, 0);

    // Validar monto recibido según el método de pago para edición
    let receivedAmount = 0;
    let change = 0;
    let safeCashAmount = 0;
    let safeCardAmount = 0;
    if (paymentMethod === 'mixto') {
      safeCashAmount = parseFloat(cashAmount) || 0;
      safeCardAmount = parseFloat(cardAmount) || 0;
    }

    if (paymentMethod === 'tarjeta') {
      // Para pagos con tarjeta, no se requiere monto recibido
      receivedAmount = total; // Se considera que se recibió el total
      change = 0;
    } else if (paymentMethod === 'efectivo') {
      // Para pagos en efectivo, validar que el monto recibido sea obligatorio y suficiente
      if (!amountReceived || amountReceived.trim() === '' || isNaN(parseFloat(amountReceived))) {
        alert('Por favor, ingresa el monto recibido. Este campo es obligatorio para pagos en efectivo.');
        return;
      }

      receivedAmount = parseFloat(amountReceived);
      if (receivedAmount < total) {
        alert('El monto recibido es insuficiente. Debe ser al menos igual al total de la venta.');
        return;
      }
      change = receivedAmount - total;
    } else if (paymentMethod === 'mixto') {
      // Validar que la suma de montos sea igual al total
      const totalMixto = safeCashAmount + safeCardAmount;
      if (totalMixto !== total) {
        alert(`La suma de efectivo (₲${safeCashAmount}) y tarjeta (₲${safeCardAmount}) debe ser igual al total (₲${total.toLocaleString()}).`);
        return;
      }
      receivedAmount = safeCashAmount;
      change = 0;
    }

    const updatedSale = {
      ...editingSale,
      personId: selectedPerson,
      details: saleDetails,
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'tarjeta' ? null : receivedAmount,
      change: paymentMethod === 'tarjeta' ? 0 : change,
      // --- SOLUCIÓN: Asegurar que cashAmount y cardAmount sean números o null explícitamente ---
      cashAmount: paymentMethod === 'mixto' ? Number(safeCashAmount) || 0 : null,
      cardAmount: paymentMethod === 'mixto' ? Number(safeCardAmount) || 0 : null,
    };

    try {
      // Pasar la contraseña de administrador verificada al handler de edición
      const maybePromise = onEditSale(updatedSale, verifiedAdminPassword);
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
      }

      // Limpiar la contraseña verificada después de usarla para evitar reuso accidental
      setVerifiedAdminPassword(null);
    } catch (err) {
      console.error('Error en onEditSale:', err);
      // Mostrar un mensaje más explícito al usuario
      const errMsg = err?.response?.data?.message || err?.message || 'Error actualizando la venta';
      alert(errMsg);
      // No continuar con la limpieza final del estado para que el usuario pueda reintentar
      return;
    }

    // Asegurar que el historial se recargue siempre después de editar
    try {
      if (onReloadData) {
        onReloadData();
      }
    } catch (err) {
      console.warn('Error ejecutando onReloadData tras editar venta:', err);
    }

    // Limpiar estado
    setModuleState({
      selectedPerson: '',
      selectedProduct: '',
      quantity: 1,
      priceOverride: '',
      paymentMethod: 'efectivo',
      saleDetails: [],
      amountReceived: '',
      cashAmount: 0,
      cardAmount: 0,
    });
    setEditingSale(null);
    setIsEditing(false);
    alert('Venta actualizada con éxito!');
  };

  const handleCancelEdit = () => {
    setEditingSale(null);
    setIsEditing(false);
    setModuleState({
      selectedPerson: '',
      selectedProduct: '',
      quantity: 1,
      priceOverride: '',
      paymentMethod: 'efectivo',
      saleDetails: [],
      amountReceived: '',
      cashAmount: '',
      cardAmount: '',
    });
  };

  const handleDeleteSale = (saleId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer.')) {
      setPendingDeleteId(saleId);
      setShowAdminPasswordModal(true);
    }
  };

  const handleConfirmDeleteWithPassword = async () => {
    if (!adminPassword.trim()) {
      alert('Por favor, ingresa la contraseña del administrador.');
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteSale(pendingDeleteId, adminPassword);
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      setPendingDeleteId(null);
      alert('Venta eliminada exitosamente.');
    } catch (error) {
      console.error('Error eliminando venta:', error);
      alert('Error al eliminar la venta. Verifica la contraseña del administrador.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowAdminPasswordModal(false);
    setAdminPassword('');
    setPendingDeleteId(null);
  };

  const totalSaleAmount = saleDetails.reduce((sum, item) => sum + item.subtotal, 0);
  const changeAmount = (paymentMethod === 'efectivo' && amountReceived !== '' && !isNaN(parseFloat(amountReceived)))
    ? parseFloat(amountReceived) - totalSaleAmount
    : 0;

  // Estados locales para el historial y el modal del ticket
  const [showHistory, setShowHistory] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [currentSaleTicket, setCurrentSaleTicket] = useState(null);

  // Estados para el modal de contraseña de admin (eliminar) y para edición protegida
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados adicionales para proteger la edición de ventas con contraseña de administrador
  const [showAdminPasswordModalForEdit, setShowAdminPasswordModalForEdit] = useState(false);
  const [adminPasswordForEdit, setAdminPasswordForEdit] = useState('');
  const [pendingEditSale, setPendingEditSale] = useState(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [verifiedAdminPassword, setVerifiedAdminPassword] = useState(null);


  // Estado para edición
  const [editingSale, setEditingSale] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados para controlar el botón de confirmar venta
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [showConfirmButton, setShowConfirmButton] = useState(true);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Filtros para el historial
  const [cashierFilter, setCashierFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  // Paginación para el historial
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Mostrar 10 ventas por página

  // Nota: selectedBranch ahora viene como prop desde App.js


  // Función para filtrar ventas del historial
  const getFilteredHistorySales = () => {
    let filtered = [...(filteredSales || [])]; // Crear copia para evitar mutaciones

    // Filtro por cajero (solo para admin)
    if (currentUser && currentUser.role === 'admin' && cashierFilter && cashierFilter.trim() !== '') {
      filtered = filtered.filter(sale => {
        const saleCashierId = getIdFromPopulatedField(sale.cashierId);
        const filterCashierId = String(cashierFilter).trim();
        return saleCashierId === filterCashierId;
      });
    }

    // Filtro por fecha desde
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter + 'T00:00:00.000Z'); // Inicio del día seleccionado
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= fromDate;
      });
    }

    // Filtro por fecha hasta
    if (dateToFilter) {
      const toDate = new Date(dateToFilter + 'T23:59:59.999Z'); // Fin del día seleccionado
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate <= toDate;
      });
    }

    // Ordenar por fecha más reciente primero, luego por ID descendente para ventas del mismo día
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      const dateDiff = dateB - dateA;
      if (dateDiff !== 0) return dateDiff;
      // Si las fechas son iguales, ordenar por ID descendente (más reciente primero)
      return b._id.localeCompare(a._id);
    });
    return sorted;
  };

  // Función para obtener ventas paginadas
  const getPaginatedSales = () => {
    const filtered = getFilteredHistorySales();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(getFilteredHistorySales().length / itemsPerPage);

  // Limpiar filtro de cajero si el usuario no es admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      setCashierFilter('');
    }
  }, [currentUser]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [cashierFilter, dateFromFilter, dateToFilter, selectedBranch]);

  // Recargar datos cuando cambie la sucursal seleccionada por admin (incluyendo a "")
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin' && onReloadData) {
      onReloadData();
    }
  }, [selectedBranch, currentUser, onReloadData]);

  // Auto-refresh: recargar datos del módulo de ventas cada 30 segundos para mantener información actualizada.
  // NOTA: onReloadData debe ser una función pasada desde el componente padre que re-fetches persons/products/sales.
  // No tocamos moduleState aquí para no sobrescribir la selección del cliente mientras se edita.
  useEffect(() => {
    if (!onReloadData) return;
    const intervalId = setInterval(() => {
      try {
        onReloadData();
      } catch (err) {
        console.warn('SalesModule auto-refresh error:', err);
      }
    }, 30000); // 30 segundos en lugar de 1 segundo

    return () => {
      clearInterval(intervalId);
    };
  }, [onReloadData]);

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
          Módulo de Ventas
          {isEditing && (
            <span className="block text-2xl text-blue-600 mt-2">
              ✏️ Editando Venta: {editingSale?.id}
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label htmlFor="person" className="block text-gray-700 text-lg font-medium mb-2">
              Cliente:
            </label>
            <Select
              value={filteredPersons.filter(p => p.type === 'cliente').find(person => person._id === selectedPerson) ? { value: selectedPerson, label: filteredPersons.find(p => p._id === selectedPerson)?.name } : null}
              onChange={(selectedOption) => setModuleState(prev => ({ ...prev, selectedPerson: selectedOption ? selectedOption.value : '' }))}
              options={filteredPersons.filter(p => p.type === 'cliente').map(person => ({ value: person._id, label: person.name }))}
              placeholder="Selecciona un cliente"
              isClearable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderRadius: '0.75rem',
                  borderColor: '#d1d5db',
                  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                  fontSize: '1.125rem',
                  '&:hover': {
                    borderColor: '#10b981',
                  },
                  '&:focus-within': {
                    borderColor: '#10b981',
                    boxShadow: '0 0 0 3px rgb(16 185 129 / 0.1)',
                  },
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#f3f4f6' : 'white',
                  color: state.isSelected ? 'white' : '#374151',
                  fontSize: '1.125rem',
                }),
                placeholder: (provided) => ({
                  ...provided,
                  fontSize: '1.125rem',
                }),
                singleValue: (provided) => ({
                  ...provided,
                  fontSize: '1.125rem',
                }),
              }}
            />
          </div>

          {/* Selector de sucursal para admin */}
          {currentUser && currentUser.role === 'admin' && (
            <div>
              <label htmlFor="branchSelect" className="block text-gray-700 text-lg font-medium mb-2">
                Sucursal:
              </label>
              <select
                id="branchSelect"
                value={selectedBranch || ''}
                disabled
                className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm bg-gray-100 text-gray-500 text-lg cursor-not-allowed"
              >
                <option value="">
                  {selectedBranch ? branches.find(b => b._id === selectedBranch)?.name : 'Selecciona una sucursal desde arriba'}
                </option>
                {branches.map(branch => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
              <p className="text-sm text-blue-600 mt-2">
                💡 Cambia la sucursal usando el selector en la parte superior de la página
              </p>
              {selectedBranch && (
                <p className="text-sm text-green-600 mt-1">
                  ✅ Mostrando personas y productos de: <strong>{branches.find(b => b._id === selectedBranch)?.name}</strong>
                </p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="product" className="block text-gray-700 text-lg font-medium mb-2">
              Producto:
            </label>
            <Select
              value={filteredProducts.find(product => product._id === selectedProduct) ? (() => {
                const product = filteredProducts.find(p => p._id === selectedProduct);
                let displayStock = product.stock;
                if (!isAdmin && userBranchId) {
                  displayStock = product.stockBySucursal?.[userBranchId] || 0;
                }
                return { value: product._id, label: `${product.name} (${product.category}) - Stock: ${displayStock} ${isAdmin ? '(Total)' : `(Sucursal: ${branches.find(b => b._id === userBranchId)?.name || 'Asignada'})`}` };
              })() : null}
              onChange={(selectedOption) => {
                const productId = selectedOption ? selectedOption.value : '';
                const product = products.find(p => p._id === productId);
                setModuleState(prev => ({
                  ...prev,
                  selectedProduct: productId,
                  priceOverride: product ? product.price.toString() : '',
                }));
              }}
              options={filteredProducts.map(product => {
                // Determinar el stock a mostrar según el rol del usuario actual
                let displayStock = product.stock;
                if (!isAdmin && userBranchId) {
                  displayStock = product.stockBySucursal?.[userBranchId] || 0;
                }
                return {
                  value: product._id,
                  label: `${product.name} (${product.category}) - Stock: ${displayStock} ${isAdmin ? '(Total)' : `(Sucursal: ${branches.find(b => b._id === userBranchId)?.name || 'Asignada'})`}`
                };
              })}
              placeholder="Selecciona un producto"
              isClearable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (provided) => ({
                  ...provided,
                  borderRadius: '0.75rem',
                  borderColor: '#d1d5db',
                  boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                  fontSize: '1.125rem',
                  '&:hover': {
                    borderColor: '#10b981',
                  },
                  '&:focus-within': {
                    borderColor: '#10b981',
                    boxShadow: '0 0 0 3px rgb(16 185 129 / 0.1)',
                  },
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#f3f4f6' : 'white',
                  color: state.isSelected ? 'white' : '#374151',
                  fontSize: '1.125rem',
                }),
                placeholder: (provided) => ({
                  ...provided,
                  fontSize: '1.125rem',
                }),
                singleValue: (provided) => ({
                  ...provided,
                  fontSize: '1.125rem',
                }),
              }}
            />
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
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 text-lg"
            />
          </div>
          <div>
            <label htmlFor="priceOverride" className="block text-gray-700 text-lg font-medium mb-2">
              Precio Unitario (₲):
            </label>
            <input
              type="number"
              id="priceOverride"
              value={priceOverride}
              onChange={(e) => setModuleState(prev => ({ ...prev, priceOverride: e.target.value }))}
              step="0.01"
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 text-lg"
            />
          </div>
          <div>
            <label htmlFor="paymentMethod" className="block text-gray-700 text-lg font-medium mb-2">
              Método de Pago:
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={handlePaymentMethodChange}
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 text-lg bg-white"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mixto">Mixto (Efectivo + Tarjeta)</option>
            </select>
          </div>
          <div>
            <label htmlFor="amountReceived" className="block text-gray-700 text-lg font-medium mb-2">
              Monto Recibido (₲): {paymentMethod === 'efectivo' ? '*' : '(Opcional)'}
            </label>
            <input
              type="number"
              id="amountReceived"
              value={amountReceived}
              onChange={(e) => setModuleState(prev => ({ ...prev, amountReceived: e.target.value }))}
              step="0.01"
              required={paymentMethod === 'efectivo'}
              disabled={paymentMethod === 'tarjeta'}
              className={`w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 ${paymentMethod === 'tarjeta' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
            />
            <p className="text-sm text-gray-500 mt-1">
              {paymentMethod === 'efectivo'
                ? '* Campo obligatorio para pagos en efectivo'
                : paymentMethod === 'mixto'
                  ? 'Para pagos mixtos, ingresa los montos en efectivo y tarjeta abajo'
                  : 'Para pagos con tarjeta, este campo se completa automáticamente'
              }
            </p>
          </div>
          {paymentMethod === 'mixto' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cashAmount" className="block text-gray-700 text-lg font-medium mb-2">
                  Monto Efectivo (₲): *
                </label>
                <input
                  type="number"
                  id="cashAmount"
                  value={cashAmount}
                  onChange={(e) => setModuleState(prev => ({ ...prev, cashAmount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 text-lg"
                  required
                />
              </div>
              <div>
                <label htmlFor="cardAmount" className="block text-gray-700 text-lg font-medium mb-2">
                  Monto Tarjeta (₲): *
                </label>
                <input
                  type="number"
                  id="cardAmount"
                  value={cardAmount}
                  onChange={(e) => setModuleState(prev => ({ ...prev, cardAmount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 text-lg"
                  required
                />
              </div>
            </div>
          )}
          <div className="flex items-end space-x-4">
            <button
              onClick={handleAddProductToSale}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Agregar al Carrito
            </button>
            <button
              onClick={handleClearSale}
              className="w-full px-6 py-3 bg-gray-400 text-white font-semibold rounded-xl shadow-md hover:bg-gray-500 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Limpiar
            </button>
          </div>
        </div>

        {saleDetails.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Detalle de la Venta Actual:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl overflow-hidden">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="py-3 px-5 text-left text-md font-semibold text-gray-700">Producto</th>
                    <th className="py-3 px-5 text-left text-md font-semibold text-gray-700">Precio Unitario</th>
                    <th className="py-3 px-5 text-left text-md font-semibold text-gray-700">Cantidad</th>
                    <th className="py-3 px-5 text-left text-md font-semibold text-gray-700">Subtotal</th>
                    <th className="py-3 px-5 text-center text-md font-semibold text-gray-700">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(saleDetails || []).map(item => (
                    <tr key={item._id || item.productId || item.id || Math.random()} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-3 px-5 text-md text-gray-800">{item.name}</td>
                      <td className="py-3 px-5 text-md text-gray-800">{formatGuarani(item.price)}</td>
                      <td className="py-3 px-5 text-md text-gray-800">{item.quantity}</td>
                      <td className="py-3 px-5 text-md text-gray-800">{formatGuarani(item.subtotal)}</td>
                      <td className="py-3 px-5 flex justify-center">
                        <button
                          onClick={() => handleRemoveProductFromSale(item._id || item.productId || item.id)}
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
              Total: {formatGuarani(totalSaleAmount)}
            </div>
            {paymentMethod === 'efectivo' && amountReceived !== '' && !isNaN(parseFloat(amountReceived)) && (
              <div className="text-right text-xl font-semibold text-gray-700 mt-2">
                Monto Recibido: {formatGuarani(parseFloat(amountReceived))}
                <br />
                Vuelto: {formatGuarani(changeAmount)}
              </div>
            )}
            {paymentMethod === 'tarjeta' && (
              <div className="text-right text-xl font-semibold text-blue-600 mt-2">
                💳 Pago con tarjeta - Procesado automáticamente
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4">
          {showConfirmButton && (
            <button
              onClick={isEditing ? handleUpdateSale : handleConfirmSale}
              disabled={isConfirmingSale || isProcessingSale}
              className={`flex-1 px-8 py-4 text-white text-xl font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${isEditing
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-300'
                } ${(isConfirmingSale || isProcessingSale) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {(isConfirmingSale || isProcessingSale) ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                  Procesando...
                </>
              ) : (
                isEditing ? 'Actualizar Venta' : 'Confirmar Venta'
              )}
            </button>
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
            <h3 className="text-3xl font-bold text-gray-800">Historial de Ventas</h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showHistory ? 'Minimizar' : 'Maximizar'}
            </button>
          </div>

          {/* Filtros del historial */}
          {showHistory && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl shadow-inner">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Filtros del Historial</h4>
              <div className={`grid gap-4 ${currentUser && currentUser.role === 'admin' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {/* Filtro por cajero solo para admin */}
                {currentUser && currentUser.role === 'admin' && (
                  <div>
                    <label htmlFor="cashierFilter" className="block text-gray-700 text-sm font-medium mb-1">
                      Filtrar por Cajero:
                    </label>
                    <select
                      id="cashierFilter"
                      value={cashierFilter}
                      onChange={(e) => setCashierFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      <option value="">Todos los Cajeros</option>
                      {/*
                      Mostrar solo cajeros disponibles en la sucursal seleccionada.
                      Si selectedBranch está vacío, mostrar todos los cajeros.
                      Manejar casos en que user.branchId venga poblado como objeto.
                    */}
                      {users
                        .filter(user => {
                          if (user.role !== 'cashier') return false;
                          if (!selectedBranch || String(selectedBranch).trim() === '') return true;
                          const userBranch = typeof user.branchId === 'object' && user.branchId
                            ? (user.branchId._id || user.branchId.id || null)
                            : user.branchId;
                          return String(userBranch) === String(selectedBranch);
                        })
                        .map(cashier => (
                          <option key={cashier._id} value={cashier._id}>{cashier.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Filtros de fecha para todos los usuarios */}
                <div>
                  <label htmlFor="dateFromFilter" className="block text-gray-700 text-sm font-medium mb-1">
                    Fecha Desde:
                  </label>
                  <input
                    type="date"
                    id="dateFromFilter"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="dateToFilter" className="block text-gray-700 text-sm font-medium mb-1">
                    Fecha Hasta:
                  </label>
                  <input
                    type="date"
                    id="dateToFilter"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    // Solo limpiar filtro de cajero si el usuario es admin
                    if (currentUser && currentUser.role === 'admin') {
                      setCashierFilter('');
                    }
                    setDateFromFilter('');
                    setDateToFilter('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}
          {showHistory && (
            (() => {
              const historySales = getPaginatedSales();
              const totalFilteredSales = getFilteredHistorySales().length;

              return totalFilteredSales === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-600 text-xl">No hay ventas que coincidan con los filtros.</p>
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                    <p className="text-sm text-yellow-800">
                      <strong>Debug Info:</strong><br />
                      Total ventas: {sales?.length || 0}<br />
                      Ventas filtradas por sucursal: {filteredSales?.length || 0}<br />
                      Ventas después de filtros adicionales: {getFilteredHistorySales().length}<br />
                      Página currentPage: {currentPage} de {totalPages}<br />
                      Elementos por página: {itemsPerPage}<br />
                      Usuario: {currentUser?.name} ({currentUser?.role})<br />
                      Sucursal: {currentUser?.branchId || 'No asignada'}<br />
                      Filtro cajero: "{cashierFilter}"<br />
                      Filtro fecha desde: "{dateFromFilter}"<br />
                      Filtro fecha hasta: "{dateToFilter}"<br />
                      Rol usuario: {currentUser?.role}<br />
                      {currentUser && currentUser.role !== 'admin' && (
                        <>Nota: Cajeros no tienen acceso al filtro por cajero</>
                      )}
                    </p>
                    {filteredSales?.length > 0 && getFilteredHistorySales().length === 0 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs text-red-800">
                          <strong>Posible problema:</strong> Hay ventas filtradas por sucursal pero ninguna pasa los filtros adicionales.
                          Revisa los filtros aplicados arriba.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-xl overflow-hidden">
                      <thead className="bg-gray-100 border-b-2 border-gray-200">
                        <tr>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">ID Venta</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Cliente</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Cajero</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Fecha</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Método Pago</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Total</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Productos</th>
                          <th className="py-4 px-6 text-center text-lg font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historySales.map((sale) => (
                          <tr key={sale._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                            <td className="py-4 px-6 text-lg text-gray-800">{sale._id}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{getPersonName(sale.personId)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{getCashierName(sale.cashierId)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{formatDate(sale.date)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800 capitalize">{sale.paymentMethod}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{formatGuarani(sale.total)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">
                              <ul className="list-disc list-inside">
                                {(sale.details || []).map((detail, idx) => (
                                  <li key={idx}>{detail.name} ({detail.quantity})</li>
                                ))}
                              </ul>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => requestEditSale(sale)}
                                  className="p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-all duration-200 transform hover:scale-110"
                                  title="Editar venta"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => { setCurrentSaleTicket(sale); setShowTicketModal(true); }}
                                  className="p-2 bg-green-500 text-white rounded-full shadow-md hover:bg-green-600 transition-all duration-200 transform hover:scale-110"
                                  title="Ver Ticket"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-.586-1.414L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteSale(sale._id)}
                                  className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-110"
                                  title="Eliminar Venta"
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
                                      ? 'bg-green-600 text-white'
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
                                  ? 'bg-green-600 text-white'
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
                    Mostrando {historySales.length} de {totalFilteredSales} ventas
                    {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {showTicketModal && (
          <SaleTicketModal
            sale={currentSaleTicket}
            onClose={() => {
              setShowTicketModal(false);
              // Resetear el estado del botón cuando se cierra el ticket
              setShowConfirmButton(true);
              setIsConfirmingSale(false);
              setIsProcessingSale(false);
            }}
            getPersonName={getPersonName}
            getCashierName={getCashierName}
            formatGuarani={formatGuarani}
          />
        )}

        {/* Modal de contraseña de administrador (Eliminar) */}
        {showAdminPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Confirmar Eliminación
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Para eliminar esta venta, ingresa la contraseña del administrador:
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

        {/* Modal de contraseña de administrador (Editar - requiere validación previa en backend) */}
        {showAdminPasswordModalForEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Autorizar Edición
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Para editar esta venta, ingresa la contraseña del administrador (o solicita al admin que la ingrese):
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

export default SalesModule;
