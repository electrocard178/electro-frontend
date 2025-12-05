import React, { useState, useEffect } from 'react';
import { productService, personService, branchService } from '../services/apiService';

const TestConnection = () => {
  const [data, setData] = useState({
    products: [],
    persons: [],
    branches: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setStatus('🔄 Probando conexión...');

    try {
      // Probar obtener productos
      setStatus('📦 Obteniendo productos...');
      const products = await productService.getAll();
      setData(prev => ({ ...prev, products }));

      // Probar obtener personas
      setStatus('👥 Obteniendo personas...');
      const persons = await personService.getAll();
      setData(prev => ({ ...prev, persons }));

      // Probar obtener sucursales
      setStatus('🏢 Obteniendo sucursales...');
      const branches = await branchService.getAll();
      setData(prev => ({ ...prev, branches }));

      setStatus('✅ Conexión exitosa! Todos los datos se cargaron correctamente.');
    } catch (error) {
      console.error('❌ Error en la conexión:', error);
      setError(error.message || 'Error de conexión');
      setStatus('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const addTestProduct = async () => {
    setLoading(true);
    setError(null);
    setStatus('📝 Creando producto de prueba...');

    try {
      const newProduct = {
        name: 'Producto de Prueba',
        category: 'otro',
        price: 10000,
        stock: 10,
        branchId: data.branches[0]?._id || '',
        description: 'Producto creado desde el frontend'
      };

      await productService.create(newProduct);
      setStatus('✅ Producto creado exitosamente!');
      
      // Recargar productos
      const products = await productService.getAll();
      setData(prev => ({ ...prev, products }));
    } catch (error) {
      console.error('❌ Error creando producto:', error);
      setError(error.message || 'Error creando producto');
      setStatus('❌ Error creando producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🔗 Prueba de Conexión Frontend-Backend
        </h1>

        {/* Botones de prueba */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
          >
            {loading ? '🔄 Probando...' : '🔍 Probar Conexión'}
          </button>

          <button
            onClick={addTestProduct}
            disabled={loading || data.branches.length === 0}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
          >
            📝 Crear Producto de Prueba
          </button>
        </div>

        {/* Estado de la conexión */}
        <div className="mb-6">
          <div className={`p-4 rounded-lg ${
            status.includes('✅') ? 'bg-green-100 text-green-800' :
            status.includes('❌') ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            <strong>Estado:</strong> {status}
          </div>
          
          {error && (
            <div className="mt-2 p-4 bg-red-100 text-red-800 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Datos cargados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Productos */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">📦 Productos ({data.products.length})</h3>
            {data.products.length > 0 ? (
              <ul className="space-y-2">
                {data.products.slice(0, 5).map((product, index) => (
                  <li key={index} className="text-sm">
                    <strong>{product.name}</strong>
                    <br />
                    <span className="text-gray-600">
                      ${product.price.toLocaleString()} - Stock: {product.stock}
                    </span>
                  </li>
                ))}
                {data.products.length > 5 && (
                  <li className="text-sm text-gray-500">
                    ... y {data.products.length - 5} más
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-gray-500">No hay productos</p>
            )}
          </div>

          {/* Personas */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">👥 Personas ({data.persons.length})</h3>
            {data.persons.length > 0 ? (
              <ul className="space-y-2">
                {data.persons.slice(0, 5).map((person, index) => (
                  <li key={index} className="text-sm">
                    <strong>{person.name}</strong>
                    <br />
                    <span className="text-gray-600">
                      {person.type} - {person.contact}
                    </span>
                  </li>
                ))}
                {data.persons.length > 5 && (
                  <li className="text-sm text-gray-500">
                    ... y {data.persons.length - 5} más
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-gray-500">No hay personas</p>
            )}
          </div>

          {/* Sucursales */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">🏢 Sucursales ({data.branches.length})</h3>
            {data.branches.length > 0 ? (
              <ul className="space-y-2">
                {data.branches.map((branch, index) => (
                  <li key={index} className="text-sm">
                    <strong>{branch.name}</strong>
                    <br />
                    <span className="text-gray-600">
                      {branch.address}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No hay sucursales</p>
            )}
          </div>
        </div>

        {/* Información de configuración */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">⚙️ Configuración</h3>
          <div className="text-sm space-y-1">
            <p><strong>Backend URL:</strong> {process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}</p>
            <p><strong>Frontend URL:</strong> {window.location.origin}</p>
            <p><strong>Estado de conexión:</strong> {loading ? 'Conectando...' : 'Listo'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestConnection; 