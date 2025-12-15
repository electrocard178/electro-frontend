import React, { useState, useEffect } from 'react';
import { productCategoryService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

const ProductForm = ({ product = {}, onSave, onCancel, branches = [], currentUser = null }) => {
  const { token } = useAuth();
  const [name, setName] = useState(product.name || '');
  const [category, setCategory] = useState(product.category || '');
  const [price, setPrice] = useState(product.price || '');
  const [purchasePrice, setPurchasePrice] = useState(product.purchasePrice || '');
  // Para múltiples sucursales con stock individual
  const [selectedBranches, setSelectedBranches] = useState(() => {
    if (product.stockBySucursal && typeof product.stockBySucursal === 'object') {
      return Object.entries(product.stockBySucursal).map(([branchId, stock]) => ({
        branchId,
        stock: stock || 0
      }));
    }
    // Para productos existentes sin stockBySucursal, usar branchId y stock actuales
    if (product.branchId && product.stock !== undefined) {
      return [{ branchId: product.branchId, stock: product.stock }];
    }
    return [];
  });
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [productCategories, setProductCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isCashierUser = currentUser && currentUser.role === 'cashier';
  const isNewProduct = !product._id && !product.id;

  // Funciones para manejar sucursales seleccionadas
  const handleBranchSelection = (branchId, isSelected) => {
    if (isSelected) {
      setSelectedBranches(prev => [...prev, { branchId, stock: 0 }]);
    } else {
      setSelectedBranches(prev => prev.filter(sb => sb.branchId !== branchId));
    }
  };

  const handleStockChange = (branchId, stock) => {
    setSelectedBranches(prev =>
      prev.map(sb =>
        sb.branchId === branchId ? { ...sb, stock: parseInt(stock) || 0 } : sb
      )
    );
  };

  const availableBranches = branches.filter(branch =>
    !selectedBranches.some(sb => sb.branchId === branch._id)
  );

  // Cargar categorías desde el backend al iniciar
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await productCategoryService.getAll();
        if (response.success) {
          const categoryNames = response.data.map(cat => cat.name);
          setProductCategories(categoryNames);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        // Fallback a categorías por defecto si falla la carga
        setProductCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);



  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSaving) return; // Evitar múltiples envíos

    if (!category) {
      alert('Por favor, selecciona una categoría para el producto.');
      return;
    }

    if (selectedBranches.length === 0) {
      alert('Debes seleccionar al menos una sucursal y especificar el stock.');
      return;
    }

    setIsSaving(true);

    // Preparar stockBySucursal
    const stockBySucursal = {};
    let totalStock = 0;
    selectedBranches.forEach(({ branchId, stock }) => {
      const qty = parseInt(stock) || 0;
      stockBySucursal[branchId] = qty;
      totalStock += qty;
    });

    const productData = {
      ...product,
      name,
      category,
      price: parseFloat(price),
      purchasePrice: parseFloat(purchasePrice),
      stock: totalStock,
      stockBySucursal
    };

    // Para cajeros editando producto existente, solo enviar el stock de su sucursal
    if (isCashierUser && !isNewProduct) {
      const cashierBranch = selectedBranches.find(sb => sb.branchId === currentUser.branchId);
      if (!cashierBranch) {
        alert('Debes incluir tu sucursal en la selección.');
        setIsSaving(false);
        return;
      }
      productData.stockBySucursal = {
        [currentUser.branchId]: cashierBranch.stock
      };
      productData.stock = cashierBranch.stock;
    }

    console.log('🔍 Datos del producto a guardar:', JSON.stringify(productData, null, 2));
    console.log('👤 Usuario actual:', currentUser);
    console.log('🔑 Es admin:', isAdmin);
    console.log('💰 Es cajero:', isCashierUser);

    try {
      const savedProductData = await onSave(productData);
      console.log('✅ Producto guardado:', savedProductData);
    } catch (error) {
      console.error('❌ Error al guardar producto:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar el producto. Inténtalo de nuevo.';
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = async () => {
    const categoryName = newCategory.trim().toLowerCase();

    if (categoryName === '') {
      alert('Por favor, ingresa un nombre válido para la categoría.');
      return;
    }

    if (productCategories.includes(categoryName)) {
      alert('Esta categoría ya existe.');
      return;
    }

    try {
      const response = await productCategoryService.create(token, currentUser, {
        name: categoryName,
        description: `Categoría ${categoryName}`
      });

      if (response.success) {
        const updatedCategories = [...productCategories, categoryName];
        setProductCategories(updatedCategories);
        setCategory(categoryName);
        setNewCategory('');
        setShowNewCategoryInput(false);
        alert('Categoría agregada exitosamente.');
      } else {
        alert(response.message || 'Error al agregar la categoría.');
      }
    } catch (error) {
      console.error('❌ Error al agregar categoría:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al agregar la categoría. Inténtalo de nuevo.';
      alert(errorMessage);
    }
  };


  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-lg max-w-2xl mx-auto my-10 border border-gray-100">
      <h2 className="text-2xl font-light text-gray-800 mb-2 text-center tracking-wide">
        {product.id ? 'Editar Producto' : 'Agregar Producto'}
      </h2>
      <p className="text-sm text-gray-400 mb-8 text-center font-light">
        Gestión de inventario y precios por sucursal
      </p>

      {/* Mostrar información de sucursal para cajeros */}
      {isCashierUser && currentUser.branchId && (
        <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
          <p className="text-sm text-blue-800 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <strong>Sucursal:</strong> {branches.find(b => b._id === currentUser.branchId)?.name || 'Sucursal actual'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
            Nombre del Producto
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300"
            placeholder="Ej. Shampoo Keratina"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="category" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
            Categoría
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300 cursor-pointer"
                required
                disabled={loadingCategories}
              >
                <option value="" disabled>Seleccionar categoría...</option>
                {loadingCategories ? (
                  <option>Cargando categorías...</option>
                ) : (
                  productCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-colors duration-200"
                title="Nueva Categoría"
              >
                <span className="text-xl leading-none font-light">+</span>
              </button>
            )}
          </div>

          {showNewCategoryInput && isAdmin && (
            <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nombre nueva categoría"
                className="flex-1 px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-6 py-3 bg-gray-900 text-white rounded-2xl hover:bg-black transition-colors duration-200 font-medium text-sm shadow-sm"
              >
                Agregar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="price" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
              Precio de Venta
            </label>
            <input
              type="number"
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="purchasePrice" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
              Precio de Compra
            </label>
            <input
              type="number"
              id="purchasePrice"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300"
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        {/* Selector de sucursales múltiples */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
            Sucursales y Stock
          </label>

          <div className="space-y-2">
            {/* Lista de sucursales seleccionadas */}
            {selectedBranches.map(({ branchId, stock }) => {
              const branch = branches.find(b => b._id === branchId);
              return (
                <div key={branchId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-colors">
                  <span className="flex-1 text-sm font-medium text-gray-700 ml-1">
                    {branch?.name || 'Sucursal desconocida'}
                  </span>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => handleStockChange(branchId, e.target.value)}
                    className="w-24 px-4 py-2 bg-white border-none rounded-xl text-center font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-300 text-gray-800 shadow-sm"
                    min="0"
                    placeholder="Stock"
                  />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleBranchSelection(branchId, false)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-100"
                      title="Quitar sucursal"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selector para agregar sucursales (solo admin) */}
          {isAdmin && availableBranches.length > 0 && (
            <div className="mt-2 relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBranchSelection(e.target.value, true);
                    e.target.value = '';
                  }
                }}
                className="w-full px-5 py-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-gray-300 hover:text-gray-700 focus:outline-none focus:border-gray-400 transition-all duration-200 cursor-pointer appearance-none"
                defaultValue=""
              >
                <option value="">+ Agregar stock a otra sucursal...</option>
                {availableBranches.map(branch => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Para cajeros, mostrar solo su sucursal */}
          {isCashierUser && selectedBranches.length === 0 && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <p className="text-sm text-blue-800 mb-2 font-medium">
                {branches.find(b => b._id === currentUser.branchId)?.name || 'Sucursal actual'}
              </p>
              <div>
                <input
                  type="number"
                  value={0}
                  onChange={(e) => {
                    const stock = parseInt(e.target.value) || 0;
                    setSelectedBranches([{ branchId: currentUser.branchId, stock }]);
                  }}
                  className="w-full px-5 py-3 bg-white border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 shadow-sm"
                  min="0"
                  placeholder="Ingresar Stock Inicial"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl text-gray-500 font-medium hover:text-gray-800 hover:bg-gray-50 transition-colors duration-300 focus:outline-none"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-xl font-medium shadow-md hover:bg-black hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Guardando...
              </>
            ) : (
              product.id ? 'Actualizar' : 'Guardar Producto'
            )}
          </button>
        </div>
      </form>

    </div>
  );
};

export default ProductForm;