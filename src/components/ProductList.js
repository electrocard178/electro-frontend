import React, { useState, useMemo, useEffect } from 'react';

const ProductList = ({ products, onEdit, onDelete, onAdd, branches = [], currentUser = null, selectedBranch = null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Per user request for lists

  // Auth/Modal States
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser && currentUser.role === 'admin';
  const formatGuarani = (amount) => `₲ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 0 })}`;

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    let result = products;

    if (!isAdmin && currentUser && currentUser.branchId) {
      result = result.filter(product => (product.stockBySucursal?.[currentUser.branchId] || 0) > 0);
    }
    if (isAdmin && selectedBranch) {
      result = result.filter(product => {
        const stock = product.stockBySucursal?.[selectedBranch] || 0;
        const productBranchId = product.branchId || (product.branch && product.branch._id);
        return stock > 0 || String(productBranchId) === String(selectedBranch);
        // Relaxed filter for admin visibility
      });
    }

    const term = (searchTerm || '').toLowerCase();
    result = result.filter(product =>
      (product.name || '').toLowerCase().includes(term) ||
      (product.category || '').toLowerCase().includes(term)
    );

    return result;
  }, [products, searchTerm, isAdmin, currentUser, selectedBranch]);

  const getPaginatedProducts = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  };
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedBranch]);

  const handleConfirmDelete = async () => {
    if (!adminPassword.trim()) return alert('Ingrese contraseña.');
    setIsDeleting(true);
    try {
      await onDelete(pendingDeleteId, adminPassword);
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      alert('Eliminado.');
    } catch (e) {
      alert('Error eliminando.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-slate-50 relative">
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-40 pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 z-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            Inventario <span className="text-red-600">Global</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {filteredProducts.length} productos registrados
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            className="flex-1 md:w-64 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {isAdmin && (
            <button
              onClick={onAdd}
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              + Agregar
            </button>
          )}
        </div>
      </div>

      {/* Modern Table List */}
      <div className="flex-1 overflow-hidden z-10 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 p-5 bg-slate-100 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-widest">
          <div className="col-span-4 md:col-span-4">Producto</div>
          <div className="hidden md:block md:col-span-2 text-center">Categoría</div>
          <div className="col-span-3 md:col-span-2 text-right">Precio</div>
          <div className="col-span-3 md:col-span-2 text-center">Stock</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <span className="text-5xl mb-2">📦</span>
              <span className="font-bold">Inventario vacío</span>
            </div>
          ) : (
            getPaginatedProducts().map(product => {
              const isLowStock = product.stock <= 5;
              const isOut = product.stock === 0;

              return (
                <div key={product._id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none group">
                  {/* Product Info */}
                  <div className="col-span-4 md:col-span-4">
                    <div className="font-bold text-slate-800 text-sm md:text-base truncate" title={product.name}>{product.name}</div>
                    {isOut && <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full inline-block mt-1">AGOTADO</span>}
                  </div>

                  {/* Category */}
                  <div className="hidden md:block md:col-span-2 text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-lg">
                      {product.category || 'Gral'}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="col-span-3 md:col-span-2 text-right font-mono font-bold text-blue-600">
                    {formatGuarani(product.price)}
                  </div>

                  {/* Stock Visual */}
                  <div className="col-span-3 md:col-span-2 px-2">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-black ${isOut ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-green-600'}`}>
                        {product.stock}
                      </span>
                      {/* Mini Bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isOut ? 'bg-red-500' : isLowStock ? 'bg-orange-400' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, (product.stock / 20) * 100)}%` }} // Assumes 20 is "full bar" visual cap
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    {isAdmin && (
                      <button onClick={() => onEdit(product)} className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 flex items-center justify-center transition-colors">✎</button>
                    )}
                    <button
                      onClick={() => {
                        setPendingDeleteId(product._id || product.id);
                        setShowAdminPasswordModal(true);
                      }}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                    >✕</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50 text-sm font-bold hover:bg-slate-100"
              >anterior</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50 text-sm font-bold hover:bg-slate-100"
              >siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Auth Modal */}
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
              <button onClick={handleConfirmDelete} disabled={isDeleting} className="flex-1 py-2 rounded-xl bg-red-500 font-bold text-white shadow-lg shadow-red-200">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
