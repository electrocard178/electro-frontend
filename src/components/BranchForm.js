import React, { useState } from 'react';

const BranchForm = ({ branch = {}, onSave, onCancel, users = [] }) => {
  const [name, setName] = useState(branch.name || '');
  const [address, setAddress] = useState(branch.address || '');
  const [phone, setPhone] = useState(branch.phone || '');
  const [assignedCashiers, setAssignedCashiers] = useState(branch.assignedCashiers || []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name || !address) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }
    
    const newBranch = { 
      ...branch, 
      name, 
      address, 
      phone,
      assignedCashiers
    };
    
    if (!branch._id) {
      newBranch.createdAt = new Date().toISOString();
    }
    
    onSave(newBranch);
  };

  const handleCashierToggle = (userId) => {
    setAssignedCashiers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const getCashierName = (userId) => {
    const user = users.find(u => u._id === userId);
    return user ? user.name : 'Usuario no encontrado';
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl mx-auto my-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        {branch._id ? 'Editar Sucursal' : 'Agregar Sucursal'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-gray-700 text-lg font-medium mb-2">
            Nombre de la Sucursal:
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
          <label htmlFor="address" className="block text-gray-700 text-lg font-medium mb-2">
            Dirección:
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            required
          />
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-gray-700 text-lg font-medium mb-2">
            Teléfono:
          </label>
          <input
            type="text"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
          />
        </div>

        <div>
          <label className="block text-gray-700 text-lg font-medium mb-2">
            Cajeros Asignados:
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-4">
            {users.filter(user => user.role === 'cashier').map(user => (
              <div key={user._id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`cashier-${user._id}`}
                  checked={assignedCashiers.includes(user._id)}
                  onChange={() => handleCashierToggle(user._id)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor={`cashier-${user._id}`} className="flex-1 text-gray-700">
                  {user.name} ({user.username})
                </label>
                {user.branchId && (
                  <span className="text-sm text-gray-500">
                    Actualmente en: {user.branchId === branch._id ? 'Esta sucursal' : 'Otra sucursal'}
                  </span>
                )}
              </div>
            ))}
            {users.filter(user => user.role === 'cashier').length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No hay cajeros disponibles. Primero crea usuarios con rol de cajero.
              </p>
            )}
          </div>
        </div>

        {branch.createdAt && (
          <div>
            <label className="block text-gray-700 text-lg font-medium mb-2">
              Fecha de Creación:
            </label>
            <p className="w-full px-5 py-3 bg-gray-100 text-gray-800 rounded-xl shadow-sm text-lg">
              {branch.createdAt}
            </p>
          </div>
        )}
        
        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-xl shadow-md hover:bg-gray-400 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};

export default BranchForm;