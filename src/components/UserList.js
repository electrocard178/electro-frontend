import React, { useState } from 'react';

const UserList = ({ users, onEdit, onDelete, onAdd, branches = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el modal de contraseña de admin
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Validar que users sea un array
  if (!Array.isArray(users)) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-6xl mx-auto my-8">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'cashier':
        return 'Cajero';
      default:
        return 'Desconocido';
    }
  };

  const getBranchName = (branchId) => {
    if (!branchId) return 'Todas las Sucursales';
    const branch = branches.find(b => b._id === branchId);
    return branch ? branch.name : 'Sucursal no encontrada';
  };

  const handleDeleteUser = (userId) => {
    setPendingDeleteId(userId);
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
      alert('Usuario eliminado exitosamente.');
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert('Error al eliminar el usuario. Verifica la contraseña del administrador.');
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
          <h2 className="text-4xl font-extrabold text-gray-800">Usuarios</h2>
          <button
            onClick={onAdd}
            className="px-7 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Agregar Usuario
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar usuario por nombre, rol o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xl text-gray-500">No se encontraron usuarios.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl overflow-hidden">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Nombre</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Usuario</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Rol</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Sucursal</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Fecha Creación</th>
                  <th className="py-4 px-6 text-center text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="py-4 px-6 text-lg text-gray-800">{user.name}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">{user.username}</td>
                    <td className="py-4 px-6 text-lg">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-lg text-gray-800">
                      {user.role === 'cashier' ? getBranchName(user.branchId) : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-lg text-gray-800">{user.createdAt}</td>
                    <td className="py-4 px-6 flex justify-center space-x-3">
                      <button
                        onClick={() => onEdit(user)}
                        className="p-3 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
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
                Para eliminar este usuario, ingresa la contraseña del administrador:
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

export default UserList;