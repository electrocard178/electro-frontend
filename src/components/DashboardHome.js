import React from 'react';

const DashboardHome = ({ onNavigate, currentUser, onLogout }) => {
  const isAdmin = currentUser?.role === 'admin';

  const menuItems = [
    {
      id: 'sales',
      title: 'Nueva Venta',
      description: 'Registrar servicios o productos',
      icon: '🛒',
      color: 'from-green-500 to-emerald-700',
      action: () => onNavigate('sales')
    },
    {
      id: 'services',
      title: 'Servicios',
      description: 'Catálogo de cortes y estilos',
      icon: '✂️',
      color: 'from-blue-600 to-indigo-800',
      action: () => onNavigate('services')
    },
    {
      id: 'persons',
      title: 'Clientes',
      description: 'Base de datos de clientes',
      icon: '👥',
      color: 'from-blue-500 to-blue-700',
      action: () => onNavigate('persons')
    },
    {
      id: 'products',
      title: 'Productos',
      description: 'Inventario y stock',
      icon: '📦',
      color: 'from-purple-500 to-purple-700',
      action: () => onNavigate('products')
    },
    {
      id: 'purchases',
      title: 'Compras',
      description: 'Reponer inventario',
      icon: '🛍️',
      color: 'from-orange-500 to-red-600',
      action: () => onNavigate('purchases')
    },
    {
      id: 'reports',
      title: 'Reportes',
      description: 'Métricas y estadísticas',
      icon: '📊',
      color: 'from-yellow-500 to-amber-600',
      action: () => onNavigate('reports')
    },
    {
      id: 'profit',
      title: 'Ganancias',
      description: 'Análisis financiero',
      icon: '💰',
      color: 'from-teal-500 to-cyan-700',
      action: () => onNavigate('profits')
    },
    {
      id: 'defective',
      title: 'Defectuosos',
      description: 'Reportar bajas',
      icon: '⚠️',
      color: 'from-red-500 to-red-700',
      action: () => onNavigate('defective')
    }
  ];

  const adminItems = [
    {
      id: 'users',
      title: 'Staff / Peluqueros',
      description: 'Gestión de equipo',
      icon: '💈',
      color: 'from-slate-700 to-slate-900',
      action: () => onNavigate('users')
    },
    {
      id: 'branches',
      title: 'Sucursales',
      description: 'Administrar locales',
      icon: '🏢',
      color: 'from-pink-600 to-rose-700',
      action: () => onNavigate('branches')
    }
  ];

  const displayItems = isAdmin ? [...menuItems, ...adminItems] : menuItems;

  return (
    <div className="min-h-full p-8 relative overflow-y-auto">
      {/* Background Decoration */}
      <div
        className="fixed inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #ef4444 0, #ef4444 10px, #ffffff 10px, #ffffff 20px, #3b82f6 20px, #3b82f6 30px, #ffffff 30px, #ffffff 40px)',
          backgroundSize: '100% 100%'
        }}
      ></div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row justify-between items-center bg-white bg-opacity-80 backdrop-blur-md p-8 rounded-3xl shadow-lg border-l-8 border-red-600">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
              Bienvenido, {currentUser?.name?.split(' ')[0]}
            </h1>
            <p className="text-xl text-slate-600 font-medium">
              {isAdmin ? 'Panel de Administración' : 'Panel de Gestión'} y Control
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-red-600 rounded-full flex items-center justify-center shadow-xl animate-pulse">
              <span className="text-3xl">💈</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="group relative overflow-hidden bg-white hover:bg-slate-50 rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-slate-100 text-left flex flex-col"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color} opacity-10 rounded-bl-full group-hover:scale-110 transition-transform duration-300`}></div>

              <div className={`w-14 h-14 mb-4 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl shadow-lg text-white group-hover:rotate-6 transition-transform duration-300`}>
                {item.icon}
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                {item.description}
              </p>

              {/* Arrow Icon */}
              <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;