import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/apiService';

const LoginScreen = ({ onLogin, users = [], branches = [] }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const { login } = useAuth();

  // Rate limiting: máximo 5 intentos por minuto
  const maxAttempts = 5;
  const blockDuration = 60000; // 1 minuto en ms
  const lastAttemptRef = useRef(0);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Verificar si está bloqueado por rate limiting
    if (blockedUntil && Date.now() < blockedUntil) {
      const remainingTime = Math.ceil((blockedUntil - Date.now()) / 1000);
      setError(`Demasiados intentos. Intenta nuevamente en ${remainingTime} segundos.`);
      return;
    }

    // Validaciones básicas de seguridad
    if (!username.trim()) {
      setError('El nombre de usuario es requerido');
      return;
    }

    if (!password.trim()) {
      setError('La contraseña es requerida');
      return;
    }

    if (username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    // Verificar caracteres peligrosos
    const dangerousChars = /[<>"';&]/;
    if (dangerousChars.test(username) || dangerousChars.test(password)) {
      setError('Caracteres no permitidos en usuario o contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.login({ username: username.trim(), password });

      // Extracción flexible del token y user
      let token, user;
      if (response && typeof response === 'object') {
        token = response.accessToken || response.token || response.data?.accessToken || response.data?.token;
        user = response.user || response.data?.user;
      } else {
        throw new Error('Respuesta inválida del servidor');
      }

      if (typeof token !== 'string' || !token.trim()) {
        throw new Error('Token no válido recibido del servidor');
      }

      if (!user || typeof user !== 'object') {
        throw new Error('Datos de usuario inválidos');
      }

      // Resetear contador de intentos en login exitoso
      setAttempts(0);
      setBlockedUntil(null);

      // No guardar en localStorage - usar Context
      login(token, user);

      // Llamar a onLogin con {token, user} para App
      onLogin({ token, user });
    } catch (error) {
      // Incrementar contador de intentos fallidos
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // Bloquear después de maxAttempts intentos
      if (newAttempts >= maxAttempts) {
        setBlockedUntil(Date.now() + blockDuration);
        setError(`Demasiados intentos fallidos. Bloqueado por 1 minuto.`);

        // Resetear bloqueo después del tiempo especificado
        setTimeout(() => {
          setAttempts(0);
          setBlockedUntil(null);
        }, blockDuration);
      } else {
        // Solo mostrar mensaje de error si no está bloqueado
        setError('Usuario incorrecto o contraseña incorrecta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/fondo.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay oscuro para mejorar legibilidad */}
      <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm"></div>

      {/* Card de login con glassmorphism */}
      <div className="relative bg-white bg-opacity-95 backdrop-blur-md p-10 rounded-3xl shadow-2xl max-w-md w-full border-t-8 border-red-600 overflow-hidden">
        {/* Barber Pole Stripe Decoration (Top) */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-700 via-white to-red-600 opacity-80"></div>

        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center font-bold text-4xl shadow-lg border-4 border-blue-900 text-red-600">
              💈
            </div>
          </div>

          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-900 via-red-600 to-blue-900 bg-clip-text text-transparent mb-2 tracking-tight">
            Barber Shop
          </h1>
          <p className="text-gray-500 text-lg font-medium tracking-wide">
            Sistema de Gestión
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-gray-700 text-md font-bold mb-2 ml-1">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition duration-200 text-lg bg-gray-50 bg-opacity-50"
              placeholder="Ej: admin"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 text-md font-bold mb-2 ml-1">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition duration-200 text-lg bg-gray-50 bg-opacity-50"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || (blockedUntil && Date.now() < blockedUntil)}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-900 to-red-700 text-white text-xl font-bold rounded-xl shadow-lg hover:from-blue-800 hover:to-red-800 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? '🔄 Iniciando...' : (blockedUntil && Date.now() < blockedUntil) ? '⏳ Espere...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;