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
      const finalType = (!isAdmin && !['cliente','persona'].includes(type)) ? 'cliente' : type;

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
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-auto my-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          {person.id ? 'Editar Persona' : 'Agregar Persona'}
        </h2>
        
      {/* Mostrar información de sucursal para cajeros */}
  {/* Mostrar siempre el selector de sucursal */}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-gray-700 text-lg font-medium mb-2">
            Nombre:
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            required
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-gray-700 text-lg font-medium mb-2">
            Tipo:
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg bg-white"
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
        </div>
        <div>
          <label htmlFor="contact" className="block text-gray-700 text-lg font-medium mb-2">
            Contacto:
          </label>
          <input
            type="text"
            id="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            required
          />
        </div>
        <div>
          <label htmlFor="cedula" className="block text-gray-700 text-lg font-medium mb-2">
            Cédula:
          </label>
          <input
            type="text"
            id="cedula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
          />
        </div>

        {isAdmin && (
          <>
            {/* Sucursales se asignan automáticamente en el backend */}
          </>
        )}

        <div className="flex space-x-4 pt-4">
           <button
             type="submit"
             disabled={isSaving}
             className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
           >
             {isSaving ? (
               <>
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                 Guardando...
               </>
             ) : (
               person.id ? 'Actualizar' : 'Guardar'
             )}
           </button>
           <button
             type="button"
             onClick={onCancel}
             disabled={isSaving}
             className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-400 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             Cancelar
           </button>
         </div>
      </form>
    </div>
  );
};

export default PersonForm;