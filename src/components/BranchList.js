import React, { useState } from 'react';

const BranchList = ({ branches, onEdit, onDelete, onAdd, users = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el modal de contraseña de admin
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCashiersForBranch = (branchId) => {
    return users.filter(user => user.role === 'cashier' && user.branchId === branchId);
  };

  const getCashierNames = (branchId) => {
    const cashiers = getCashiersForBranch(branchId);
    if (cashiers.length === 0) return 'Sin cajeros asignados';
    return cashiers.map(cashier => cashier.name).join(', ');
  };

  const handleDeleteBranch = (branchId) => {
    setPendingDeleteId(branchId);
    setShowAdminPasswordModal(true);
  };

  const handleConfirmDeleteWithPassword = async () => {
    if (!adminPassword.trim()) {
      alert('Por favor, ingresa la contraseña del administrador.');
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(pendingDeleteId, adminPassword);
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      setPendingDeleteId(null);
      alert('Sucursal eliminada exitosamente.');
    } catch (error) {
      console.error('Error eliminando sucursal:', error);
      alert('Error al eliminar la sucursal. Verifica la contraseña del administrador.');
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

    <div
      className="h-full flex flex-col relative p-4"
      style={{
        backgroundImage: 'url(/fondo.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>

      <div className="relative bg-white bg-opacity-95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl max-w-6xl mx-auto z-10 h-full overflow-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl font-extrabold text-gray-800">Sucursales</h2>
          <button
            onClick={onAdd}
            className="px-7 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Agregar Sucursal
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar sucursal por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
          />
        </div>

        {filteredBranches.length === 0 ? (
          <p className="text-center text-gray-600 text-xl py-10">No hay sucursales que coincidan con tu búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl overflow-hidden">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Nombre</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Dirección</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Teléfono</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Cajeros Asignados</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Fecha Creación</th>
                  <th className="py-4 px-6 text-center text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((branch) => (
                  <tr key={branch._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6 text-lg text-gray-800 font-semibold">{branch.name}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">{branch.address}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">{branch.phone || 'N/A'}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">
                      <div className="space-y-1">
                        {getCashiersForBranch(branch._id).map(cashier => (
                          <div key={cashier._id} className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              {cashier.name}
                            </span>
                          </div>
                        ))}
                        {getCashiersForBranch(branch._id).length === 0 && (
                          <span className="text-gray-500 text-sm">Sin cajeros asignados</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-lg text-gray-800">{branch.createdAt || 'N/A'}</td>
                    <td className="py-4 px-6 flex justify-center space-x-3">
                      <button
                        onClick={() => onEdit(branch)}
                        className="p-3 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch._id)}
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
        )}

        {/* Modal de contraseña de administrador */}
        {showAdminPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                Confirmar Eliminación
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Para eliminar esta sucursal, ingresa la contraseña del administrador:
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
    </div>

  );
};

export default BranchList;