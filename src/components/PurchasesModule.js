import React, { useState, useMemo, useEffect } from 'react';
import Select from 'react-select'; // Added Import
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { purchaseService, authService } from '../services/apiService';

const PurchasesModule = ({ persons, products, onAddPurchase, onEditPurchase, onDeletePurchase, purchases, moduleState, setModuleState, currentUser, users = [], branches = [], selectedBranch }) => {
  const { token } = useAuth();
  const { selectedPerson, selectedProduct, quantity, priceOverride, purchaseDetails } = moduleState;

  // --- States ---
  const [activeTab, setActiveTab] = useState('nuevo'); // 'nuevo' | 'historial'

  // Modals
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // { type: 'delete' | 'edit', id: ..., data: ... }
  const [isProcessing, setIsProcessing] = useState(false);

  // Pagination for History
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 8;

  const isAdmin = currentUser && currentUser.role === 'admin';

  // --- Filter Logic (Preserved) ---
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products; // Allow all products to be purchased regardless of branch (Global Catalog)
  }, [products]);

  const filteredPersons = useMemo(() => {
    if (!Array.isArray(persons)) return [];
    let result = persons.filter(p => p.type === 'proveedor');
    // Add branch filtering if needed per requirement, assuming simplified for now or match original
    return result;
  }, [persons]);

  const filteredPurchases = useMemo(() => {
    if (!Array.isArray(purchases)) return [];
    let result = purchases;
    // ... Implement branch filtering similar to original ...
    if (isAdmin && selectedBranch) {
      result = result.filter(p => {
        const bId = p.branchId?._id || p.branchId || p.branch?._id || p.branch;
        return String(bId) === String(selectedBranch);
      });
    } else if (!isAdmin && currentUser?.branchId) {
      result = result.filter(p => {
        const bId = p.branchId?._id || p.branchId || p.branch?._id || p.branch;
        return String(bId) === String(currentUser.branchId);
      });
    }
    return result;
  }, [purchases, currentUser, selectedBranch, isAdmin]);

  // --- Handlers ---
  const handleAddProduct = () => {
    const product = filteredProducts.find(p => p._id === selectedProduct);
    const price = parseFloat(priceOverride) || (product ? product.price : 0);
    const qty = parseInt(quantity);

    if (!product || !qty || qty <= 0 || !price || price <= 0) return alert('Datos inválidos');

    const newDetails = [...purchaseDetails];
    const exists = newDetails.find(item => item._id === product._id);

    if (exists) {
      exists.quantity += qty;
      exists.subtotal = exists.quantity * price;
    } else {
      newDetails.push({ ...product, quantity: qty, price, subtotal: qty * price });
    }
    setModuleState(prev => ({ ...prev, purchaseDetails: newDetails, selectedProduct: '', quantity: 1, priceOverride: '' }));
  };

  const handleRemoveItem = (id) => {
    setModuleState(prev => ({
      ...prev,
      purchaseDetails: prev.purchaseDetails.filter(i => i._id !== id)
    }));
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPerson || purchaseDetails.length === 0) return alert('Complete los datos');
    setIsProcessing(true);
    try {
      const total = purchaseDetails.reduce((a, b) => a + b.subtotal, 0);
      // ... construct payload ...
      const payload = {
        personId: selectedPerson,
        cashierId: currentUser._id || currentUser.id, // Corrected to cashierId as expected by backend
        branchId: isAdmin ? selectedBranch || purchaseDetails[0].branchId : currentUser.branchId,
        date: new Date().toISOString(),
        details: purchaseDetails.map(d => ({
          productId: d._id || d.productId,
          name: d.name,
          quantity: d.quantity,
          price: d.price,
          subtotal: d.subtotal
        })),
        total
      };
      await onAddPurchase(payload);
      setModuleState({ selectedPerson: '', purchaseDetails: [], selectedProduct: '', quantity: 1, priceOverride: '' });
      alert('Compra registrada');
    } catch (e) {
      alert('Error al registrar compra');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI Renderers ---
  const renderNewPurchase = () => (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
      {/* Left: Form */}
      <div className="p-8 md:w-1/2 space-y-6">
        <h3 className="text-2xl font-black text-slate-800 border-b pb-4">Nueva Adquisición</h3>

        <div>
          <label className="block text-sm font-bold text-slate-500 mb-1">PROVEEDOR</label>
          <select
            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border-none ring-1 ring-slate-200 focus:ring-blue-500"
            value={selectedPerson}
            onChange={e => setModuleState(prev => ({ ...prev, selectedPerson: e.target.value }))}
          >
            <option value="">Seleccione Proveedor...</option>
            {filteredPersons.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-slate-500 mb-1">PRODUCTO</label>
            <Select
              className="font-bold text-slate-700"
              styles={{
                control: (base) => ({
                  ...base,
                  borderRadius: '0.75rem',
                  borderColor: '#e2e8f0',
                  padding: '0.25rem'
                })
              }}
              value={selectedProduct ? {
                value: selectedProduct,
                label: (() => {
                  const p = filteredProducts.find(x => x._id === selectedProduct);
                  return p ? `${p.name} - ${p.category || 'Gral'} (${p.stock} u.)` : 'Seleccione...';
                })()
              } : null}
              onChange={opt => {
                if (!opt) return;
                const p = filteredProducts.find(x => x._id === opt.value);
                setModuleState(prev => ({
                  ...prev,
                  selectedProduct: opt.value,
                  priceOverride: p ? p.purchasePrice || '' : ''
                }));
              }}
              options={filteredProducts.map(p => ({
                value: p._id,
                label: `${p.name} - ${p.category || 'Gral'} (${p.stock} u.)`,
                original: p
              }))}
              placeholder="🔍 Buscar por nombre o categoría..."
              noOptionsMessage={() => "No se encontraron productos"}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">CANTIDAD</label>
            <input
              type="number"
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border-none ring-1 ring-slate-200 focus:ring-blue-500"
              value={quantity}
              onChange={e => setModuleState(prev => ({ ...prev, quantity: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-500 mb-1">COSTO (₲)</label>
            <input
              type="number"
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border-none ring-1 ring-slate-200 focus:ring-blue-500"
              value={priceOverride}
              onChange={e => setModuleState(prev => ({ ...prev, priceOverride: e.target.value }))}
            />
          </div>
        </div>

        <button
          onClick={handleAddProduct}
          className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:scale-[1.02] transition-transform"
        >
          + AGREGAR ITEM
        </button>
      </div>

      {/* Right: Summary */}
      <div className="bg-slate-50 p-8 md:w-1/2 flex flex-col border-l border-slate-100">
        <h4 className="text-xl font-black text-slate-400 mb-4 uppercase">Resumen de Orden</h4>

        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
          {purchaseDetails.length === 0 ? (
            <div className="text-center text-slate-300 py-10">Sin items agregados</div>
          ) : (
            purchaseDetails.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center group">
                <div>
                  <div className="font-bold text-slate-700">{item.name}</div>
                  <div className="text-xs text-slate-400 font-bold">{item.quantity} x ₲ {item.price}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-slate-800">₲ {item.subtotal.toLocaleString()}</span>
                  <button
                    onClick={() => handleRemoveItem(item._id)}
                    className="text-red-300 hover:text-red-500 transition-colors"
                  >✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-end mb-4">
            <span className="text-sm font-bold text-slate-400">TOTAL ESTIMADO</span>
            <span className="text-3xl font-black text-blue-600">
              ₲ {purchaseDetails.reduce((a, b) => a + b.subtotal, 0).toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleConfirmPurchase}
            disabled={isProcessing || purchaseDetails.length === 0}
            className="w-full py-4 bg-green-500 text-white font-black rounded-xl shadow-lg shadow-green-200 hover:bg-green-600 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
          >
            {isProcessing ? 'PROCESANDO...' : 'CONFIRMAR COMPRA'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => {
    const start = (historyPage - 1) * itemsPerPage;
    const paginated = filteredPurchases.slice(start, start + itemsPerPage);
    const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map(purchase => (
            <div key={purchase._id} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-lg border border-slate-100 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Proveedor</span>
                  <h4 className="font-bold text-slate-800 text-lg">
                    {typeof purchase.personId === 'object' ? purchase.personId?.name : 'Proveedor'}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black block mb-1">
                    {new Date(purchase.date).toLocaleDateString()}
                  </span>
                  {/* Debug/Info purpose: show branch name if available could be useful, but keeping minimal */}
                </div>
              </div>

              <div className="space-y-2 mb-6 border-t border-b border-slate-50 py-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Detalle de Compra</div>
                {purchase.details && purchase.details.length > 0 ? (
                  <ul className="space-y-1">
                    {purchase.details.map((d, i) => (
                      <li key={i} className="flex justify-between text-sm text-slate-600">
                        <span className="truncate pr-2">• {d.name}</span>
                        <span className="font-bold whitespace-nowrap">x{d.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-slate-400 italic">Sin detalles</span>
                )}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold">Total Pagado</span>
                <span className="font-black text-green-600 text-lg">₲ {purchase.total.toLocaleString()}</span>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-50 flex gap-2 opacity-10 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    if (window.confirm('Eliminar compra?')) {
                      // trigger admin auth
                      console.log('Delete trigger');
                    }
                  }}
                  className="flex-1 py-2 bg-red-50 text-red-500 rounded-xl font-bold text-xs hover:bg-red-100"
                >
                  ELIMINAR
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-8">
            <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white rounded-full shadow-sm font-bold text-slate-600">←</button>
            <span className="px-4 py-2 font-black text-slate-400">Pág {historyPage}</span>
            <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} className="px-4 py-2 bg-white rounded-full shadow-sm font-bold text-slate-600">→</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-50 -z-10"></div>
      <div
        className="absolute top-0 right-0 w-1/3 h-full opacity-5 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(135deg, #000 25%, transparent 25%), linear-gradient(225deg, #000 25%, transparent 25%), linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(315deg, #000 25%, transparent 25%)', backgroundSize: '20px 20px' }}
      ></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            Compras <span className="text-yellow-500">&</span> Abastecimiento
          </h2>
          <p className="text-slate-400 font-medium">Gestione su inventario de manera eficiente.</p>
        </div>

        {/* Tabs */}
        <div className="bg-white p-1 rounded-2xl shadow-sm inline-flex mt-4 md:mt-0">
          <button
            onClick={() => setActiveTab('nuevo')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'nuevo' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            + Nueva Compra
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'historial' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Historial
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 pb-20">
        {activeTab === 'nuevo' ? renderNewPurchase() : renderHistory()}
      </div>

    </div>
  );
};

export default PurchasesModule;