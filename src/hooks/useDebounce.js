import { useState, useEffect } from 'react';

/**
 * Hook personalizado para debounce de valores
 * @param {any} value - Valor a debounced
 * @param {number} delay - Delay en milisegundos
 * @returns {any} - Valor debounced
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}