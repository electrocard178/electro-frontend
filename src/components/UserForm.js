import React, { useState } from 'react';

const UserForm = ({ user = {}, onSave, onCancel, branches = [] }) => {
  const [username, setUsername] = useState(user.username || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(user.role || 'cashier');
  const [branchId, setBranchId] = useState(user.branchId || '');
  const [email, setEmail] = useState(user.email || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!username || !name || !email) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }
    
    // Si es un nuevo usuario o se está cambiando la contraseña
  if (!user._id && !password) {
      setError('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }
    
    // Si es cajero, debe tener una sucursal asignada
    if (role === 'cashier' && !branchId) {
      setError('Por favor selecciona una sucursal para el cajero.');
      return;
    }
    
    const newUser = { 
      ...user, 
      username, 
      name, 
      email,
      role,
      branchId: role === 'cashier' ? branchId : null, // Solo asignar sucursal a cajeros
    };
    
    // Solo incluir la contraseña si se ha proporcionado una nueva
    if (password) {
      newUser.password = password;
    }
    
    // Si es un nuevo usuario, añadir fecha de creación
  if (!user._id) {
      newUser.createdAt = new Date().toISOString();
    }
    
    onSave(newUser);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-auto my-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
  {user._id ? 'Editar Usuario' : 'Agregar Usuario'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="username" className="block text-gray-700 text-lg font-medium mb-2">
            Usuario:
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            required
          />
        </div>
        
        <div>
          <label htmlFor="name" className="block text-gray-700 text-lg font-medium mb-2">
            Nombre Completo:
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
          <label htmlFor="email" className="block text-gray-700 text-lg font-medium mb-2">
            Email:
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-gray-700 text-lg font-medium mb-2">
            Contraseña {user._id ? '(dejar en blanco para mantener la actual)' : ''}:
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg"
            required={!user._id}
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block text-gray-700 text-lg font-medium mb-2">
            Rol:
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg bg-white"
            required
          >
            <option value="admin">Administrador</option>
            <option value="cashier">Cajero</option>
          </select>
        </div>
        
        {role === 'cashier' && (
          <div>
            <label htmlFor="branch" className="block text-gray-700 text-lg font-medium mb-2">
              Sucursal:
            </label>
            <select
              id="branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-lg bg-white"
              required
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map(branch => (
                <option key={branch._id} value={branch._id}>{branch.name} ({branch._id})</option>
              ))}
            </select>
          </div>
        )}
        
        {user.createdAt && (
          <div>
            <label className="block text-gray-700 text-lg font-medium mb-2">
              Fecha de Creación:
            </label>
            <p className="w-full px-5 py-3 bg-gray-100 text-gray-800 rounded-xl shadow-sm text-lg">
              {user.createdAt}
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

export default UserForm;