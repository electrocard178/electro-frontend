import React, { useState, useMemo, useEffect } from 'react';

const PersonList = ({ persons, onEdit, onDelete, onAdd, branches = [], currentUser = null, selectedBranch = null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser && currentUser.role === 'admin';

  const filteredPersons = useMemo(() => {
    if (!Array.isArray(persons)) return [];
    let result = persons;

    if (!isAdmin && currentUser && currentUser.branchId) {
      result = result.filter(person => (person.branchIds || []).includes(currentUser.branchId));
    }
    if (isAdmin && selectedBranch) {
      result = result.filter(person => (person.branchIds || []).includes(selectedBranch));
    }

    const term = (searchTerm || '').toLowerCase();
    result = result.filter(person =>
      (person.name || '').toLowerCase().includes(term) ||
      (person.type || '').toLowerCase().includes(term) ||
      (person.cedula || '').toLowerCase().includes(term)
    );

    if (!isAdmin) {
      result = result.filter(person => person.type !== 'proveedor');
    }

    // Sort by type (Clientes first) then Name
    return result.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'cliente' ? -1 : 1;
    });
  }, [persons, searchTerm, isAdmin, currentUser, selectedBranch]);

  const getPaginatedPersons = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPersons.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(filteredPersons.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedBranch]);

  const handleConfirmDelete = async () => {
    if (!adminPassword.trim()) return alert('Ingrese contraseña admin.');
    setIsDeleting(true);
    try {
      await onDelete(pendingDeleteId, adminPassword);
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      alert('Eliminado correctamente.');
    } catch (error) {
      alert('Error al eliminar.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-slate-50 relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-50 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 z-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            Directorio de <span className="text-blue-600">Personas</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {filteredPersons.length} registros totales
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
          <input
            type="text"
            placeholder="🔍 Buscar..."
            className="flex-1 md:w-64 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button
            onClick={onAdd}
            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* Modern Table List */}
      <div className="flex-1 overflow-hidden z-10 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-5 bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
          <div className="col-span-4 md:col-span-3">Nombre / Razón Social</div>
          <div className="col-span-3 md:col-span-2 text-center">Tipo</div>
          <div className="col-span-3 md:col-span-2">Cédula / RUC</div>
          <div className="hidden md:block md:col-span-3">Contacto</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {filteredPersons.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <span className="text-5xl mb-2">📂</span>
              <span className="font-bold">Sin resultados</span>
            </div>
          ) : (
            getPaginatedPersons().map((person, idx) => (
              <div
                key={person._id}
                className={`grid grid-cols-12 gap-4 p-5 items-center hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none group`}
              >
                {/* Name */}
                <div className="col-span-4 md:col-span-3 font-bold text-slate-800 truncate" title={person.name}>
                  {person.name}
                </div>

                {/* Type Badge */}
                <div className="col-span-3 md:col-span-2 text-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${person.type === 'cliente' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                    {person.type}
                  </span>
                </div>

                {/* CI */}
                <div className="col-span-3 md:col-span-2 font-mono text-slate-600 text-sm">
                  {person.cedula || '---'}
                </div>

                {/* Contact (Hidden on mobile) */}
                <div className="hidden md:block md:col-span-3 text-slate-500 text-sm truncate">
                  {person.contact || 'Sin contacto'}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  {isAdmin && (
                    <button onClick={() => onEdit(person)} className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 flex items-center justify-center transition-colors">✎</button>
                  )}
                  <button
                    onClick={() => { setPendingDeleteId(person._id); setShowAdminPasswordModal(true); }}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                  >✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50 text-sm font-bold hover:bg-slate-100"
              >anterior</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-50 text-sm font-bold hover:bg-slate-100"
              >siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Delete Modal */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80">
            <h3 className="text-lg font-black text-slate-800 mb-4 text-center">Confirmar</h3>
            <input
              type="password"
              className="w-full p-3 bg-slate-50 rounded-xl mb-4 text-center font-bold"
              placeholder="Password Admin"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAdminPasswordModal(false)} className="flex-1 py-2 rounded-xl bg-slate-100 font-bold text-slate-600">Cancelar</button>
              <button onClick={handleConfirmDelete} disabled={isDeleting} className="flex-1 py-2 rounded-xl bg-red-500 font-bold text-white shadow-lg shadow-red-200">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonList;