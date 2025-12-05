import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { clearAllData } from '../utils/localStorageUtils';

const DashboardHome = ({ onNavigate, currentUser, sales, purchases, users, onLogout, onTestF5, onDiagnoseSession }) => {
  const [cashierStats, setCashierStats] = useState([]);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      calculateCashierStats();
    }
  }, [sales, purchases, users, currentUser]);

  const calculateCashierStats = () => {
    // Filtrar solo usuarios cajeros
    const cashiers = users.filter(user => user.role === 'cashier');
    
    // Crear estadísticas para cada cajero
    const stats = cashiers.map(cashier => {
      // Filtrar ventas realizadas por este cajero
      const cashierSales = sales.filter(sale => sale.userId === cashier.id);
      const totalSalesAmount = cashierSales.reduce((sum, sale) => sum + sale.total, 0);
      const salesCount = cashierSales.length;
      
      // Filtrar compras realizadas por este cajero
      const cashierPurchases = purchases.filter(purchase => purchase.userId === cashier.id);
      const totalPurchasesAmount = cashierPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
      const purchasesCount = cashierPurchases.length;
      
      return {
        id: cashier.id,
        name: cashier.name,
        totalSalesAmount,
        salesCount,
        totalPurchasesAmount,
        purchasesCount
      };
    });
    
    setCashierStats(stats);
  };

  const formatGuarani = (amount) => {
    return `₲ ${amount.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      {isAdmin && (
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-3xl font-bold text-gray-800">Estadísticas por Cajero</h3>
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {showStats ? 'Minimizar' : 'Maximizar'}
            </button>
          </div>
          
          {showStats && (
            <div>
              {cashierStats.length === 0 ? (
                <p className="text-center text-gray-600 text-xl py-10">No hay datos de cajeros para mostrar.</p>
              ) : (
                <div>
                  <div className="h-80 mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={cashierStats}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatGuarani(value)} />
                        <Legend />
                        <Bar dataKey="totalSalesAmount" name="Total Ventas" fill="#8884d8" />
                        <Bar dataKey="totalPurchasesAmount" name="Total Compras" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-xl overflow-hidden">
                      <thead className="bg-gray-100 border-b-2 border-gray-200">
                        <tr>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Cajero</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Total Ventas</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Cantidad Ventas</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Total Compras</th>
                          <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Cantidad Compras</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashierStats.map((stat) => (
                          <tr key={stat.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                            <td className="py-4 px-6 text-lg text-gray-800">{stat.name}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{formatGuarani(stat.totalSalesAmount)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{stat.salesCount}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{formatGuarani(stat.totalPurchasesAmount)}</td>
                            <td className="py-4 px-6 text-lg text-gray-800">{stat.purchasesCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-4xl w-full transform transition-all duration-500 hover:scale-105">
        <h2 className="text-5xl font-extrabold text-gray-800 mb-6 animate-fade-in-down">
          ¡Bienvenido al Gestor de Vapeadores!
        </h2>
        <p className="text-xl text-gray-600 mb-4 leading-relaxed animate-fade-in-up">
          {isAdmin
            ? 'Panel de Administración - Acceso completo a todas las funcionalidades'
            : 'Panel de Cajero - Gestión de tu sucursal'
          }
        </p>

        {/* Botones del header replicados en el home: Probar F5, Verificar Sesión y Cerrar Sesión */}
        <div className="mb-6 flex justify-center items-center space-x-3">

          <button
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else if (typeof window !== 'undefined' && window.location) {
                // Fallback: recargar a login
                alert('Cerrando sesión (fallback).');
                window.location.reload();
              }
            }}
            className="px-5 py-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all duration-200 text-sm"
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Botones para todos los usuarios */}
          <button
            onClick={() => onNavigate('persons')}
            className="w-full px-8 py-4 bg-blue-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Gestionar Personas
          </button>
          <button
            onClick={() => onNavigate('products')}
            className="w-full px-8 py-4 bg-purple-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
          >
            Gestionar Productos
          </button>
          <button
            onClick={() => onNavigate('sales')}
            className="w-full px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-green-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
          >
            Realizar Ventas
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="w-full px-8 py-4 bg-red-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-red-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
          >
            Registrar Compras
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="w-full px-8 py-4 bg-yellow-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-yellow-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-300"
          >
            Ver Reportes
          </button>
          <button
            onClick={() => onNavigate('profit')}
            className="w-full px-8 py-4 bg-teal-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-teal-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300"
          >
            Ver Ganancias
          </button>
          <button
            onClick={() => onNavigate('defective')}
            className="w-full px-8 py-4 bg-orange-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-orange-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300"
          >
            Productos Defectuosos
          </button>
          
          {/* Botones solo para admin */}
          {isAdmin && (
            <>
              <button
                onClick={() => onNavigate('users')}
                className="w-full px-8 py-4 bg-indigo-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300"
              >
                Gestionar Usuarios
              </button>
              <button
                onClick={() => onNavigate('branches')}
                className="w-full px-8 py-4 bg-pink-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-pink-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pink-300"
              >
                Gestionar Sucursales
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;