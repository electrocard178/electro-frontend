import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ProfitModule = ({ sales, purchases, products, branches = [], currentUser = null, selectedBranch = null, defectiveProducts = [] }) => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [topProducts, setTopProducts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [topN, setTopN] = useState(10);

  // Filtros por rango de fechas
  const [filterByDateRange, setFilterByDateRange] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Últimos 30 días por defecto
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Validaciones de props
  if (!Array.isArray(sales) || !Array.isArray(purchases) || !Array.isArray(products) || !Array.isArray(defectiveProducts)) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-7xl mx-auto my-8">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Cargando análisis de ganancias...</p>
        </div>
      </div>
    );
  }

  // Helper: extraer ID
  const getIdFromPopulatedField = (field) => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field._id) return field._id;
    return String(field);
  };

  // Filtrado por sucursal según usuario
  const getFilteredData = () => {
    if (!currentUser) return { sales: [], purchases: [], defective: [] };

    let filteredSales = sales;
    let filteredPurchases = purchases;
    let filteredDefective = defectiveProducts;

    if (currentUser.role === 'admin') {
      if (selectedBranch) {
        filteredSales = sales.filter(sale => getIdFromPopulatedField(sale.branchId) === selectedBranch);
        filteredPurchases = purchases.filter(purchase => getIdFromPopulatedField(purchase.branchId) === selectedBranch);
        filteredDefective = defectiveProducts.filter(dp => getIdFromPopulatedField(dp.branchId) === selectedBranch);
      }
      return { sales: filteredSales, purchases: filteredPurchases, defective: filteredDefective };
    }

    if (currentUser.role === 'cashier') {
      filteredSales = sales.filter(sale => getIdFromPopulatedField(sale.branchId) === currentUser.branchId);
      filteredPurchases = purchases.filter(purchase => getIdFromPopulatedField(purchase.branchId) === currentUser.branchId);
      filteredDefective = defectiveProducts.filter(dp => getIdFromPopulatedField(dp.branchId) === currentUser.branchId);
      return { sales: filteredSales, purchases: filteredPurchases, defective: filteredDefective };
    }

    return { sales: [], purchases: [], defective: [] };
  };

  const { sales: userSales, purchases: userPurchases, defective: userDefective } = getFilteredData();

  const formatGuarani = (amount) => {
    return `₲ ${Number(amount || 0).toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getBranchName = (branchId) => {
    if (!branchId) return 'Sin Sucursal';
    if (typeof branchId === 'object' && branchId.name) {
      return `${branchId.name} (Sucursal)`;
    }
    const branchIdStr = getIdFromPopulatedField(branchId);
    const branch = branches.find(b => b._id === branchIdStr);
    if (branch) return `${branch.name} (Sucursal)`;
    return 'Sucursal no encontrada';
  };

  const formatDateHuman = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      let date;
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [y, m, d] = dateString.split('-').map(Number);
        date = new Date(y, m - 1, d); // Interpretar como fecha local, no UTC
      } else {
        date = new Date(dateString);
      }
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-PY', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Verificar si fecha está dentro del rango
  const isDateInRange = (date, start, end) => {
    if (!date || !start || !end) return false;
    try {
      // Parseo robusto de la fecha
      let dd;
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [yy, mm, ddn] = date.split('-').map(Number);
        dd = new Date(yy, mm - 1, ddn);
      } else {
        dd = new Date(date);
      }
      if (isNaN(dd.getTime())) return false;

      // Normalizar fechas a medianoche local para comparación por día
      const normalizedDd = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate());

      // Parsear fechas de rango normalizadas
      const [sy, sm, sd] = start.split('-').map(Number);
      const [ey, em, ed] = end.split('-').map(Number);
      const startDate = new Date(sy, sm - 1, sd);
      const endDate = new Date(ey, em - 1, ed);

      return normalizedDd >= startDate && normalizedDd <= endDate;
    } catch {
      return false;
    }
  };

  // Obtener precio de compra desde catálogo de productos
  const getPurchasePrice = (productId) => {
    const pid = getIdFromPopulatedField(productId);
    if (!pid) return 0;
    const prod = products.find(p => {
      const pId = getIdFromPopulatedField(p._id || p.id || p);
      return pId === pid;
    });
    return prod ? Number(prod.purchasePrice || 0) : 0;
  };

  // Calcular margen bruto de ventas (sum((precioVenta - precioCompra) * cantidad))
  const calculateGrossProfit = (list) => {
    return (list || []).reduce((saleAcc, sale) => {
      if (!Array.isArray(sale.details)) return saleAcc;
      const saleProfit = sale.details.reduce((detAcc, det) => {
        const purchasePrice = getPurchasePrice(det.productId || det.id || det._id);
        const unitProfit = Number(det.price || 0) - Number(purchasePrice || 0);
        const qty = Number(det.quantity || 0);
        return detAcc + (unitProfit * qty);
      }, 0);
      return saleAcc + saleProfit;
    }, 0);
  };

  // Ámbito de ventas (por rango de fechas o general)
  const salesForScope = filterByDateRange && startDate && endDate
    ? (userSales || []).filter(s => isDateInRange(s.date, startDate, endDate))
    : (userSales || []);

  const totalSales = salesForScope.reduce((sum, sale) => sum + Number(sale.total || 0), 0);

  // Compras filtradas por rango de fechas si está activo el filtro, sino acumuladas
  const purchasesForScope = filterByDateRange && startDate && endDate
    ? (userPurchases || []).filter(p => isDateInRange(p.date, startDate, endDate))
    : (userPurchases || []);
  const totalPurchases = purchasesForScope.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);

  // Pérdidas por defectuosos: costo estimado = purchasePrice * quantity (mismo ámbito que ventas)
  const defectiveForScope = filterByDateRange && startDate && endDate
    ? (userDefective || []).filter(dp => isDateInRange(dp.dateReported || dp.createdAt, startDate, endDate))
    : (userDefective || []);

  const defectiveLoss = defectiveForScope.reduce((acc, dp) => {
    const price = getPurchasePrice(dp.productId);
    const qty = Number(dp.quantity || 0);
    return acc + (price * qty);
  }, 0);

  // Ganancia neta = margen de ventas - pérdidas por defectuosos
  const netProfit = calculateGrossProfit(salesForScope) - defectiveLoss;
  const profitColorClass = netProfit >= 0 ? 'text-green-600' : 'text-red-600';

  // Datos para gráficos y top de productos
  useEffect(() => {
    const baseSales = filterByDateRange && startDate && endDate
      ? (userSales || []).filter(s => isDateInRange(s.date, startDate, endDate))
      : (userSales || []);

    // Top productos por unidades
    const productSales = {};
    baseSales.forEach(sale => {
      if (!Array.isArray(sale.details)) return;
      sale.details.forEach(product => {
        const pid = product.id || product.productId || product._id || product.productId;
        if (!pid) return;
        if (productSales[pid]) {
          productSales[pid].quantity += Number(product.quantity || 0);
          productSales[pid].total += Number(product.subtotal || 0);
        } else {
          productSales[pid] = {
            id: pid,
            name: product.name || product.productName || 'Sin nombre',
            quantity: Number(product.quantity || 0),
            total: Number(product.subtotal || 0)
          };
        }
      });
    });

    const sortedProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);
    setTopProducts(sortedProducts.slice(0, topN));

    // Serie temporal según timeRange
    const now = new Date();
    const data = [];

    if (timeRange === 'daily') {
      // Últimos 7 días
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('es-PY', { weekday: 'short' });

        const daySales = baseSales.filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate.getDate() === date.getDate() &&
            saleDate.getMonth() === date.getMonth() &&
            saleDate.getFullYear() === date.getFullYear();
        });

        const total = daySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
        data.push({ name: dateStr, ventas: total });
      }
    } else if (timeRange === 'weekly') {
      // Últimas 8 semanas
      for (let i = 7; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        const weekNumber = getWeekNumber(date);

        const weekSales = baseSales.filter(sale => {
          const saleDate = new Date(sale.date);
          return getWeekNumber(saleDate) === weekNumber &&
            saleDate.getFullYear() === date.getFullYear();
        });

        const total = weekSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
        data.push({ name: `Sem ${weekNumber}`, ventas: total });
      }
    } else {
      // Mensual - últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('es-PY', { month: 'short' });

        const monthSales = baseSales.filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate.getMonth() === date.getMonth() &&
            saleDate.getFullYear() === date.getFullYear();
        });

        const total = monthSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
        data.push({ name: monthName, ventas: total });
      }
    }

    setSalesData(data);
  }, [userSales, timeRange, selectedBranch, topN, filterByDateRange, startDate, endDate]);

  // Número de semana
  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  return (
    <div
      className="h-full flex flex-col relative p-4"
      style={{
        backgroundImage: 'url(/fondo.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>

      <div className="relative bg-white bg-opacity-95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl max-w-6xl mx-auto z-10 h-full overflow-auto w-full">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Módulo de Ganancia Bruta</h2>

        {/* Info sucursal actual para cajero */}
        {currentUser && currentUser.branchId && currentUser.role === 'cashier' && (
          <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-lg font-semibold text-green-800">
              👤 Cajero: {currentUser.name} ({currentUser.role === 'admin' ? 'Administrador' : 'Cajero'})
            </p>
            <p className="text-md font-medium text-green-700">
              🏪 Sucursal actual: {getBranchName(currentUser.branchId)}
            </p>
            <p className="text-sm text-green-600">
              📊 Solo se muestran datos de ventas y compras de esta sucursal
            </p>
          </div>
        )}

        {/* Info para admin */}
        {currentUser && currentUser.role === 'admin' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-lg font-semibold text-blue-800">
              👑 Administrador: {currentUser.name}
            </p>
            <p className="text-sm text-blue-600">
              📊 {selectedBranch ? `Mostrando datos de: ${getBranchName(selectedBranch)}` : 'Mostrando datos de todas las sucursales'}
            </p>
          </div>
        )}

        {/* Configuración de Top N para admin */}
        {currentUser && currentUser.role === 'admin' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-4">
              <label htmlFor="topN" className="text-lg font-semibold text-blue-800">
                Mostrar:
              </label>
              <select
                id="topN"
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
              </select>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              La sucursal se selecciona desde el encabezado superior. Ajusta cuántos productos mostrar.
            </p>
          </div>
        )}

        {/* Controles de filtro por rango de fechas */}
        <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <div className="flex items-center space-x-2">
              <input
                id="filterByDateRange"
                type="checkbox"
                checked={filterByDateRange}
                onChange={(e) => setFilterByDateRange(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="filterByDateRange" className="text-amber-800 font-medium">Filtrar por rango de fechas</label>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col">
                <label className="text-sm text-amber-700 mb-1">Desde:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  disabled={!filterByDateRange}
                  className={`px-3 py-2 border rounded-lg ${filterByDateRange ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'}`}
                  title="Fecha de inicio"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-amber-700 mb-1">Hasta:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  disabled={!filterByDateRange}
                  className={`px-3 py-2 border rounded-lg ${filterByDateRange ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'}`}
                  title="Fecha de fin"
                />
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    setStartDate(`${yyyy}-${mm}-${dd}`);
                    setEndDate(`${yyyy}-${mm}-${dd}`);
                    setFilterByDateRange(true);
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Hoy
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const lastWeek = new Date(today);
                    lastWeek.setDate(today.getDate() - 7);
                    const syyyy = lastWeek.getFullYear();
                    const smm = String(lastWeek.getMonth() + 1).padStart(2, '0');
                    const sdd = String(lastWeek.getDate()).padStart(2, '0');
                    const eyyyy = today.getFullYear();
                    const emm = String(today.getMonth() + 1).padStart(2, '0');
                    const edd = String(today.getDate()).padStart(2, '0');
                    setStartDate(`${syyyy}-${smm}-${sdd}`);
                    setEndDate(`${eyyyy}-${emm}-${edd}`);
                    setFilterByDateRange(true);
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg"
                >
                  Última semana
                </button>
              </div>
              <button
                onClick={() => setFilterByDateRange(false)}
                className="px-3 py-2 bg-gray-200 rounded-lg self-end"
              >
                General
              </button>
            </div>
            <div className="text-sm text-amber-700">
              Ventas, compras y defectuosos se filtran por rango de fechas cuando está activo. La ganancia bruta es precio venta - precio compra por unidad × cantidad. Ideal para análisis de períodos específicos.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sección de resumen financiero */}
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 rounded-2xl shadow-inner">
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                💰 Total de Ventas{filterByDateRange ? ` (${formatDateHuman(startDate)} - ${formatDateHuman(endDate)})` : ''}:
              </h3>
              <p className="text-5xl font-bold text-blue-600">{formatGuarani(totalSales)}</p>
              <p className="text-sm text-blue-500 mt-2">
                {salesForScope.length} transacciones consideradas
              </p>
            </div>

            <div className="p-6 bg-red-50 rounded-2xl shadow-inner">
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                🛒 Total de Compras{filterByDateRange ? ` (${formatDateHuman(startDate)} - ${formatDateHuman(endDate)})` : ' (acumulado sucursal)'}:
              </h3>
              <p className="text-5xl font-bold text-red-600">{formatGuarani(totalPurchases)}</p>
              <p className="text-sm text-red-500 mt-2">
                {purchasesForScope.length} pedidos realizados
              </p>
            </div>

            <div className="p-6 bg-orange-50 rounded-2xl shadow-inner">
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                ⚠️ Pérdidas por Defectuosos{filterByDateRange ? ` (${formatDateHuman(startDate)} - ${formatDateHuman(endDate)})` : ' (acumulado)'}:
              </h3>
              <p className="text-5xl font-bold text-orange-600">{formatGuarani(defectiveLoss)}</p>
              <p className="text-sm text-orange-500 mt-2">
                {defectiveForScope.length} registros de defectuosos
              </p>
            </div>

            <div className="p-8 bg-green-50 rounded-2xl shadow-inner">
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                💰 Ganancia Bruta{filterByDateRange ? ` (${formatDateHuman(startDate)} - ${formatDateHuman(endDate)})` : ''}:
              </h3>
              <p className="text-6xl font-extrabold text-green-600">{formatGuarani(calculateGrossProfit(salesForScope))}</p>
              <p className="text-lg text-green-500 mt-4">
                Precio de Venta - Precio de Compra por unidad × cantidad
              </p>
              <p className="text-sm text-green-600 mt-2">
                Perfecto para análisis de períodos específicos y cálculo de ganancias reales
              </p>
            </div>

          </div>

          {/* Sección de estadísticas */}
          <div className="space-y-8">
            {/* Selector de rango de tiempo */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setTimeRange('daily')}
                className={`px-4 py-2 rounded-lg ${timeRange === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Diario
              </button>
              <button
                onClick={() => setTimeRange('weekly')}
                className={`px-4 py-2 rounded-lg ${timeRange === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Semanal
              </button>
              <button
                onClick={() => setTimeRange('monthly')}
                className={`px-4 py-2 rounded-lg ${timeRange === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                Mensual
              </button>
            </div>

            {/* Gráfico de ventas */}
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-center">
                Ventas {timeRange === 'daily' ? 'diarias' : timeRange === 'weekly' ? 'semanales' : 'mensuales'}
                {filterByDateRange ? ` (${formatDateHuman(startDate)} - ${formatDateHuman(endDate)})` : ''}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatGuarani(value)} />
                    <Legend />
                    <Bar dataKey="ventas" fill="#8884d8" name="Ventas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Productos más vendidos */}
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-center">Productos más vendidos (por sucursal)</h3>
              <div className="h-64">
                {topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={150} />
                      <Tooltip formatter={(value, name) => {
                        if (name === 'quantity') return [`${value} unidades`, 'Unidades'];
                        return [formatGuarani(value), 'Ingresos'];
                      }} />
                      <Legend />
                      <Bar dataKey="quantity" name="Unidades" fill="#8884d8" />
                      <Bar dataKey="total" name="Ingresos (₲)" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No hay datos de productos vendidos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

export default ProfitModule;