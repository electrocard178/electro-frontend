import React from 'react';
import { List } from 'react-window';

/**
 * Componente de tabla virtualizada para grandes datasets
 * @param {Array} data - Array de datos a mostrar
 * @param {Array} columns - Configuración de columnas [{ key, label, width, render? }]
 * @param {number} height - Altura del contenedor (default: 400)
 */
const VirtualizedTable = ({
  data = [],
  columns = [],
  height = 400,
  className = ''
}) => {
  // 🔥 VERIFICACIONES DE SEGURIDAD EXHAUSTIVAS
  const safeData = Array.isArray(data) ? data.filter(item => item != null) : [];
  const safeColumns = Array.isArray(columns) ? columns.filter(col => col != null && col.key) : [];

  if (safeData.length === 0) {
    return (
      <div
        className={`text-center py-8 text-gray-500 ${className}`}
        style={{ height }}
      >
        No hay datos para mostrar
      </div>
    );
  }

  if (safeColumns.length === 0) {
    return (
      <div
        className={`text-center py-8 text-gray-500 ${className}`}
        style={{ height }}
      >
        No hay columnas configuradas
      </div>
    );
  }

  const Row = ({ index, style }) => {
    const item = safeData[index];
    if (!item) {
      return (
        <div style={style} className={`flex border-b hover:bg-gray-50 ${className}`}>
          <div className="p-2 text-gray-400">Datos inválidos</div>
        </div>
      );
    }

    return (
      <div style={style} className={`flex border-b hover:bg-gray-50 ${className}`}>
        {safeColumns.map((column, colIndex) => (
          <div
            key={colIndex}
            className={`p-2 ${column.className || ''}`}
            style={{ width: column.width, minWidth: column.width }}
          >
            {column.render ? column.render(item[column.key], item) : item[column.key]}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded">
      {/* Header */}
      <div className="flex bg-gray-100 font-semibold">
        {safeColumns.map((column, index) => (
          <div
            key={index}
            className={`p-2 ${column.className || ''}`}
            style={{ width: column.width, minWidth: column.width }}
          >
            {column.label}
          </div>
        ))}
      </div>

      {/* Body con virtualización */}
      <List
        height={height}
        itemCount={safeData.length}
        itemSize={45} // Altura estimada por fila
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedTable;