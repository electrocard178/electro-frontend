import React, { useState } from 'react';

const LayoutHeader = ({ currentPage, onNavigate, currentUser, onLogout, branches = [], selectedBranch, onBranchChange }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const getTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Panel Principal';
      case 'persons': return 'Gestión de Personas';
      case 'products': return 'Gestión de Productos';
      case 'sales': return 'Módulo de Ventas';
      case 'purchases': return 'Módulo de Compras';
      case 'reports': return 'Reportes';
      case 'profit': return 'Ganancias';
      case 'defective': return 'Productos Defectuosos';
      case 'users': return 'Gestión de Usuarios';
      case 'branches': return 'Gestión de Sucursales';
      default: return 'Sistema de Gestión';
    }
  };

  const getBranchName = (branchId) => {
    if (!branchId) return 'Todas las Sucursales';
    const branch = branches.find(b => b._id === branchId);
    return branch ? branch.name : 'Sucursal no encontrada';
  };

  const isAdmin = currentUser && currentUser.role === 'admin';

  const handleNavigate = (page) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  const toggleBranchDropdown = () => {
    setIsBranchDropdownOpen(!isBranchDropdownOpen);
  };

  const selectBranch = (branchId) => {
    onBranchChange(branchId);
    setIsBranchDropdownOpen(false);
  };

  return (
    <header className="w-full bg-gradient-to-r from-blue-600 to-purple-700 p-4 shadow-lg rounded-b-2xl relative z-50">
      <div className="flex justify-between items-center">
        {/* Left Side: Title + User Info + Branch Selector */}
        <div className="flex items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md mr-4 truncate max-w-[200px] md:max-w-none">
            {getTitle()}
          </h1>

          {/* Desktop User Info (Hidden on Mobile) */}
          <div className="hidden md:flex items-center space-x-2">
            {currentUser && (
              <>
                <span className="text-white text-sm bg-blue-800 px-3 py-1 rounded-full whitespace-nowrap">
                  {currentUser.name} ({currentUser.role === 'admin' ? 'Administrador' : 'Cajero'})
                </span>
                {currentUser.branchId && (
                  <span className="text-white text-sm bg-green-600 px-3 py-1 rounded-full whitespace-nowrap">
                    {getBranchName(currentUser.branchId)}
                  </span>
                )}
                {isAdmin && (
                  <div className="flex items-center space-x-2 relative">
                    <label className="text-white text-sm font-medium">
                      Filtrar por Sucursal:
                    </label>
                    {/* Custom Dropdown for Desktop to match previous style but with better UX */}
                    <div className="relative">
                      <button
                        onClick={toggleBranchDropdown}
                        className="text-sm bg-white text-gray-800 px-2 py-1 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center justify-between min-w-[150px]"
                      >
                        <span className="truncate mr-2">
                          {selectedBranch ? branches.find(b => b._id === selectedBranch)?.name : 'Todas las Sucursales'}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isBranchDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsBranchDropdownOpen(false)}></div>
                          <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white rounded-md shadow-xl z-20 max-h-60 overflow-y-auto border border-gray-200">
                            <button
                              onClick={() => selectBranch('')}
                              className={`block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${!selectedBranch ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-700'}`}
                            >
                              Todas las Sucursales
                            </button>
                            {branches.map(branch => (
                              <button
                                key={branch._id}
                                onClick={() => selectBranch(branch._id)}
                                className={`block w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${selectedBranch === branch._id ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-700'}`}
                              >
                                {branch.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                <span className="text-white text-sm bg-green-500 px-3 py-1 rounded-full flex items-center space-x-1 whitespace-nowrap">
                  <span>💾</span>
                  <span>Sesión Guardada</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Navigation (Desktop) + Hamburger (Mobile) */}
        <div className="flex items-center">
          {/* Desktop Navigation (Hidden on Mobile) */}
          <nav className="hidden md:flex space-x-4 mr-4">
            {[
              { id: 'dashboard', label: 'Inicio' },
              { id: 'persons', label: 'Personas' },
              { id: 'products', label: 'Productos' },
              { id: 'sales', label: 'Ventas' },
              { id: 'purchases', label: 'Compras' },
              { id: 'reports', label: 'Reportes' },
              { id: 'profit', label: 'Ganancias' },
              { id: 'defective', label: 'Defectuosos' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="px-5 py-2 bg-white text-blue-700 rounded-full shadow-md hover:bg-blue-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75"
              >
                {item.label}
              </button>
            ))}
            {isAdmin && (
              <>
                <button
                  onClick={() => onNavigate('users')}
                  className="px-5 py-2 bg-yellow-400 text-blue-800 rounded-full shadow-md hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75"
                >
                  Usuarios
                </button>
                <button
                  onClick={() => onNavigate('branches')}
                  className="px-5 py-2 bg-yellow-400 text-blue-800 rounded-full shadow-md hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75"
                >
                  Sucursales
                </button>
              </>
            )}
          </nav>

          {/* Desktop Logout Button (Hidden on Mobile) */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={onLogout}
              className="px-5 py-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Mobile Hamburger Button (Visible only on Mobile) */}
          <button
            className="md:hidden text-white focus:outline-none p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-blue-800 shadow-xl rounded-b-2xl z-40 border-t border-white/20 animate-fade-in-down">
          <div className="p-4 flex flex-col space-y-4">
            {/* Mobile User Info */}
            {currentUser && (
              <div className="bg-blue-900/50 p-3 rounded-lg space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="text-white text-sm bg-blue-700 px-3 py-1 rounded-full">
                    {currentUser.name}
                  </span>
                  <span className="text-white text-sm bg-blue-700 px-3 py-1 rounded-full">
                    {currentUser.role === 'admin' ? 'Administrador' : 'Cajero'}
                  </span>
                </div>
                {currentUser.branchId && (
                  <div>
                    <span className="text-white text-sm bg-green-600 px-3 py-1 rounded-full">
                      {getBranchName(currentUser.branchId)}
                    </span>
                  </div>
                )}

                {/* Mobile Branch Selector */}
                {isAdmin && (
                  <div className="mt-2">
                    <p className="text-white text-xs mb-1 font-semibold uppercase tracking-wider opacity-80">Sucursal Actual</p>
                    <div className="bg-white/10 rounded-lg overflow-hidden">
                      <button
                        onClick={() => selectBranch('')}
                        className={`w-full text-left px-3 py-2 text-sm ${!selectedBranch ? 'bg-white text-blue-700 font-bold' : 'text-white hover:bg-white/10'}`}
                      >
                        Todas las Sucursales
                      </button>
                      {branches.map(branch => (
                        <button
                          key={branch._id}
                          onClick={() => selectBranch(branch._id)}
                          className={`w-full text-left px-3 py-2 text-sm ${selectedBranch === branch._id ? 'bg-white text-blue-700 font-bold' : 'text-white hover:bg-white/10'}`}
                        >
                          {branch.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Navigation Links */}
            <nav className="grid grid-cols-2 gap-2">
              {[
                { id: 'dashboard', label: 'Inicio' },
                { id: 'persons', label: 'Personas' },
                { id: 'products', label: 'Productos' },
                { id: 'sales', label: 'Ventas' },
                { id: 'purchases', label: 'Compras' },
                { id: 'reports', label: 'Reportes' },
                { id: 'profit', label: 'Ganancias' },
                { id: 'defective', label: 'Defectuosos' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === item.id
                      ? 'bg-white text-blue-800 shadow-md'
                      : 'bg-blue-700 text-white hover:bg-blue-600'
                    }`}
                >
                  {item.label}
                </button>
              ))}
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleNavigate('users')}
                    className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-400 shadow-md"
                  >
                    Usuarios
                  </button>
                  <button
                    onClick={() => handleNavigate('branches')}
                    className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-400 shadow-md"
                  >
                    Sucursales
                  </button>
                </>
              )}
            </nav>

            {/* Mobile Logout */}
            <button
              onClick={onLogout}
              className="w-full px-5 py-3 bg-red-500 text-white rounded-xl shadow-md hover:bg-red-600 font-bold"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default LayoutHeader;