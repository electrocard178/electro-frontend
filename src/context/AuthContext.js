import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = (userToken, user) => {
    console.log('🔍 DEBUG AuthContext.login - userToken recibido:', userToken, 'Tipo:', typeof userToken);
    if (typeof userToken !== 'string' || !userToken.trim()) {
      console.error('❌ ERROR en AuthContext: userToken no es string válido', userToken);
      return; // No setear si inválido
    }
    setToken(userToken);
    setCurrentUser(user);
    setIsLoggedIn(true);
    console.log('✅ AuthContext - Token seteado como string (long:', userToken.length, ')');
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ token, currentUser, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};