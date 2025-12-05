import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { defectiveProductService } from '../services/apiService';

const DefectiveProductsModule = ({ products, persons, users = [], branches = [], selectedBranch, onAddDefectiveProduct, onReloadDefectiveProducts, currentUser = null, onDeleteDefectiveProduct }) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [defectiveProductsList, setDefectiveProductsList] = useState([]); // Para mostrar los agregados en la sesión
  const [isReloading, setIsReloading] = useState(false);
  const [defectiveProductsHistory, setDefectiveProductsHistory] = useState([]); // Historial desde la BD
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState(products); // Productos filtrados por sucursal
  const [filteredSuppliers, setFilteredSuppliers] = useState([]); // Proveedores filtrados por sucursal

  // Estados para eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Validaciones iniciales
  if (!Array.isArray(products) || !Array.isArray(persons) || !currentUser || (!currentUser._id && !currentUser.id)) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-4xl mx-auto my-8">
        <div className="text-center py-10">
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-6 max-w-md mx-auto">
            <div className="text-yellow-800 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Acceso requerido</h3>
            <p className="text-yellow-700 text-sm">
              Para acceder a productos defectuosos, necesitas estar logueado correctamente.
              <br />
              <strong>Por favor, inicia sesión nuevamente.</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const userId = currentUser._id || currentUser.id;
  const { token } = useAuth();

  // Función para cargar el historial de productos defectuosos
  const loadDefectiveProductsHistory = async () => {
    if (!currentUser) return;

    setIsLoadingHistory(true);
    try {
      const params = (currentUser.role === 'admin' && selectedBranch) ? { branchId: selectedBranch } : {};
      const data = await defectiveProductService.getAll(token, currentUser, params);
      setDefectiveProductsHistory(Array.isArray(data) ? data : []);
      const suffix = params.branchId ? ` para sucursal ${params.branchId}` : ' (todas las sucursales)';
      console.log(`✅ ${Array.isArray(data) ? data.length : 0} productos defectuosos cargados${suffix}`);
    } catch (error) {
      console.error('Error cargando historial de productos defectuosos:', error.message);
      setDefectiveProductsHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Cargar historial cuando el componente se monte o cambie el usuario o la sucursal seleccionada
  useEffect(() => {
    if (currentUser && userId) {
      loadDefectiveProductsHistory();
    }
  }, [currentUser, userId, selectedBranch, users, token]);


  // Resetear selecciones cuando cambie la sucursal seleccionada
  useEffect(() => {
    setSelectedProduct('');
    setSelectedSupplier('');
  }, [selectedBranch]);

  // Filtrar productos y proveedores cuando cambie la sucursal seleccionada (solo para admins)
  useEffect(() => {
    const filterDataByBranch = () => {
      if (currentUser?.role === 'admin' && selectedBranch) {
        // Para admins con sucursal, los datos ya están filtrados por App.js via loadDataFromAPI(branchId)
        // Solo actualizar localmente si es necesario
        setFilteredProducts(products.filter(p => p.stockBySucursal && (p.stockBySucursal[selectedBranch] || 0) > 0));
        setFilteredSuppliers(persons.filter(p => p.type === 'proveedor' && p.branchIds && p.branchIds.includes(selectedBranch)));
      } else if (currentUser?.role === 'cashier') {
        // Para cajeros, filtrar productos por stock en su sucursal
        const cashierFiltered = products.filter(product => {
          let branchStock = 0;
          if (product.stockBySucursal) {
            if (typeof product.stockBySucursal.get === 'function') {
              branchStock = product.stockBySucursal.get(currentUser.branchId) || 0;
            } else {
              branchStock = product.stockBySucursal[currentUser.branchId] || 0;
            }
          }
          return branchStock >= 0;
        });
        setFilteredProducts(cashierFiltered);
        // Proveedores para cajero: de su sucursal
        setFilteredSuppliers(persons.filter(p => p.type === 'proveedor' && p.branchIds && p.branchIds.includes(currentUser.branchId)));
      } else {
        // Para admins sin sucursal, mostrar todos
        setFilteredProducts(products);
        setFilteredSuppliers(persons.filter(p => p.type === 'proveedor'));
      }
    };

    filterDataByBranch();
  }, [selectedBranch, products, persons, currentUser]);

  // No se necesita loadSuppliersForBranch - proveedores se filtran de persons

  // El filtrado de proveedores se maneja en el useEffect de filterDataByBranch arriba

  // Función helper para extraer ID de objetos poblados
  const getIdFromPopulatedField = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field._id) return field._id;
    return String(field);
  };

  const getProductName = (product) => {
    // Verificar si el producto es null o undefined
    if (!product) return 'Producto no encontrado';

    // Si es un objeto poblado
    if (typeof product === 'object' && product.name) {
      return product.name;
    }
    // Si es solo un ID, buscar en el array local
    const productId = getIdFromPopulatedField(product);
    if (Array.isArray(products)) {
      const foundProduct = products.find(p => p._id === productId);
      return foundProduct ? foundProduct.name : 'Producto no encontrado';
    }
    return 'Producto no encontrado';
  };

  const getPersonName = (person) => {
    if (!person) return 'Sin proveedor';

    // Si es un objeto poblado
    if (typeof person === 'object' && person.name) {
      return person.name;
    }

    // Si es solo un ID, buscar en el array local
    const personId = getIdFromPopulatedField(person);
    const foundPerson = persons.find(p => p._id === personId);
    return foundPerson ? foundPerson.name : 'Proveedor no encontrado';
  };

  const getBranchName = (branch) => {
    if (!branch) return 'Sin sucursal';

    // Si es un objeto poblado
    if (typeof branch === 'object' && branch.name) {
      return branch.name;
    }

    return 'Sucursal no encontrada';
  };

  const getReporterName = (reporter) => {
    if (!reporter) return 'Sin reportador';

    // Si es un objeto poblado
    if (typeof reporter === 'object' && reporter.name) {
      return `${reporter.name} (${reporter.role === 'admin' ? 'Admin' : 'Cajero'})`;
    }

    // Si es solo un ID, buscar en el array local de usuarios
    const reporterId = getIdFromPopulatedField(reporter);

    if (Array.isArray(users) && users.length > 0) {
      const foundUser = users.find(u => u._id === reporterId);
      if (foundUser) {
        return `${foundUser.name} (${foundUser.role === 'admin' ? 'Admin' : 'Cajero'})`;
      }
    }

    return `ID: ${reporterId}`;
  };

  const handleAddDefective = async () => {
    // Validación para admins: requieren selección de sucursal
    if (currentUser?.role === 'admin' && !selectedBranch) {
      alert('Como administrador, debes seleccionar una sucursal en el header antes de registrar un producto defectuoso.');
      return;
    }

    if (!selectedProduct || !selectedSupplier || quantity <= 0 || !description) {
      alert('Por favor, completa todos los campos: producto, proveedor, cantidad y descripción.');
      return;
    }

    // Usar la misma validación que arriba
    const userId = currentUser?._id || currentUser?.id;

    // Validar que el usuario esté completamente logueado
    if (!currentUser) {
      alert('Error: Usuario no logueado. Inicia sesión nuevamente.');
      return;
    }

    if (!userId) {
      alert('Error: ID de usuario no disponible. Inicia sesión nuevamente.');
      return;
    }

    const newDefective = {
      productId: selectedProduct,
      supplierId: selectedSupplier,
      quantity: parseInt(quantity, 10),
      description,
      // branchId y reportedBy serán determinados por el backend basado en el usuario autenticado
      defectType: 'otro',
      severity: 'medio'
    };

    // Para admin, enviar la sucursal seleccionada
    if (currentUser.role === 'admin') {
      newDefective.branchId = selectedBranch;
    }

    // Crear un ID temporal para mostrar en la lista local
    const tempDefective = {
      ...newDefective,
      _id: `temp-${Date.now()}`, // Solo para mostrar en la lista local
      dateReported: new Date().toISOString() // Formato completo para mostrar
    };

    setDefectiveProductsList([...defectiveProductsList, tempDefective]);
    onAddDefectiveProduct(newDefective); // Llama a la función en App.js para guardar en BD

    // Recargar el historial desde la base de datos
    await loadDefectiveProductsHistory();

    // Limpiar formulario
    setSelectedProduct('');
    setSelectedSupplier('');
    setQuantity(1);
    setDescription('');
    alert('Producto defectuoso registrado con éxito!');
  };

  const handleReloadData = async () => {
    setIsReloading(true);
    try {
      await loadDefectiveProductsHistory();
    } catch (error) {
      console.error('Error recargando productos defectuosos:', error.message);
      alert('Error al recargar los datos. Inténtalo nuevamente.');
    } finally {
      setIsReloading(false);
    }
  };

  const handleDeleteDefective = (item) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto defectuoso? Esta acción no se puede deshacer.')) {
      setItemToDelete(item);
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePassword.trim()) {
      alert('Por favor, ingresa la contraseña del administrador.');
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteDefectiveProduct(itemToDelete._id, deletePassword);
      setShowDeleteModal(false);
      setDeletePassword('');
      setItemToDelete(null);
      alert('Producto defectuoso eliminado exitosamente.');
      // Recargar la lista
      await loadDefectiveProductsHistory();
    } catch (error) {
      console.error('Error eliminando producto defectuoso:', error);
      alert('Error al eliminar el producto defectuoso. Verifica la contraseña del administrador.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setItemToDelete(null);
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-4xl mx-auto my-8">
      <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Productos Defectuosos</h2>

      {/* Mostrar información de la sucursal actual */}
      {currentUser && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📍 Sucursal Actual
          </h3>
          <p className="text-blue-700">
            {currentUser.role === 'admin' ? (
              selectedBranch ?
                `Mostrando datos de: ${branches.find(b => b._id === selectedBranch)?.name || 'Sucursal seleccionada'}` :
                'Selecciona una sucursal en el header para ver proveedores y productos'
            ) : (
              `Sucursal asignada: ${branches.find(b => b._id === currentUser.branchId)?.name || 'Sucursal del cajero'}`
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label htmlFor="product" className="block text-gray-700 text-lg font-medium mb-2">
            Producto Defectuoso:
          </label>
          <select
            id="product"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition duration-200 text-lg bg-white"
          >
            <option value="">
              {currentUser?.role === 'admin' && !selectedBranch
                ? "Primero selecciona una sucursal en el header"
                : "Selecciona un producto"
              }
            </option>
            {filteredProducts.map(product => (
              <option key={product._id} value={product._id}>{product.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="supplier" className="block text-gray-700 text-lg font-medium mb-2">
            Proveedor:
          </label>
          <select
            id="supplier"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition duration-200 text-lg bg-white"
          >
            <option value="">
              {filteredSuppliers.length === 0 ? (currentUser?.role === 'admin' && !selectedBranch ? "Selecciona una sucursal para ver proveedores" : "No hay proveedores disponibles") : "Selecciona un proveedor"}
            </option>
            {filteredSuppliers.map(supplier => (
              <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
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
            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            min="1"
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition duration-200 text-lg"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-gray-700 text-lg font-medium mb-2">
            Descripción del Defecto:
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition duration-200 text-lg resize-none"
            placeholder="Describe el problema con el producto..."
          ></textarea>
        </div>
        <div className="md:col-span-2">
          <button
            onClick={handleAddDefective}
            className="w-full px-8 py-4 bg-orange-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-orange-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300"
          >
            Registrar Producto Defectuoso
          </button>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-3xl font-bold text-gray-800">Historial de Productos Defectuosos</h3>
            <p className="text-sm text-gray-600 mt-1">
              {currentUser?.role === 'admin'
                ? `Mostrando productos defectuosos ${selectedBranch ? `de ${branches.find(b => b._id === selectedBranch)?.name || 'sucursal seleccionada'}` : 'de todas las sucursales'} (${defectiveProductsHistory.length})`
                : `Mostrando productos defectuosos de tu sucursal (${defectiveProductsHistory.length})`
              }
            </p>
          </div>
          <button
            onClick={handleReloadData}
            disabled={isReloading}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isReloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Cargando...
              </>
            ) : (
              <>
                🔄 Recargar
              </>
            )}
          </button>
        </div>

        {isLoadingHistory ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-xl">Cargando historial de productos defectuosos...</p>
          </div>
        ) : defectiveProductsHistory.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-600 text-xl">No hay productos defectuosos registrados.</p>
            <p className="text-gray-500 text-sm mt-2">
              {currentUser?.role === 'admin'
                ? selectedBranch
                  ? `No hay productos defectuosos reportados en ${branches.find(b => b._id === selectedBranch)?.name || 'la sucursal seleccionada'}.`
                  : 'Selecciona una sucursal para ver los productos defectuosos, o aparecerán aquí cuando sean reportados en cualquier sucursal.'
                : 'Los productos defectuosos de tu sucursal aparecerán aquí cuando sean reportados.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl overflow-hidden">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Producto</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Proveedor</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Cantidad</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Descripción</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Estado</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Reportado Por</th>
                  {currentUser?.role === 'admin' && (
                    <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Sucursal</th>
                  )}
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Fecha Reporte</th>
                  <th className="py-4 px-6 text-center text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {defectiveProductsHistory.map((item) => (
                  <tr key={item._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6 text-lg text-gray-800">{getProductName(item.productId)}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">{getPersonName(item.supplierId)}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">{item.quantity}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">{item.description}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'reportado' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'reemplazado' ? 'bg-green-100 text-green-800' :
                        item.status === 'rechazado' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-lg text-gray-800">{getReporterName(item.reportedBy)}</td>
                    {currentUser?.role === 'admin' && (
                      <td className="py-4 px-6 text-lg text-gray-800">{getBranchName(item.branchId)}</td>
                    )}
                    <td className="py-4 px-6 text-lg text-gray-800">
                      {new Date(item.dateReported).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDeleteDefective(item)}
                        className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all duration-200 transform hover:scale-110"
                        title="Eliminar producto defectuoso"
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
        )}

        {/* Mostrar productos agregados en esta sesión si los hay */}
        {defectiveProductsList.length > 0 && (
          <div className="mt-8">
            <h4 className="text-2xl font-bold text-gray-800 mb-4">Productos Agregados en Esta Sesión</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-blue-50 rounded-xl overflow-hidden">
                <thead className="bg-blue-100 border-b-2 border-blue-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-700">Producto</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-700">Proveedor</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-700">Cantidad</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-700">Descripción</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-700">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {defectiveProductsList.map((item) => (
                    <tr key={item._id} className="border-b border-blue-100 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-blue-800">{getProductName(item.productId)}</td>
                      <td className="py-3 px-4 text-sm text-blue-800">{getPersonName(item.supplierId)}</td>
                      <td className="py-3 px-4 text-sm text-blue-800">{item.quantity}</td>
                      <td className="py-3 px-4 text-sm text-blue-800">{item.description}</td>
                      <td className="py-3 px-4 text-sm text-blue-800">{item.dateReported}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              Para eliminar este producto defectuoso, ingresa la contraseña del administrador:
            </p>
            <div className="mb-6">
              <label htmlFor="deletePassword" className="block text-gray-700 text-sm font-medium mb-2">
                Contraseña del Administrador:
              </label>
              <input
                type="password"
                id="deletePassword"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
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
                onClick={handleConfirmDelete}
                disabled={isDeleting || !deletePassword.trim()}
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

export default DefectiveProductsModule;