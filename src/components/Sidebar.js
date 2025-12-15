import React from 'react';

const Sidebar = ({ currentPage, onNavigate, isOpen, onClose, currentUser, onLogout }) => {
    const isAdmin = currentUser && currentUser.role === 'admin';

    const navItems = [
        { id: 'dashboard', label: 'Inicio', icon: '🏠' },
        { id: 'persons', label: 'Clientes', icon: '👥' }, // Renamed Personas to Clientes for better context
        { id: 'products', label: 'Productos', icon: '📦' },
        { id: 'services', label: 'Servicios', icon: '✂️' },
        { id: 'sales', label: 'Ventas', icon: '🛒' },
        { id: 'purchases', label: 'Compras', icon: '🛍️' },
        { id: 'reports', label: 'Reportes', icon: '📊' },
        { id: 'profits', label: 'Ganancias', icon: '💰' },
        { id: 'defective', label: 'Defectuosos', icon: '⚠️' },
    ];

    const adminItems = [
        { id: 'users', label: 'Peluqueros / Staff', icon: '💈' }, // Rebranded Usuarios
        { id: 'branches', label: 'Sucursales', icon: '🏢' },
    ];

    const handleNavigate = (page) => {
        onNavigate(page);
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onClose}
                ></div>
            )}

            {/* Sidebar Container */}
            <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col h-full border-r border-slate-800
      `}>
                {/* Logo / Brand */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800">
                    <div className="flex items-center space-x-3 group cursor-pointer hover:scale-105 transition-transform">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold text-3xl shadow-lg border-4 border-blue-600 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#ef4444_5px,#ef4444_10px)] opacity-20"></div>
                            <span className="relative z-10">💈</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter text-white uppercase leading-none drop-shadow-md">Barber</span>
                            <span className="text-sm font-bold tracking-[0.2em] text-red-500 uppercase leading-none mt-1">Shop</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Principal
                    </p>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`
                w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200
                ${currentPage === item.id
                                    ? 'bg-red-600 text-white shadow-lg translate-x-1'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
                        >
                            <span className="mr-3 text-xl">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}

                    {isAdmin && (
                        <>
                            <div className="my-4 border-t border-slate-800"></div>
                            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Administración
                            </p>
                            {adminItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(item.id)}
                                    className={`
                    w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200
                    ${currentPage === item.id
                                            ? 'bg-blue-700 text-white shadow-lg translate-x-1'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                                >
                                    <span className="mr-3 text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            ))}
                        </>
                    )}
                </nav>

                {/* User Profile Summary (Bottom) */}
                <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {currentUser?.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                                {currentUser?.role === 'admin' ? 'Administrador' : 'Cajero'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center px-4 py-2 border border-slate-700 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
