import React, { useState } from 'react';

const PersonForm = ({ person = {}, onSave, onCancel, branches = [], currentUser = null }) => {
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isCashierUser = currentUser && currentUser.role === 'cashier';

  const [name, setName] = useState(person.name || '');
  const [type, setType] = useState(person.type || 'cliente'); // 'cliente', 'proveedor', 'persona'
  const [contact, setContact] = useState(person.contact || '');
  const [cedula, setCedula] = useState(person.cedula || '');
  const [originBranchId, setOriginBranchId] = useState(person.originBranchId || (isAdmin ? '' : currentUser?.branchId || ''));
  const [branchIds, setBranchIds] = useState(person.branchIds || (isAdmin ? [] : [currentUser?.branchId]));
  const [isSaving, setIsSaving] = useState(false);
  // La fecha de creación se manejará automáticamente al guardar una nueva persona
  // o se mostrará si ya existe. No es un campo editable directamente en el formulario.

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSaving) return; // Prevenir múltiples envíos

    setIsSaving(true);

    try {
      // Para cashiers, asignar automáticamente su sucursal
      let finalOriginBranchId = originBranchId;
      let finalBranchIds = branchIds;
      if (!isAdmin && currentUser?.branchId) {
        finalOriginBranchId = currentUser.branchId;
        finalBranchIds = [currentUser.branchId];
      }

      // En cajeros, asegurar que el tipo sea solo 'cliente' o 'persona'
      const finalType = (!isAdmin && !['cliente', 'persona'].includes(type)) ? 'cliente' : type;

      const newPerson = {
        ...person,
        name,
        type: finalType,
        contact,
        cedula,
        originBranchId: finalOriginBranchId,
        branchIds: finalBranchIds
      };

      if (!person.id) { // Si es una nueva persona, añade la fecha de creación
        newPerson.createdAt = new Date().toISOString();
      }

      await onSave(newPerson);
    } catch (error) {
      console.error('Error guardando persona:', error);
      alert('Error guardando persona: ' + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-lg max-w-lg mx-auto my-10 border border-gray-100">
      <h2 className="text-2xl font-light text-gray-800 mb-8 text-center tracking-wide">
        {person.id ? 'Editar Persona' : 'Agregar Persona'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
            Nombre
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300"
            placeholder="Ej. Juan Pérez"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="type" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
            Tipo
          </label>
          <div className="relative">
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300 appearance-none cursor-pointer"
              required
            >
              {isAdmin ? (
                <>
                  <option value="cliente">Cliente</option>
                  <option value="proveedor">Proveedor</option>
                  <option value="persona">Persona</option>
                </>
              ) : (
                <>
                  <option value="cliente">Cliente</option>
                  <option value="persona">Persona</option>
                </>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="contact" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
            Contacto
          </label>
          <input
            type="text"
            id="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300"
            placeholder="Teléfono o Email"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="cedula" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
            Cédula
          </label>
          <input
            type="text"
            id="cedula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all duration-300"
            placeholder="Opcional"
          />
        </div>

        <div className="flex items-center space-x-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl text-gray-500 font-medium hover:text-gray-800 hover:bg-gray-50 transition-colors duration-300 focus:outline-none"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-xl font-medium shadow-md hover:bg-black hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Guardando...
              </>
            ) : (
              person.id ? 'Actualizar' : 'Agregar Persona'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonForm;