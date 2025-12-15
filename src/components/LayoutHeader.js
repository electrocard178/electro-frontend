import React, { useState } from 'react';

const LayoutHeader = ({ currentPage, onToggleSidebar, currentUser, branches = [], selectedBranch, onBranchChange }) => {
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
      default: return 'Barber Shop System';
    }
  };

  const getBranchName = (branchId) => {
    if (!branchId) return 'Todas las Sucursales';
    const branch = branches.find(b => b._id === branchId);
    return branch ? branch.name : 'Sucursal no encontrada';
  };

  const isAdmin = currentUser && currentUser.role === 'admin';

  const toggleBranchDropdown = () => {
    setIsBranchDropdownOpen(!isBranchDropdownOpen);
  };

  const selectBranch = (branchId) => {
    onBranchChange(branchId);
    setIsBranchDropdownOpen(false);
  };

  return (
    <header className="w-full bg-white shadow-sm border-b-4 border-red-600 h-16 flex items-center px-4 justify-between relative z-50">
      <div className="flex items-center">
        {/* Hamburger Button (Mobile & Desktop to toggle collapse if needed, but mainly Mobile) */}
        <button
          className="mr-4 text-gray-600 hover:text-red-600 focus:outline-none md:hidden"
          onClick={onToggleSidebar}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-xl font-bold text-gray-800 truncate">
          {getTitle()}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Branch Info / Selector */}
        {currentUser && (
          <div className="flex items-center">
            {currentUser.branchId && !isAdmin && (
              <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {getBranchName(currentUser.branchId)}
              </span>
            )}

            {currentUser && branches.length > 0 && (
              <div className="relative">
                <button
                  onClick={toggleBranchDropdown}
                  className="flex items-center space-x-2 text-sm text-gray-700 hover:text-red-600 focus:outline-none"
                >
                  <span className="hidden md:inline">
                    {selectedBranch ? branches.find(b => b._id === selectedBranch)?.name : 'Todas las Sucursales'}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isBranchDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsBranchDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-100 py-1">
                      <button
                        onClick={() => selectBranch('')}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!selectedBranch ? 'text-red-600 font-bold' : 'text-gray-700'}`}
                      >
                        Todas las Sucursales
                      </button>
                      {branches.map(branch => (
                        <button
                          key={branch._id}
                          onClick={() => selectBranch(branch._id)}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedBranch === branch._id ? 'text-red-600 font-bold' : 'text-gray-700'}`}
                        >
                          {branch.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* User Profile (Simple) */}
        <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
            <p className="text-xs text-gray-500">{currentUser?.role === 'admin' ? 'Admin' : 'Peluquero'}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold border border-blue-200">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default LayoutHeader;