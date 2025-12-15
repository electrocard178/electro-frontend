import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import SaleTicketModal from './SaleTicketModal';

const SalesModule = ({ persons, products, services = [], onAddSale, onEditSale, onDeleteSale, sales, moduleState, setModuleState, branches = [], currentUser = null, users = [], onReloadData, selectedBranch }) => {
  // Destructure state with defaults
  const {
    selectedPerson = '',
    saleDetails = [],
    paymentMethod = 'efectivo',
    amountReceived = '',
    cashAmount = '',
    cardAmount = ''
  } = moduleState || {};

  const [activeTab, setActiveTab] = useState('pos');
  const [posMode, setPosMode] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');

  // History Pagination
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 8;

  // Modals for Actions
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  const isAdmin = currentUser && currentUser.role === 'admin';
  const userBranchId = currentUser?.branchId;

  // --- 1. FILTER LOGIC ---
  const posItems = useMemo(() => {
    let items = [];
    if (posMode === 'products') {
      items = products;
      if (!isAdmin && userBranchId) {
        items = items.filter(p => (p.stockBySucursal?.[userBranchId] || 0) > 0);
      } else if (isAdmin && selectedBranch) {
        items = items.filter(p => (p.stockBySucursal?.[selectedBranch] || 0) > 0);
      }
    } else {
      items = services;
    }

    const term = searchTerm.toLowerCase();
    return items.filter(item => (item.name || '').toLowerCase().includes(term));
  }, [products, services, posMode, searchTerm, isAdmin, userBranchId, selectedBranch]);

  // --- 2. POS HANDLERS ---
  const handleAddToCart = (item) => {
    const isService = posMode === 'services';
    const id = item._id || item.id;
    const price = item.price;

    const exists = saleDetails.find(d => (d._id === id || d.productId === id || d.serviceId === id) && d.isService === isService);

    const newDetails = [...saleDetails];
    if (exists) {
      const idx = saleDetails.indexOf(exists);
      newDetails[idx] = { ...exists, quantity: exists.quantity + 1, subtotal: (exists.quantity + 1) * exists.price };
    } else {
      newDetails.push({
        _id: id,
        productId: !isService ? id : null,
        serviceId: isService ? id : null,
        name: item.name,
        price,
        quantity: 1,
        subtotal: price,
        isService
      });
    }
    setModuleState(prev => ({ ...prev, saleDetails: newDetails }));
  };

  const updateItemQty = (index, delta) => {
    const newDetails = [...saleDetails];
    const item = newDetails[index];
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      newDetails.splice(index, 1);
    } else {
      newDetails[index] = { ...item, quantity: newQty, subtotal: newQty * item.price };
    }
    setModuleState(prev => ({ ...prev, saleDetails: newDetails }));
  };

  const calculateTotal = () => saleDetails.reduce((s, i) => s + i.subtotal, 0);

  const handleConfirmSale = async () => {
    if (!selectedPerson || saleDetails.length === 0) return alert('Seleccione cliente y ítems.');

    const total = calculateTotal();

    // Validations for payment amounts
    if (paymentMethod === 'efectivo') {
      if (!amountReceived || parseFloat(amountReceived) < total) {
        return alert('El monto recibido es insuficiente.');
      }
    } else if (paymentMethod === 'mixto') {
      const cash = parseFloat(cashAmount || 0);
      const card = parseFloat(cardAmount || 0);
      if ((cash + card) < total) { // Relaxed check: can be equal or more, usually exact
        return alert('La suma de efectivo y tarjeta debe cubrir el total.');
      }
    }

    setIsProcessingSale(true);

    // Robust Cashier ID retrieval
    const cashierId = currentUser?._id || currentUser?.id;
    if (!cashierId) {
      setIsProcessingSale(false);
      return alert('Error: No se pudo identificar al cajero logueado.');
    }

    // Validate Branch
    const saleBranchId = isAdmin ? selectedBranch : userBranchId;
    if (!saleBranchId) {
      setIsProcessingSale(false);
      return alert(isAdmin ? 'Por favor, seleccione una SUCURSAL en la barra superior antes de vender.' : 'Error: Tu usuario no tiene asignada una sucursal.');
    }

    const newSale = {
      personId: selectedPerson,
      cashierId: cashierId, // Explicitly verified
      branchId: saleBranchId,
      date: new Date().toISOString(),
      details: saleDetails,
      total,
      paymentMethod,
      amountReceived: paymentMethod === 'efectivo' ? parseFloat(amountReceived) : undefined,
      cashAmount: paymentMethod === 'mixto' ? parseFloat(cashAmount) : undefined,
      cardAmount: paymentMethod === 'mixto' ? parseFloat(cardAmount) : undefined,
    };

    try {
      const res = await onAddSale(newSale, newSale.branchId, saleDetails);
      if (res && res.success === false) {
        alert('Error al guardar venta: ' + (res.error || 'Desconocido'));
      } else {
        // Success
        setModuleState({
          selectedPerson: '',
          saleDetails: [],
          paymentMethod: 'efectivo',
          amountReceived: '',
          cashAmount: '',
          cardAmount: ''
        });
        alert('Venta Exitosa');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión o servidor al procesar venta.');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // --- 3. HISTORY LOGIC ---
  const filteredHistory = useMemo(() => {
    if (!Array.isArray(sales)) return [];

    let result = sales;
    if (!isAdmin && userBranchId) {
      result = result.filter(s => String(s.branchId?._id || s.branchId) === String(userBranchId));
    } else if (isAdmin && selectedBranch) {
      result = result.filter(s => String(s.branchId?._id || s.branchId) === String(selectedBranch));
    }

    if (activeTab === 'history_services') {
      result = result.filter(s => s.details.some(d => d.isService || d.serviceId));
    } else {
      result = result.filter(s => s.details.some(d => !d.isService && !d.serviceId));
    }

    return result;
  }, [sales, activeTab, isAdmin, userBranchId, selectedBranch]);

  const getPaginatedHistory = () => {
    const start = (historyPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  };
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const getUserName = (id) => {
    if (typeof id === 'object') return id?.name || '---';
    const u = users.find(u => u._id === id);
    return u ? u.name : '---';
  };
  const getPersonName = (id) => {
    if (typeof id === 'object') return id?.name || '---';
    const p = persons.find(x => x._id === id);
    return p ? p.name : 'Cliente General';
  };

  const handleDeleteSale = async () => {
    if (!adminPassword) return alert('Ingrese contraseña');
    setIsDeleting(true);
    try {
      await onDeleteSale(pendingDeleteId, adminPassword);
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      alert('Venta eliminada');
    } catch (e) {
      alert('Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  const total = calculateTotal();

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Top Nav */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-30">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span className="text-3xl">💈</span>
          {activeTab === 'pos' ? 'Terminal de Venta' : 'Historial de Transacciones'}
        </h2>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('pos')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'pos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>Nueva Venta</button>
          <button onClick={() => { setActiveTab('history_products'); setHistoryPage(1); }} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'history_products' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-blue-600'}`}>Historial Productos</button>
          <button onClick={() => { setActiveTab('history_services'); setHistoryPage(1); }} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'history_services' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-purple-600'}`}>Historial Servicios</button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-hidden relative">

        {/* MODE: POS */}
        {activeTab === 'pos' && (
          <div className="flex h-full flex-col md:flex-row">
            {/* LEFT: Item Selection */}
            <div className="flex-1 flex flex-col p-4 bg-slate-50 border-r border-slate-200">
              <div className="flex gap-4 mb-4">
                <button onClick={() => setPosMode('products')} className={`flex-1 py-3 rounded-2xl font-bold text-lg border-2 transition-all ${posMode === 'products' ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 text-slate-400 bg-white hover:border-red-200'}`}>📦 Productos</button>
                <button onClick={() => setPosMode('services')} className={`flex-1 py-3 rounded-2xl font-bold text-lg border-2 transition-all ${posMode === 'services' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-200 text-slate-400 bg-white hover:border-purple-200'}`}>✂️ Servicios</button>
              </div>

              <input
                className="w-full p-4 bg-white rounded-xl shadow-sm border border-slate-200 font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:outline-none mb-4"
                placeholder={posMode === 'products' ? "Buscar producto..." : "Buscar servicio..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
              />

              <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 content-start pb-20">
                {posItems.map(item => (
                  <button
                    key={item._id}
                    onClick={() => handleAddToCart(item)}
                    className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-lg border border-slate-100 hover:border-slate-300 transition-all text-left flex flex-col h-32 justify-between group"
                  >
                    <span className="font-bold text-slate-800 leading-tight line-clamp-2">{item.name}</span>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-slate-400 font-bold uppercase">{posMode === 'products' ? item.category : 'Svc'}</span>
                      <span className={`font-black px-2 py-1 rounded-lg text-sm ${posMode === 'products' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'}`}>
                        ₲ {item.price.toLocaleString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: Cart Panel */}
            <div className="w-full md:w-[400px] bg-white flex flex-col shadow-2xl z-20">
              <div className="p-6 bg-slate-900 text-white">
                <label className="text-xs uppercase font-bold text-slate-400 mb-1 block">Cliente</label>
                <Select
                  options={persons.filter(p => p.type === 'cliente').map(p => ({ value: p._id, label: p.name }))}
                  value={persons.find(p => p._id === moduleState.selectedPerson) ? { value: moduleState.selectedPerson, label: persons.find(p => p._id === moduleState.selectedPerson).name } : null}
                  onChange={val => setModuleState(prev => ({ ...prev, selectedPerson: val?.value }))}
                  placeholder="Seleccionar Cliente..."
                  className="text-slate-900"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                {saleDetails.length === 0 ? (
                  <div className="text-center text-slate-400 mt-10">
                    <div className="text-4xl mb-4 opacity-30">🛒</div>
                    <p className="font-bold">Carrito Vacío</p>
                  </div>
                ) : (
                  saleDetails.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl shadow-sm flex items-center border border-slate-100">
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-sm line-clamp-1">{item.isService && '✂️ '}{item.name}</div>
                        <div className="text-xs font-bold text-blue-600">₲ {item.price.toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateItemQty(idx, -1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-bold hover:bg-red-100 text-red-500">-</button>
                        <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                        <button onClick={() => updateItemQty(idx, 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-bold hover:bg-green-100 text-green-500">+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-slate-500 font-bold">Total a Pagar</span>
                  <span className="text-3xl font-black text-slate-800">₲ {total.toLocaleString()}</span>
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {['efectivo', 'tarjeta', 'mixto'].map(m => (
                    <button key={m} onClick={() => setModuleState(prev => ({ ...prev, paymentMethod: m }))}
                      className={`py-2 rounded-lg font-bold text-[10px] md:text-xs capitalize border ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                    >{m}</button>
                  ))}
                </div>

                {/* Payment Inputs */}
                {paymentMethod === 'efectivo' && (
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Monto Recibido</label>
                    <input
                      type="number"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                      placeholder="Ingrese monto..."
                      value={amountReceived}
                      onChange={e => setModuleState(prev => ({ ...prev, amountReceived: e.target.value }))}
                    />
                    {amountReceived && (parseFloat(amountReceived) - total) >= 0 && (
                      <div className="mt-2 text-right text-sm font-bold text-green-600">
                        Vuelto: ₲ {(parseFloat(amountReceived) - total).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'mixto' && (
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">Efectivo (₲)</label>
                      <input
                        type="number"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                        value={cashAmount}
                        onChange={e => setModuleState(prev => ({ ...prev, cashAmount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 mb-1 block">Tarjeta (₲)</label>
                      <input
                        type="number"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                        value={cardAmount}
                        onChange={e => setModuleState(prev => ({ ...prev, cardAmount: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleConfirmSale}
                  disabled={isProcessingSale}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50"
                >
                  {isProcessingSale ? 'PROCESANDO...' : 'COBRAR'}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* MODE: HISTORY LISTS */}
        {(activeTab === 'history_products' || activeTab === 'history_services') && (
          <div className="h-full flex flex-col p-6 overflow-hidden">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-5 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-2">Fecha</div>
                <div className="col-span-3">Cliente</div>
                <div className="col-span-3">Peluquero / Staff</div>
                <div className="col-span-2 text-right">Monto</div>
                <div className="col-span-2 text-right">Acciones</div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredHistory.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold">Sin historial registrado</div>
                ) : (
                  getPaginatedHistory().map(sale => (
                    <div key={sale._id} className="grid grid-cols-12 gap-4 p-5 items-center border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <div className="col-span-2 text-xs font-bold text-slate-500">
                        {new Date(sale.date).toLocaleDateString()}
                      </div>
                      <div className="col-span-3 font-bold text-slate-800 truncate">
                        {getPersonName(sale.personId)}
                      </div>
                      <div className="col-span-3 font-medium text-slate-600 truncate flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">💈</span>
                        {getUserName(sale.cashierId)}
                      </div>
                      <div className="col-span-2 text-right font-mono font-bold text-green-600">
                        ₲ {sale.total.toLocaleString()}
                      </div>
                      <div className="col-span-2 text-right opacity-50 hover:opacity-100">
                        {isAdmin && (
                          <button onClick={() => { setPendingDeleteId(sale._id); setShowAdminPasswordModal(true); }} className="text-red-500 font-bold text-xs bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100">
                            ELIMINAR
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Pág {historyPage} de {totalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-50" disabled={historyPage === 1}>Prev</button>
                    <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-50" disabled={historyPage === totalPages}>Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Modal */}
        {showAdminPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-80">
              <h3 className="text-lg font-black text-slate-800 mb-4 text-center">Confirmar Eliminar</h3>
              <input
                type="password"
                className="w-full p-3 bg-slate-50 rounded-xl mb-4 text-center font-bold"
                placeholder="Password Admin"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => setShowAdminPasswordModal(false)} className="flex-1 py-2 rounded-xl bg-slate-100 font-bold text-slate-600">Cancelar</button>
                <button onClick={handleDeleteSale} disabled={isDeleting} className="flex-1 py-2 rounded-xl bg-red-500 font-bold text-white shadow-lg shadow-red-200">Eliminar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SalesModule;
