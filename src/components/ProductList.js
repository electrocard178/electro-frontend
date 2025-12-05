import React, { useState, useEffect } from 'react';

const ProductList = ({ products, onEdit, onDelete, onAdd, branches = [], currentUser = null, selectedBranch = null }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el modal de contraseña de admin
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Mostrar 10 productos por página

  const formatGuarani = (amount) => {
    return `₲ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Validar que products sea un array
  if (!Array.isArray(products)) {
    console.log('ProductList: products no es un array:', products);
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-7xl mx-auto my-8">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Cargando productos...</p>
        </div>
      </div>
    );
  }

  console.log('ProductList: Renderizando con', products.length, 'productos');
  console.log('ProductList: Products array:', products);
  console.log('ProductList: First product sample:', products[0]);

  // useEffect para forzar re-renderizado cuando cambian los productos
  useEffect(() => {
    console.log('ProductList: useEffect - productos cambiaron, forzando re-renderizado');
    console.log('ProductList: Nuevos productos:', products?.length || 0);
    if (products && products.length > 0) {
      console.log('ProductList: Primer producto:', products[0]);
    }
  }, [products]);

  // Función helper para extraer ID de objetos poblados
  const getIdFromPopulatedField = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field._id) return field._id;
    return String(field);
  };

  const isAdmin = currentUser && currentUser.role === 'admin';

  // Filtrar productos por búsqueda y por sucursal para cajeros y admin con selección de sucursal
  const filteredProducts = React.useMemo(() => {
    console.log('ProductList: Filtrando productos - searchTerm:', searchTerm, 'products length:', products?.length || 0, 'selectedBranch:', selectedBranch);
    if (!Array.isArray(products)) {
      console.log('ProductList: products no es array:', products);
      return [];
    }

    let result = products;

    // Para cajeros: filtrar productos que tengan stock > 0 en su sucursal
    if (!isAdmin && currentUser && currentUser.branchId) {
      console.log('ProductList: Filtrando para cajero - branchId:', currentUser.branchId);
      result = result.filter(product => {
        const stockInBranch = product.stockBySucursal?.[currentUser.branchId] || 0;
        console.log('ProductList: Producto', product.name, '- Stock en sucursal:', stockInBranch);
        return stockInBranch > 0;
      });
      console.log('ProductList: Productos después de filtro cajero:', result.length);
    }

    // Para admin: si seleccionó una sucursal específica, mostrar productos relacionados a esa sucursal
    if (isAdmin && selectedBranch) {
      console.log('ProductList: Filtrando para admin por selectedBranch -', selectedBranch);
      result = result.filter(product => {
        const stock = product.stockBySucursal?.[selectedBranch] || 0;
        const productBranchId = product.branchId || (product.branch && product.branch._id);
        // Mostrar producto si tiene stock en la sucursal seleccionada o si su branchId coincide
        return stock > 0 || String(productBranchId) === String(selectedBranch);
      });
      console.log('ProductList: Productos después de filtro admin por sucursal:', result.length);
    }

    // Aplicar filtro de búsqueda (siempre)
    const term = (searchTerm || '').toLowerCase();
    result = result.filter(product => {
      const name = (product.name || '').toLowerCase();
      const category = (product.category || '').toLowerCase();
      return name.includes(term) || category.includes(term);
    });

    console.log('ProductList: Productos finales después de búsqueda:', result.length);
    return result;
  }, [products, searchTerm, isAdmin, currentUser, selectedBranch]);

  const getBranchName = (branchId) => {
  const branch = branches.find(b => b._id === branchId);
    return branch ? branch.name : 'Sucursal no encontrada';
  };

  // Función para obtener productos paginados
  const getPaginatedProducts = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBranch]);

  const handleConfirmDeleteWithPassword = async () => {
    // DEBUG: Log antes de llamar onDelete
    console.log('🔍 DEBUG ProductList handleConfirmDelete - pendingDeleteId:', pendingDeleteId, 'typeof:', typeof pendingDeleteId, 'es truthy:', !!pendingDeleteId, 'adminPassword:', adminPassword.trim().length > 0);
    if (!adminPassword.trim()) {
      alert('Por favor, ingresa la contraseña del administrador.');
      return;
    }
    if (!pendingDeleteId) {
      alert('Error: ID del producto perdido. Recarga la página e inténtalo de nuevo.');
      setShowAdminPasswordModal(false);
      setPendingDeleteId(null);
      return;
    }
  
    setIsDeleting(true);
    try {
      await onDelete(pendingDeleteId, adminPassword);
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      setPendingDeleteId(null);
      alert('Producto eliminado exitosamente.');
    } catch (error) {
      console.error('Error eliminando producto:', error);
      alert('Error al eliminar el producto. Verifica la contraseña del administrador.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowAdminPasswordModal(false);
    setAdminPassword('');
    setPendingDeleteId(null);
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-7xl mx-auto my-8">
      <div className="flex justify-between items-center mb-8">
         <div>
           <h2 className="text-4xl font-extrabold text-gray-800">Productos</h2>
           {searchTerm && (
             <div className="mt-2 text-sm text-gray-600">
               <span className="font-medium">Filtro aplicado:</span>
               <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">"{searchTerm}"</span>
             </div>
           )}
         </div>
         {isAdmin && (
           <button
             onClick={onAdd}
             className="px-7 py-3 bg-purple-600 text-white font-semibold rounded-xl shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
           >
             Agregar Producto
           </button>
         )}
       </div>

      {!isAdmin && currentUser && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <p className="text-purple-800 font-medium">
            Mostrando productos de: <span className="font-bold">{getBranchName(currentUser.branchId)}</span>
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            📊 Estado de Inventario por Sucursal
            {searchTerm && (
              <span className="text-sm font-normal text-blue-600 ml-2">
                (filtrado por: "{searchTerm}")
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branches.map(branch => {
              const branchId = getIdFromPopulatedField(branch);
              const totalStock = filteredProducts.reduce((sum, product) => {
                return sum + (product.stockBySucursal?.[branchId] || 0);
              }, 0);
              const productsInBranch = filteredProducts.filter(product =>
                (product.stockBySucursal?.[branchId] || 0) > 0
              );
              const lowStockProducts = productsInBranch.filter(product =>
                (product.stockBySucursal?.[branchId] || 0) <= 5
              ).length;
              const outOfStockProducts = productsInBranch.filter(product =>
                (product.stockBySucursal?.[branchId] || 0) === 0
              ).length;

              return (
                <div key={branchId} className={`bg-white p-3 rounded-lg shadow-sm border ${
                  totalStock === 0 ? 'border-gray-300 bg-gray-50' :
                  outOfStockProducts > 0 ? 'border-red-300 bg-red-50' :
                  lowStockProducts > 0 ? 'border-yellow-300 bg-yellow-50' :
                  'border-green-300 bg-green-50'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-800">{branch.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      totalStock === 0 ? 'bg-gray-100 text-gray-800' :
                      totalStock > 50 ? 'bg-green-100 text-green-800' :
                      totalStock > 20 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {totalStock}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {totalStock === 0 ? (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Sin productos disponibles</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Productos:</span> {productsInBranch.length}
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Stock bajo (≤5):</span> {lowStockProducts}
                        </div>
                        {outOfStockProducts > 0 && (
                          <div className="text-xs text-red-600 font-medium">
                            ⚠️ Sin stock: {outOfStockProducts}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isAdmin && currentUser && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            📦 Productos Disponibles
          </h3>
          <div className="text-sm text-green-700">
            Mostrando productos disponibles en tu sucursal: <strong>{getBranchName(currentUser.branchId)}</strong>
          </div>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">
            Buscar producto:
            {searchTerm && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                "{searchTerm}"
              </span>
            )}
          </label>
          <input
            type="text"
            placeholder="Buscar producto por nombre o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200 text-lg"
          />
        </div>

        {isAdmin && (
          <div className="flex items-end">
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              disabled={!searchTerm}
            >
              Limpiar Búsqueda {searchTerm && `("${searchTerm}")`}
            </button>
          </div>
        )}

        {!isAdmin && currentUser && (
          <div className="flex items-end">
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              disabled={!searchTerm}
            >
              Limpiar Búsqueda {searchTerm && `("${searchTerm}")`}
            </button>
          </div>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <p className="text-center text-gray-600 text-xl py-10">No hay productos que coincidan con tu búsqueda. ¡Es hora de agregar algunos!</p>
      ) : (
        <div>
          {/* Estadísticas del inventario filtrado - Solo para admin */}
          {isAdmin && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <h3 className="text-lg font-semibold text-green-800 mb-3">📈 Estadísticas del Inventario</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{filteredProducts.length}</div>
                  <div className="text-sm text-green-700">Productos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredProducts.reduce((sum, product) => sum + product.stock, 0)}
                  </div>
                  <div className="text-sm text-blue-700">Stock Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatGuarani(filteredProducts.reduce((sum, product) => sum + (product.price * product.stock), 0))}
                  </div>
                  <div className="text-sm text-purple-700">Valor Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredProducts.filter(product => product.stock <= 5).length}
                  </div>
                  <div className="text-sm text-orange-700">Stock Bajo</div>
                </div>
              </div>
            </div>
          )}

          {/* Estadísticas simples para cajeros */}
          {!isAdmin && currentUser && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">📦 Resumen de Productos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{filteredProducts.length}</div>
                  <div className="text-sm text-blue-700">Productos Disponibles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredProducts.reduce((sum, product) => sum + product.stock, 0)}
                  </div>
                  <div className="text-sm text-green-700">Unidades Totales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredProducts.filter(product => product.stock <= 5).length}
                  </div>
                  <div className="text-sm text-orange-700">Stock Bajo</div>
                </div>
              </div>
            </div>
          )}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-xl overflow-hidden">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Nombre</th>
                <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Categoría</th>
                <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Precio</th>
                <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Stock</th>
                {isAdmin && (
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Disponible en</th>
                )}
                <th className="py-4 px-6 text-center text-lg font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {getPaginatedProducts().map((product) => (
                <tr key={product._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                  <td className="py-4 px-6 text-lg text-gray-800">{product.name}</td>
                  <td className="py-4 px-6 text-lg text-gray-800 capitalize">{product.category}</td>
                  <td className="py-4 px-6 text-lg text-gray-800">{formatGuarani(product.price)}</td>
                  <td className="py-4 px-6 text-lg text-gray-800 font-semibold">{product.stock}</td>
                  {isAdmin && (
                    <td className="py-4 px-6 text-sm text-gray-800">
                      <div className="space-y-2">
                        {branches
                          .filter(branch => {
                            const branchId = getIdFromPopulatedField(branch);
                            const stock = product.stockBySucursal?.[branchId] || 0;
                            return stock > 0; // Solo mostrar sucursales con stock
                          })
                          .map(branch => {
                            const branchId = getIdFromPopulatedField(branch);
                            const stock = product.stockBySucursal?.[branchId] || 0;
                            return (
                              <div key={branchId} className="flex justify-between items-center bg-green-50 p-2 rounded-lg border border-green-200">
                                <span className="text-gray-700 font-medium">{branch.name}:</span>
                                <span className={`font-bold px-2 py-1 rounded-full text-xs ${
                                  stock > 10 ? 'bg-green-100 text-green-800' :
                                  stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {stock}
                                </span>
                              </div>
                            );
                          })}
                        {branches.filter(branch => {
                          const branchId = getIdFromPopulatedField(branch);
                          const stock = product.stockBySucursal?.[branchId] || 0;
                          return stock > 0;
                        }).length === 0 && (
                          <div className="text-center text-gray-500 italic py-2">
                            Producto no disponible en ninguna sucursal
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-6 flex justify-center space-x-3">
                    {isAdmin && (
                      <button
                        onClick={() => onEdit(product)}
                        className="p-3 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        // DEBUG: Log detallado del ID del producto antes de setPendingDeleteId
                        console.log('🔍 DEBUG ProductList onClick delete - product._id:', product._id, 'typeof:', typeof product._id, 'product completo:', product);
                        if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                          const deleteId = product._id || product.id; // Fallback si es 'id' en lugar de '_id'
                          console.log('🔍 DEBUG - ID a setear:', deleteId, 'es truthy:', !!deleteId);
                          setPendingDeleteId(deleteId);
                          setShowAdminPasswordModal(true);
                        }
                      }}
                      className="p-3 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-300"
                      title="Eliminar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
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
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-purple-600 text-white'
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
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-purple-600 text-white'
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
            Mostrando {getPaginatedProducts().length} de {filteredProducts.length} productos
            {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
          </div>
        </div>
      )}

      {/* Modal de contraseña de administrador */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              Para eliminar este producto, ingresa la contraseña del administrador:
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
    </div>
  );
};

export default ProductList;
