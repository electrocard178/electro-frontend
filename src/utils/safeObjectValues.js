// safeObjectValues.js
export const safeObjectValues = (obj) => {
  if (obj == null) return [];
  if (typeof obj !== 'object') return [];
  try {
    return Object.values(obj);
  } catch (error) {
    console.error('Error in safeObjectValues:', error);
    return [];
  }
};

// Override global para debugging
if (process.env.NODE_ENV === 'development') {
  const originalObjectValues = Object.values;
  Object.values = function(obj) {
    if (obj == null) {
      console.error('🚨 Object.values called with null/undefined');
      console.trace();
      return [];
    }
    return originalObjectValues.call(this, obj);
  };
}