// api.js
// Este archivo contendrá las funciones para interactuar con tu backend.
// Asegúrate de reemplazar 'YOUR_BACKEND_URL' con la URL real de tu API.

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api'; // Usa variable de entorno o puerto correcto

// Función genérica para hacer peticiones GET
export const fetchData = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);
    if (!response.ok) {
      throw new Error(`Error al obtener datos de ${endpoint}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error en fetchData:', error);
    throw error;
  }
};

// Función genérica para hacer peticiones POST
export const postData = async (endpoint, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Error al enviar datos a ${endpoint}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error en postData:', error);
    throw error;
  }
};

// Función genérica para hacer peticiones PUT
export const updateData = async (endpoint, id, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Error al actualizar datos en ${endpoint}/${id}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error en updateData:', error);
    throw error;
  }
};

// Función genérica para hacer peticiones DELETE
export const deleteData = async (endpoint, id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Error al eliminar datos de ${endpoint}/${id}: ${response.statusText}`);
    }
    return { message: 'Eliminado con éxito' };
  } catch (error) {
    console.error('Error en deleteData:', error);
    throw error;
  }
};

// Ejemplos de uso (puedes expandir esto con endpoints específicos)
// export const getPersons = () => fetchData('persons');
// export const createPerson = (person) => postData('persons', person);
// export const updatePerson = (id, person) => updateData('persons', id, person);
// export const deletePerson = (id) => deleteData('persons', id);

// DONE