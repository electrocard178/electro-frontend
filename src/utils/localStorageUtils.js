// utils/localStorageUtils.js

export const loadState = (key, defaultValue) => {
  try {
    const serializedState = localStorage.getItem(key);
    if (serializedState === null) {
      return defaultValue;
    }
    return JSON.parse(serializedState);
  } catch (error) {
    console.error("Error cargando estado de localStorage:", error);
    return defaultValue;
  }
};

export const saveState = (key, state) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(key, serializedState);
  } catch (error) {
    console.error("Error guardando estado en localStorage:", error);
  }
};

// Función para limpiar todos los datos del localStorage
export const clearAllData = () => {
  try {
    // Limpiar todo el localStorage
    localStorage.clear();

    console.log('Todos los datos han sido eliminados del localStorage');
  } catch (error) {
    console.error("Error limpiando localStorage:", error);
  }
};