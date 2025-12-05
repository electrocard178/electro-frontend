import React, { useState, useMemo, useEffect } from 'react';

const PersonList = ({ persons, onEdit, onDelete, onAdd, branches = [], currentUser = null, selectedBranch = null }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el modal de contraseña de eliminación
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Mostrar 10 personas por página

  // Validar que persons sea un array
  if (!Array.isArray(persons)) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-6xl mx-auto my-8">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Cargando personas...</p>
        </div>
      </div>
    );
  }

  // Definir variables auxiliares antes del useMemo
  const isAdmin = currentUser && currentUser.role === 'admin';

  const getBranchName = (branchId) => {
    if (!branchId) return 'N/A';
    const branch = branches.find(b => b._id === branchId);
    return branch ? branch.name : 'Sucursal no encontrada';
  };

  const getOriginBranchInfo = (person) => {
    if (!person.originBranchId) return 'N/A';

    // Si originBranchId está poblado (es un objeto con name), usar directamente
    if (typeof person.originBranchId === 'object' && person.originBranchId && person.originBranchId.name) {
      return `${person.originBranchId.name} - ${person.originBranchId.address || 'Sin dirección'}`;
    }

    // Si es un string ID o un objeto con _id, buscar en la lista de branches
    let originBranchId = person.originBranchId;
    if (typeof originBranchId === 'object' && originBranchId && originBranchId._id) {
      originBranchId = originBranchId._id;
    }

    const branch = branches.find(b => String(b._id) === String(originBranchId));
    return branch ? `${branch.name} - ${branch.address || 'Sin dirección'}` : 'Sucursal no encontrada';
  };

  // Formatea una fecha para mostrar solo la parte de la fecha (sin hora).
  // Acepta strings ISO con hora, strings en formato YYYY-MM-DD o objetos Date.
  const formatDate = (value) => {
    if (!value) return 'N/A';
    try {
      // Si ya es YYYY-MM-DD, devolver tal cual
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      const d = new Date(value);
      if (isNaN(d)) return String(value);
      // Usar formato local en español
      return d.toLocaleDateString('es-ES');
    } catch (e) {
      return String(value);
    }
  };

  // Filtrar personas por búsqueda y por sucursal para cajeros y admin con selección de sucursal
  const filteredPersons = useMemo(() => {    if (!Array.isArray(persons)) {      return [];
    }

    let result = persons;

    // Para cajeros: filtrar personas que pertenezcan a su sucursal
    if (!isAdmin && currentUser && currentUser.branchId) {      result = result.filter(person => {
        const personBranchIds = person.branchIds || [];
        return personBranchIds.includes(currentUser.branchId);
      });    }

    // Para admin: filtrar por sucursal seleccionada si existe (si no, mostrar todas)
    if (isAdmin && selectedBranch) {      result = result.filter(person => {
        const personBranchIds = person.branchIds || [];
        return personBranchIds.includes(selectedBranch);
      });    }

    // Aplicar filtro de búsqueda
    const term = (searchTerm || '').toLowerCase();
    result = result.filter(person =>
      (person.name || '').toLowerCase().includes(term) ||
      (person.type || '').toLowerCase().includes(term) ||
      (person.contact || '').toLowerCase().includes(term) ||
      (person.cedula || '').toLowerCase().includes(term)
    );

    // Ocultar proveedores a los cajeros en la lista (defensa en frontend además del backend)
    if (!isAdmin) {
      result = result.filter(person => person.type !== 'proveedor');
    }

    // Ordenar por fecha de creación descendente (más reciente primero)
    result = result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });    return result;
  }, [persons, searchTerm, isAdmin, currentUser, selectedBranch]);

  // Función para obtener personas paginadas
  const getPaginatedPersons = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPersons.slice(startIndex, endIndex);
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredPersons.length / itemsPerPage);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBranch]);

  const handleConfirmDeleteWithPassword = async () => {
    // Siempre requerir la contraseña del administrador para eliminaciones realizadas desde cajeros
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
      alert('Persona eliminada exitosamente.');
    } catch (error) {
      // Mensaje uniforme pidiendo verificar la contraseña del administrador
      alert('Error al eliminar la persona. Verifica la contraseña del administrador.');
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
    <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-6xl mx-auto my-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-extrabold text-gray-800">Personas</h2>
        <button
          onClick={onAdd}
          className="px-7 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Agregar Persona
        </button>
      </div>

      {!isAdmin && currentUser && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            👥 Personas Registradas
          </h3>
          <div className="text-sm text-green-700">
            Mostrando personas asignadas a tu sucursal: <strong>{getBranchName(currentUser.branchId)}</strong>
          </div>
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar persona por nombre, tipo o contacto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
        />
      </div>

      {/* Estadísticas para cajeros */}
      {!isAdmin && currentUser && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 Resumen de Personas</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredPersons.length}</div>
              <div className="text-sm text-blue-700">Personas Registradas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredPersons.filter(person => person.type === 'cliente').length}
              </div>
              <div className="text-sm text-green-700">Clientes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredPersons.filter(person => person.type === 'proveedor').length}
              </div>
              <div className="text-sm text-purple-700">Proveedores</div>
            </div>
          </div>
        </div>
      )}

      {filteredPersons.length === 0 ? (
        <p className="text-center text-gray-600 text-xl py-10">No hay personas que coincidan con tu búsqueda.</p>
      ) : (
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl overflow-hidden">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Nombre</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Tipo</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Contacto</th>
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Cédula</th>
                  {isAdmin && (
                    <>
                      <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Sucursal Origen</th>
                    </>
                  )}
                  <th className="py-4 px-6 text-left text-lg font-semibold text-gray-700">Fecha Creación</th>
                  <th className="py-4 px-6 text-center text-lg font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedPersons().map((person) => (
                  <tr key={person._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6 text-lg text-gray-800">{person.name}</td>
                    <td className="py-4 px-6 text-lg text-gray-800 capitalize">{person.type}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">{person.contact}</td>
                    <td className="py-4 px-6 text-lg text-gray-800">{person.cedula || ''}</td>
                    {isAdmin && (
                      <>
                        <td className="py-4 px-6 text-lg text-gray-800">
                          {getOriginBranchInfo(person)}
                        </td>
                      </>
                    )}
                    <td className="py-4 px-6 text-lg text-gray-800">{formatDate(person.createdAt)}</td>
                    <td className="py-4 px-6 flex justify-center space-x-3">
                      {isAdmin && (
                        <button
                          onClick={() => onEdit(person)}
                          className="p-3 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm('¿Estás seguro de que quieres eliminar esta persona?')) {
                            setPendingDeleteId(person._id);
                            setShowAdminPasswordModal(true);
                          }
                        }}
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

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>

              <div className="flex space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Mostrar páginas cercanas a la actual
                    const diff = Math.abs(page - currentPage);
                    return diff <= 2 || page === 1 || page === totalPages;
                  })
                  .map((page, index, array) => {
                    // Agregar "..." si hay saltos
                    const prevPage = array[index - 1];
                    if (prevPage && page - prevPage > 1) {
                      return (
                        <React.Fragment key={`ellipsis-${page}`}>
                          <span className="px-2 py-2 text-gray-500">...</span>
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}

          {/* Información de paginación */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Mostrando {getPaginatedPersons().length} de {filteredPersons.length} personas
            {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
          </div>
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
              Para eliminar esta persona, ingresa la contraseña del administrador:
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
                placeholder="Ingresa la contraseña del administrador..."
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
  );
};

export default PersonList;