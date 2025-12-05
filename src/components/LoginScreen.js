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
      <div className="relative bg-white bg-opacity-95 backdrop-blur-md p-10 rounded-3xl shadow-2xl max-w-md w-full border border-white border-opacity-20">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="Electrocard Logo"
              className="h-24 w-auto object-contain drop-shadow-lg"
            />
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Electrocard
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Sistema de Gestión
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-gray-700 text-lg font-medium mb-2">
              Usuario:
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-lg bg-white bg-opacity-90"
              placeholder="Nombre de usuario"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 text-lg font-medium mb-2">
              Contraseña:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 text-lg bg-white bg-opacity-90"
              placeholder="Contraseña"
              required
              disabled={loading}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-center text-md font-semibold">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || (blockedUntil && Date.now() < blockedUntil)}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? '🔄 Conectando...' : (blockedUntil && Date.now() < blockedUntil) ? '⏳ Bloqueado temporalmente' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;