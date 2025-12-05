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
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl mx-auto my-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        {product.id ? 'Editar Producto' : 'Agregar Producto'}
      </h2>
      <p className="text-sm text-gray-600 mb-6 text-center">
        Los productos pueden agregarse a múltiples sucursales con stock individual. Los cajeros pueden gestionar el stock de sus sucursales.
      </p>

      {/* Mostrar información de sucursal para cajeros */}
      {isCashierUser && currentUser.branchId && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Sucursal:</strong> {branches.find(b => b._id === currentUser.branchId)?.name || 'Sucursal actual'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-gray-700 text-lg font-medium mb-2">
            Nombre del Producto:
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            required
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-gray-700 text-lg font-medium mb-2">
            Categoría:
          </label>
          <div className="flex space-x-2">
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg bg-white"
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
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition duration-200"
              >
                +
              </button>
            )}
          </div>

          {showNewCategoryInput && isAdmin && (
            <div className="mt-2 flex space-x-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nueva categoría"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Agregar
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="price" className="block text-gray-700 text-lg font-medium mb-2">
            Precio de Venta:
          </label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label htmlFor="purchasePrice" className="block text-gray-700 text-lg font-medium mb-2">
            Precio de Compra:
          </label>
          <input
            type="number"
            id="purchasePrice"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Selector de sucursales múltiples */}
        <div>
          <label className="block text-gray-700 text-lg font-medium mb-2">
            Sucursales y Stock:
          </label>

          {/* Lista de sucursales seleccionadas */}
          {selectedBranches.map(({ branchId, stock }) => {
            const branch = branches.find(b => b._id === branchId);
            return (
              <div key={branchId} className="flex items-center space-x-2 mb-2 p-3 bg-gray-50 rounded-lg">
                <span className="flex-1 text-sm font-medium">{branch?.name || 'Sucursal desconocida'}</span>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => handleStockChange(branchId, e.target.value)}
                  className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                  placeholder="Stock"
                />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleBranchSelection(branchId, false)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {/* Selector para agregar sucursales (solo admin) */}
          {isAdmin && availableBranches.length > 0 && (
            <div className="mt-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBranchSelection(e.target.value, true);
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue=""
              >
                <option value="">Agregar sucursal...</option>
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
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>{branches.find(b => b._id === currentUser.branchId)?.name || 'Sucursal actual'}</strong>
              </p>
              <div className="mt-2">
                <input
                  type="number"
                  value={0}
                  onChange={(e) => {
                    const stock = parseInt(e.target.value) || 0;
                    setSelectedBranches([{ branchId: currentUser.branchId, stock }]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  placeholder="Stock inicial"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition duration-200 ${isSaving
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            {isSaving ? 'Guardando...' : (product.id ? 'Actualizar' : 'Guardar')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition duration-200 ${isSaving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
          >
            Cancelar
          </button>
        </div>
      </form>

    </div>
  );
};

export default ProductForm;