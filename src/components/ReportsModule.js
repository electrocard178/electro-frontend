import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, Scatter, ScatterChart
} from 'recharts';
import { apiRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';

/**
 * ReportsModule
 * - Muestra reportes de Ventas, Compras, Clientes y Productos
 * - Usa los datos recibidos por props (sales, purchases, persons, products, branches, users)
 * - Para admins puede solicitar KPIs consolidados al backend con fetchServerReports()
 *
 * Nota: implementé la lógica de análisis en el frontend (agrupar, sumar, calcular ganancias)
 *       y añadí la capacidad de pedir resúmenes al servidor (endpoints ya presentes en backend/routes/reports.js).
 */
const ReportsModule = ({ sales = [], purchases = [], persons = [], products = [], branches = [], users = [], currentUser = null, selectedBranch = null }) => {
  const [reportType, setReportType] = useState('sales'); // sales | purchases | customers | products
  const [filteredSales, setFilteredSales] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [productAnalysis, setProductAnalysis] = useState({ topProfitable: [], topLosses: [], bestSelling: [] });
  const [topCustomers, setTopCustomers] = useState([]);
  const [frequentCustomers, setFrequentCustomers] = useState([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverSalesSummary, setServerSalesSummary] = useState(null);
  const [serverProfitSummary, setServerProfitSummary] = useState(null);
  const { token } = useAuth();
  // Print / PDF options (A4/Letter, orientation, compact/detailed)
  const [pageSize, setPageSize] = useState('A4'); // 'A4' | 'Letter'
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [printMode, setPrintMode] = useState('detailed'); // 'detailed' | 'compact'
  // UI search filters para reports (cliente, producto, rango de fechas)
  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersApplied, setFiltersApplied] = useState(0);
  // Filtros específicos por tipo de reporte
  // Clientes
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [customerDocFilter, setCustomerDocFilter] = useState('');
  // Productos
  const [categoryQuery, setCategoryQuery] = useState('');
  // Paginación por reporte
  const [pagination, setPagination] = useState({
    sales: { currentPage: 1, rowsPerPage: 50 },
    purchases: { currentPage: 1, rowsPerPage: 50 },
    customers: { currentPage: 1, rowsPerPage: 50 },
    products: { currentPage: 1, rowsPerPage: 50 }
  });

  const getRowsPerPage = () => {
    // Heurística simple para evitar cortes: filas por página según orientación y modo
    if (orientation === 'portrait') return printMode === 'compact' ? 35 : 25;
    return printMode === 'compact' ? 60 : 40;
  };

  const parseCurrencyToNumber = (txt) => {
    if (!txt) return 0;
    // El formato local usa separador de miles; eliminamos todo lo que no sea dígito o signo
    const cleaned = String(txt).replace(/[^0-9\-]/g, '');
    return Number(cleaned || 0);
  };

  const buildPaginatedHTML = (tableEl, title) => {
    if (!tableEl) return null;
    // Encuentra índice de columna "total" buscando en headers
    const headers = Array.from(tableEl.querySelectorAll('thead th')).map(h => h.textContent.trim().toLowerCase());
    let totalIndex = headers.findIndex(h => h.includes('total') || h.includes('monto') || h.includes('ingresos') || h.includes('subtotal'));
    if (totalIndex === -1) totalIndex = headers.length - 1; // fallback a la última columna

    const rows = Array.from(tableEl.querySelectorAll('tbody tr'));
    const rowsPerPage = getRowsPerPage();
    const pages = [];
    for (let i = 0; i < rows.length; i += rowsPerPage) {
      const slice = rows.slice(i, i + rowsPerPage);
      // construir subtotal de página
      const pageSubtotal = slice.reduce((acc, r) => {
        const cells = r.querySelectorAll('td,th');
        const txt = cells[totalIndex] ? cells[totalIndex].textContent : '';
        return acc + parseCurrencyToNumber(txt);
      }, 0);
      pages.push({ rows: slice.map(r => r.outerHTML).join(''), subtotal: pageSubtotal });
    }

    // Crear HTML por página con header repetido
    const headerHTML = tableEl.querySelector('thead') ? tableEl.querySelector('thead').outerHTML : '';
    const caption = title ? `<div class="report-title">${title}</div>` : '';
    const pagesHTML = pages.map((p, idx) => `
      <div class="page ${printMode === 'compact' ? 'compact' : 'detailed'}">
        ${caption}
        <table>
          ${headerHTML}
          <tbody>
            ${p.rows}
          </tbody>
        </table>
        <div class="page-footer">
          Página ${idx + 1} / ${pages.length} — Total página: ${p.subtotal.toLocaleString('es-PY')}
        </div>
      </div>
    `).join('\n');

    return pagesHTML;
  };

  const exportReportToPDF = (elementId, title = '') => {
    const el = document.getElementById(elementId);
    if (!el) {
      window.print();
      return;
    }
    // Si el contenido contiene tabla(s), tomamos la primera para paginar
    const table = el.querySelector('table');
    let contentHTML = '';
    if (table) {
      const paged = buildPaginatedHTML(table, title);
      contentHTML = paged || el.outerHTML;
    } else {
      // Si no hay tabla, imprimimos el outerHTML dentro del contenedor
      contentHTML = `<div class="page ${printMode === 'compact' ? 'compact' : 'detailed'}">${el.outerHTML}</div>`;
    }

    // Abrir ventana nueva, inyectar estilos de página según selección y disparar impresión
    const sizeName = pageSize === 'Letter' ? 'letter' : 'A4';
    const orient = orientation === 'landscape' ? 'landscape' : 'portrait';
    const style = `
      <style>
        @page { size: ${sizeName} ${orient}; margin: 20mm; }
        body { font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; color-adjust: exact; }
        table { border-collapse: collapse; width: 100%; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { page-break-inside: avoid; }
        .report-title { text-align: center; margin-bottom: 6px; font-size: 14pt; font-weight: 700; }
        .page-footer { margin-top: 6px; text-align: right; font-weight: 600; }
        .compact table { font-size: 10pt; }
        .detailed table { font-size: 12pt; }
        th, td { padding: 6px; border: 1px solid #ddd; }
      </style>
    `;
    const newWindow = window.open('', '_blank', 'noopener');
    // Si window.open fue bloqueado, newWindow puede ser null -> fallback usando iframe
    if (newWindow && newWindow.document) {
      newWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + (title || 'Reporte') + '</title>' + style + '</head><body class="print-container">');
      newWindow.document.write(contentHTML);
      newWindow.document.write('</body></html>');
      newWindow.document.close();
      // Dejar un ligero delay para que el navegador renderice antes de abrir diálogo
      setTimeout(() => {
        try {
          newWindow.focus();
          newWindow.print();
        } catch (e) {
          console.error('Impresión en nueva ventana falló:', e);
          window.alert('No se pudo abrir el diálogo de impresión en una nueva ventana. Compruebe el bloqueador de ventanas emergentes.');
        }
        // newWindow.close(); // no cerramos automáticamente para que el usuario pueda revisar antes de guardar como PDF
      }, 500);
    } else {
      // Fallback: renderizar en un iframe oculto y usar print() desde su contentWindow
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.overflow = 'hidden';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (!iframeDoc) {
        console.error('No se pudo acceder al documento del iframe para impresión.');
        window.alert('No se puede abrir la ventana de impresión. Por favor, desactive el bloqueador de ventanas emergentes o utilice la exportación CSV.');
        return;
      }
      iframeDoc.open();
      iframeDoc.write('<!doctype html><html><head><meta charset="utf-8"><title>' + (title || 'Reporte') + '</title>' + style + '</head><body class="print-container">');
      iframeDoc.write(contentHTML);
      iframeDoc.write('</body></html>');
      iframeDoc.close();
      setTimeout(() => {
        try {
          const win = iframe.contentWindow;
          win.focus();
          win.print();
        } catch (e) {
          console.error('Impresión desde iframe falló:', e);
          window.alert('No se pudo iniciar la impresión. Compruebe el bloqueador de ventanas o los permisos del navegador.');
        } finally {
          // limpiar iframe después de un corto retraso para evitar interrumpir el diálogo de impresión
          setTimeout(() => {
            try { document.body.removeChild(iframe); } catch (err) { /* ignore */ }
          }, 1000);
        }
      }, 500);
    }
  };

  useEffect(() => {
    // Si el usuario es cajero, forzar que el tipo de reporte no sea "purchases"
    if (currentUser && currentUser.role === 'cashier' && reportType === 'purchases') {
      setReportType('sales');
    }
  }, [currentUser, reportType]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Helper: safe id extractor
  const getId = field => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field._id) return String(field._id);
    return String(field);
  };

  const formatGuarani = (amount = 0) => {
    try {
      return `₲ ${Number(amount).toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } catch (e) {
      return `₲ ${amount}`;
    }
  };

  // Formatea una fecha ISO/Date para mostrar solo la fecha en la zona local (es-PY)
  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      // Mostrar solo la fecha corta (sin hora)
      return d.toLocaleDateString('es-PY', { dateStyle: 'short' });
    } catch (e) {
      return String(iso);
    }
  };

  // Helper: verificar si el usuario actual es cajero
  const isCashier = currentUser && currentUser.role === 'cashier';

  // Export helper: array of objects -> CSV (Excel friendly)
  const exportArrayToCSV = (filename, headers, rows) => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    rows.forEach(row => {
      const values = headers.map(h => {
        let v = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
        // Escape quotes
        v = v.replace(/"/g, '""');
        // Wrap if contains comma or newline
        if (v.search(/("|,|\n)/g) >= 0) v = `"${v}"`;
        return v;
      });
      csvRows.push(values.join(','));
    });
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export ventas / compras
  const exportSalesToCSV = () => {
    const rows = (filteredSales || []).map(s => {
      const details = Array.isArray(s.details) ? s.details.map(d => `${d.name} (x${d.quantity})=${d.subtotal}`).join('; ') : '';
      return {
        id: s.id || s._id || '',
        date: s.date || '',
        branch: (branches.find(b => String(b._id) === String(getId(s.branchId))) || {}).name || String(getId(s.branchId) || ''),
        cashier: (users.find(u => String(u._id) === String(getId(s.cashierId))) || {}).name || String(getId(s.cashierId) || ''),
        customer: (persons.find(p => String(p._id) === String(getId(s.personId))) || {}).name || String(getId(s.personId) || ''),
        total: s.total || 0,
        details
      };
    });
    const headers = ['id', 'date', 'branch', 'cashier', 'customer', 'total', 'details'];
    exportArrayToCSV('ventas_report.csv', headers, rows);
  };

  const exportPurchasesToCSV = () => {
    const rows = (filteredPurchases || []).map(p => {
      const details = Array.isArray(p.details) ? p.details.map(d => `${d.name} (x${d.quantity})=${d.subtotal}`).join('; ') : '';
      return {
        id: p.id || p._id || '',
        date: p.date || '',
        branch: (branches.find(b => String(b._id) === String(getId(p.branchId))) || {}).name || String(getId(p.branchId) || ''),
        cashier: (users.find(u => String(u._id) === String(getId(p.cashierId))) || {}).name || String(getId(p.cashierId) || ''),
        supplier: (persons.find(pp => String(pp._id) === String(getId(p.personId))) || {}).name || String(getId(p.personId) || ''),
        total: p.total || 0,
        details
      };
    });
    const headers = ['id', 'date', 'branch', 'cashier', 'supplier', 'total', 'details'];
    exportArrayToCSV('compras_report.csv', headers, rows);
  };

  // Simple print helper for an element id
  const printElement = (elementId, title) => {
    const el = document.getElementById(elementId);
    if (!el) {
      window.print();
      return;
    }
    const original = document.body.innerHTML;
    document.body.innerHTML = `
      <div style="padding:20px;font-family:Arial,Helvetica,sans-serif">
        <h1 style="text-align:center">${title}</h1>
        ${el.outerHTML}
      </div>
    `;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  // Apply local branch filtering for cashier users (frontend level) + aplicar filtros de búsqueda (cliente/producto/fechas)
  useEffect(() => {
    // Determinar lista base según rol (sin los filtros de texto/fecha)
    let baseSales = sales || [];
    let basePurchases = purchases || [];

    if (!currentUser) {
      baseSales = sales || [];
      basePurchases = purchases || [];
    } else if (currentUser.role === 'admin') {
      // Si es admin y hay una sucursal seleccionada, filtrar por esa sucursal
      if (selectedBranch) {
        baseSales = (sales || []).filter(s => String(getId(s.branchId)) === String(selectedBranch));
        basePurchases = (purchases || []).filter(p => String(getId(p.branchId)) === String(selectedBranch));
      } else {
        // Si no hay sucursal seleccionada, mostrar todas
        baseSales = sales || [];
        basePurchases = purchases || [];
      }
    } else if (currentUser.role === 'cashier' && currentUser.branchId) {
      const branchId = String(currentUser.branchId);
      baseSales = (sales || []).filter(s => String(getId(s.branchId)) === branchId);
      basePurchases = (purchases || []).filter(p => String(getId(p.branchId)) === branchId);
    } else {
      baseSales = [];
      basePurchases = [];
    }

    // Función auxiliar para obtener nombre del cliente en una venta (puede venir poblado o como id)
    const getSaleCustomerName = (s) => {
      if (!s) return '';
      if (s.personId && typeof s.personId === 'object' && s.personId.name) return String(s.personId.name);
      const pid = getId(s.personId);
      const person = (persons || []).find(p => String(p._id) === String(pid));
      return (person && person.name) ? String(person.name) : String(pid || '');
    };

    // Aplicar filtros de búsqueda (si existen)
    const applySaleFilters = (list) => {
      let res = Array.isArray(list) ? [...list] : [];
      // Filtrar por cliente
      if (customerQuery && customerQuery.trim() !== '') {
        const q = customerQuery.toLowerCase().trim();
        res = res.filter(s => {
          const name = (getSaleCustomerName(s) || '').toLowerCase();
          return name.includes(q);
        });
      }
      // Filtrar por producto (si alguna línea de la venta contiene el texto)
      if (productQuery && productQuery.trim() !== '') {
        const q = productQuery.toLowerCase().trim();
        res = res.filter(s => {
          if (!Array.isArray(s.details)) return false;
          return s.details.some(d => String(d.name || '').toLowerCase().includes(q));
        });
      }
      // Filtrar por fecha desde (dateFrom) - dateFrom es YYYY-MM-DD
      if (dateFrom) {
        res = res.filter(s => {
          const sd = s.date ? new Date(s.date) : null;
          if (!sd || isNaN(sd.getTime())) return false;
          // Comparar solo la parte de fecha (YYYY-MM-DD) sin conversiones de zona horaria
          const saleDateStr = sd.toISOString().split('T')[0];
          return saleDateStr >= dateFrom;
        });
      }
      // Filtrar por fecha hasta (dateTo) - incluir hasta fin del día
      if (dateTo) {
        res = res.filter(s => {
          const sd = s.date ? new Date(s.date) : null;
          if (!sd || isNaN(sd.getTime())) return false;
          // Comparar solo la parte de fecha (YYYY-MM-DD) sin conversiones de zona horaria
          const saleDateStr = sd.toISOString().split('T')[0];
          return saleDateStr <= dateTo;
        });
      }
      return res;
    };

    const applyPurchaseFilters = (list) => {
      let res = Array.isArray(list) ? [...list] : [];
      // Para compras aplicamos filtro por producto y por fechas (y por proveedor si se ingresó en customerQuery)
      if (productQuery && productQuery.trim() !== '') {
        const q = productQuery.toLowerCase().trim();
        res = res.filter(p => {
          if (!Array.isArray(p.details)) return false;
          return p.details.some(d => String(d.name || '').toLowerCase().includes(q));
        });
      }
      if (dateFrom) {
        res = res.filter(p => {
          const pd = p.date ? new Date(p.date) : null;
          if (!pd || isNaN(pd.getTime())) return false;
          // Comparar solo la parte de fecha (YYYY-MM-DD) sin conversiones de zona horaria
          const purchaseDateStr = pd.toISOString().split('T')[0];
          return purchaseDateStr >= dateFrom;
        });
      }
      if (dateTo) {
        res = res.filter(p => {
          const pd = p.date ? new Date(p.date) : null;
          if (!pd || isNaN(pd.getTime())) return false;
          // Comparar solo la parte de fecha (YYYY-MM-DD) sin conversiones de zona horaria
          const purchaseDateStr = pd.toISOString().split('T')[0];
          return purchaseDateStr <= dateTo;
        });
      }
      // Filtrar por proveedor (customerQuery) si aplica
      if (customerQuery && customerQuery.trim() !== '') {
        const q = customerQuery.toLowerCase().trim();
        res = res.filter(p => {
          // p.personId puede contener nombre o id
          const supplierName = (p.personId && p.personId.name) ? String(p.personId.name).toLowerCase() : ((persons || []).find(pp => String(pp._id) === String(getId(p.personId))) || {}).name || '';
          return String(supplierName).toLowerCase().includes(q);
        });
      }
      return res;
    };

    // Aplicar y actualizar estados
    try {
      setFilteredSales(applySaleFilters(baseSales));
      setFilteredPurchases(applyPurchaseFilters(basePurchases));
      setFiltersApplied(prev => prev + 0); // no cambia, pero mantiene la referencia si se muestra en UI
    } catch (err) {
      console.error('Error aplicando filtros locales en ReportsModule:', err);
      setFilteredSales(baseSales);
      setFilteredPurchases(basePurchases);
    }
  }, [sales, purchases, currentUser, filtersApplied, persons, customerQuery, productQuery, dateFrom, dateTo, selectedBranch]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({
      sales: { ...prev.sales, currentPage: 1 },
      purchases: { ...prev.purchases, currentPage: 1 },
      customers: { ...prev.customers, currentPage: 1 },
      products: { ...prev.products, currentPage: 1 }
    }));
  }, [filtersApplied, customerNameFilter, customerDocFilter, categoryQuery]);

  // Analyze products: revenue, cost, profit, soldQuantity
  // Mejorar cálculo de "ganancia real": si no hay compras para un producto,
  // usar purchasePrice desde la entidad Product (props products) como costo.
  useEffect(() => {
    const salesToUse = filteredSales;
    const purchasesToUse = filteredPurchases;

    // Map por nombre normalizado -> almacenamos soldQuantity, soldRevenue, purchaseCost (desde compras),
    // y también capturamos productId cuando esté disponible en las líneas para poder buscar purchasePrice.
    const mapByName = {};

    salesToUse.forEach(sale => {
      if (!Array.isArray(sale.details)) return;
      sale.details.forEach(d => {
        const rawName = d.name || 'Sin nombre';
        const name = String(rawName).toLowerCase().trim();
        if (!mapByName[name]) mapByName[name] = { name: rawName, soldQuantity: 0, soldRevenue: 0, purchaseCost: 0, profit: 0, productId: d.productId || null };
        mapByName[name].soldQuantity += Number(d.quantity || 0);
        mapByName[name].soldRevenue += Number(d.subtotal || 0);
        // Guardar productId si está presente (priorizarlo para buscar purchasePrice)
        if (!mapByName[name].productId && d.productId) mapByName[name].productId = d.productId;
      });
    });

    purchasesToUse.forEach(purchase => {
      if (!Array.isArray(purchase.details)) return;
      purchase.details.forEach(d => {
        const rawName = d.name || 'Sin nombre';
        const name = String(rawName).toLowerCase().trim();
        if (!mapByName[name]) mapByName[name] = { name: rawName, soldQuantity: 0, soldRevenue: 0, purchaseCost: 0, profit: 0, productId: d.productId || null };
        mapByName[name].purchaseCost += Number(d.subtotal || 0);
        if (!mapByName[name].productId && d.productId) mapByName[name].productId = d.productId;
      });
    });

    const productsArray = Object.values(mapByName).map(p => {
      // Si ya tenemos costo desde compras (purchaseCost), lo usamos.
      // Si no, intentamos obtener purchasePrice desde props products:
      //  - primero por productId (si existe)
      //  - si no hay productId, intentamos buscar por nombre exacto (case-insensitive).
      let effectivePurchaseCost = Number(p.purchaseCost || 0);

      if (!effectivePurchaseCost || effectivePurchaseCost === 0) {
        // Buscar por productId
        if (p.productId) {
          const prod = (products || []).find(pr => String(pr._id) === String(p.productId));
          if (prod && prod.purchasePrice) {
            effectivePurchaseCost = Number(prod.purchasePrice || 0) * Number(p.soldQuantity || 0);
          }
        }

        // Si aún no encontramos costo, intentar buscar por nombre (coincidencia simple)
        if ((!effectivePurchaseCost || effectivePurchaseCost === 0) && p.name) {
          const prodByName = (products || []).find(pr => String(pr.name || '').toLowerCase().trim() === String(p.name || '').toLowerCase().trim());
          if (prodByName && prodByName.purchasePrice) {
            effectivePurchaseCost = Number(prodByName.purchasePrice || 0) * Number(p.soldQuantity || 0);
          }
        }
      }

      const profit = (p.soldRevenue || 0) - (effectivePurchaseCost || 0);
      return { ...p, purchaseCost: effectivePurchaseCost, profit };
    });

    const topProfitable = [...productsArray].filter(p => p.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 10);
    const topLosses = [...productsArray].filter(p => p.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 10);
    const bestSelling = [...productsArray].sort((a, b) => b.soldQuantity - a.soldQuantity).slice(0, 10);

    setProductAnalysis({ topProfitable, topLosses, bestSelling });
  }, [filteredSales, filteredPurchases, sales, purchases, products]);

  // Analyze customers
  useEffect(() => {
    const salesToUse = filteredSales;
    const customersMap = {};
    salesToUse.forEach(s => {
      const personId = getId(s.personId) || 'sin-cliente';
      if (!customersMap[personId]) customersMap[personId] = { personId, totalSpent: 0, purchaseCount: 0, name: null };
      customersMap[personId].totalSpent += Number(s.total || 0);
      customersMap[personId].purchaseCount += 1;
    });
    const customersArray = Object.values(customersMap).map(c => {
      const person = persons.find(p => String(p._id) === String(c.personId));
      return { ...c, name: (person && person.name) || c.personId };
    });
    const topBySpent = [...customersArray].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
    const topByFreq = [...customersArray].sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, 10);
    setTopCustomers(topBySpent);
    setFrequentCustomers(topByFreq);
  }, [filteredSales, sales, persons]);

  // Server-side fetch for admin: sales-summary & profit-summary
  const fetchServerKPIs = async (opts = {}) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setServerLoading(true);
    try {
      const now = new Date();
      const start = new Date();
      start.setDate(start.getDate() - (opts.days || 30));
      const startISO = start.toISOString();
      const endISO = now.toISOString();
      const branchParam = opts.branchId ? `&branchId=${opts.branchId}` : '';
      const salesSummary = await apiRequest(`/reports/sales-summary?startDate=${startISO}&endDate=${endISO}${branchParam}`, {}, token, currentUser);
      const profitSummary = await apiRequest(`/reports/profit-summary?startDate=${startISO}&endDate=${endISO}${branchParam}`, {}, token, currentUser);
      setServerSalesSummary(salesSummary || null);
      setServerProfitSummary(profitSummary || null);
    } catch (err) {
      console.error('Error fetching server KPIs', err);
    } finally {
      setServerLoading(false);
    }
  };

  // Función para refrescar datos desde el backend y aplicar filtros por rol (admin ve todo, cajero solo su sucursal)
  const refreshData = async () => {
    try {
      const [freshSales, freshPurchases, freshPersons, freshProducts] = await Promise.all([
        apiRequest('/sales'),
        apiRequest('/purchases'),
        apiRequest('/persons'),
        apiRequest('/products')
      ]);

      // Aplicar filtro por sucursal si es cajero
      if (!currentUser) {
        setFilteredSales(freshSales || []);
        setFilteredPurchases(freshPurchases || []);
      } else if (currentUser.role === 'admin') {
        setFilteredSales(freshSales || []);
        setFilteredPurchases(freshPurchases || []);
      } else if (currentUser.role === 'cashier') {
        const branchId = String(currentUser.branchId);
        setFilteredSales((freshSales || []).filter(s => String(getId(s.branchId)) === branchId));
        setFilteredPurchases((freshPurchases || []).filter(p => String(getId(p.branchId)) === branchId));
      } else {
        setFilteredSales([]);
        setFilteredPurchases([]);
      }
    } catch (error) {
      console.error('Error refrescando datos (refreshData):', error);
    }
  };

  // Render helpers: simple charts and tables for each reportType
  const renderSales = () => {
    const data = {};
    // Ordenar ventas por fecha descendente (últimas primero), luego por _id descendente para el mismo día
    const salesList = (filteredSales || []).slice().sort((a, b) => {
      const da = a && a.date ? new Date(a.date).getTime() : 0;
      const db = b && b.date ? new Date(b.date).getTime() : 0;
      if (da !== db) return db - da;
      // Si misma fecha, ordenar por _id descendente (más reciente primero)
      const ida = a && a._id ? a._id : '';
      const idb = b && b._id ? b._id : '';
      return idb.localeCompare(ida);
    });
    salesList.forEach(s => {
      const branchId = getId(s.branchId) || 'sin-sucursal';
      const bName = (branches.find(b => String(b._id) === String(branchId)) || { name: branchId }).name;
      if (!data[branchId]) data[branchId] = { name: bName, totalAmount: 0, tickets: 0 };
      data[branchId].totalAmount += Number(s.total || 0);
      data[branchId].tickets += 1;
    });
    const chartData = Object.values(data);

    // Datos para gráfico de métodos de pago
    const paymentData = {};
    salesList.forEach(s => {
      const method = s.paymentMethod || 'efectivo';
      if (method === 'mixto') {
        // Para pagos mixtos, dividir en efectivo y tarjeta
        if (!paymentData['efectivo']) paymentData['efectivo'] = 0;
        paymentData['efectivo'] += Number(s.cashAmount || 0);
        if (!paymentData['tarjeta']) paymentData['tarjeta'] = 0;
        paymentData['tarjeta'] += Number(s.cardAmount || 0);
      } else {
        if (!paymentData[method]) paymentData[method] = 0;
        paymentData[method] += Number(s.total || 0);
      }
    });
    const paymentChartData = Object.entries(paymentData).map(([method, amount]) => ({ name: method, value: amount }));

    // Paginación
    const { currentPage, rowsPerPage } = pagination.sales;
    const totalRows = salesList.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedSales = salesList.slice(startIndex, endIndex);

    return (
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Ventas - Monto por Sucursal y Método de Pago</h3>
          <div className="text-sm text-gray-600">{salesList.length} ventas</div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={val => formatGuarani(val)} />
                <Legend />
                <Bar dataKey="totalAmount" name="Monto (₲)" fill="#8884d8" />
                <Bar dataKey="tickets" name="Tickets" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentChartData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={({ payload }) => `${payload.name} (${formatGuarani(payload.value)})`}
                  labelLine={false}
                >
                  {paymentChartData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value, name, props) => [formatGuarani(value), props?.payload?.name || name]} />
                <Legend formatter={value => value} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">Resumen de ventas</div>
          <div className="space-x-2">
            <button onClick={() => exportSalesToCSV()} className="px-3 py-1 bg-blue-600 text-white rounded">Exportar CSV Ventas</button>
            <button onClick={() => exportReportToPDF('sales-history-table', 'Historial de Ventas')} className="px-3 py-1 bg-gray-600 text-white rounded">Exportar PDF</button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto" id="sales-history-table">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Sucursal</th>
                <th className="p-2 text-left">Cajero</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Método Pago</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-left">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map((s, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2">{s.id || s._id}</td>
                  <td className="p-2">{formatDate(s.date)}</td>
                  <td className="p-2">{(branches.find(b => String(b._id) === String(getId(s.branchId))) || {}).name || getId(s.branchId)}</td>
                  <td className="p-2">{(users.find(u => String(u._id) === String(getId(s.cashierId))) || {}).name || getId(s.cashierId)}</td>
                  <td className="p-2">{(persons.find(p => String(p._id) === String(getId(s.personId))) || {}).name || getId(s.personId)}</td>
                  <td className="p-2 capitalize">{s.paymentMethod || 'efectivo'}</td>
                  <td className="p-2 text-right">{formatGuarani(s.total)}</td>
                  <td className="p-2">{Array.isArray(s.details) ? s.details.map(d => `${d.name} (x${d.quantity})`).join('; ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Controles de paginación */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm">Filas por página:</label>
              <select
                value={pagination.sales.rowsPerPage}
                onChange={(e) => setPagination(prev => ({ ...prev, sales: { ...prev.sales, rowsPerPage: Number(e.target.value), currentPage: 1 } }))}
                className="px-2 py-1 border rounded"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, sales: { ...prev.sales, currentPage: Math.max(1, prev.sales.currentPage - 1) } }))}
                disabled={pagination.sales.currentPage === 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm">Página {pagination.sales.currentPage} de {totalPages}</span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, sales: { ...prev.sales, currentPage: Math.min(totalPages, prev.sales.currentPage + 1) } }))}
                disabled={pagination.sales.currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPurchases = () => {
    const data = {};
    // Ordenar compras por fecha descendente (últimas primero), luego por _id descendente para el mismo día
    const purchasesList = (filteredPurchases || []).slice().sort((a, b) => {
      const da = a && (a.date || a.createdAt || a.updatedAt) ? new Date(a.date || a.createdAt || a.updatedAt).getTime() : 0;
      const db = b && (b.date || b.createdAt || b.updatedAt) ? new Date(b.date || b.createdAt || b.updatedAt).getTime() : 0;
      if (da !== db) return db - da;
      // Si misma fecha, ordenar por _id descendente (más reciente primero)
      const ida = a && a._id ? a._id : '';
      const idb = b && b._id ? b._id : '';
      return idb.localeCompare(ida);
    });
    purchasesList.forEach(p => {
      const branchId = getId(p.branchId) || 'sin-sucursal';
      const bName = (branches.find(b => String(b._id) === String(branchId)) || { name: branchId }).name;
      if (!data[branchId]) data[branchId] = { name: bName, totalAmount: 0, purchases: 0 };
      data[branchId].totalAmount += Number(p.total || 0);
      data[branchId].purchases += 1;
    });
    const chartData = Object.values(data);

    // Paginación
    const { currentPage, rowsPerPage } = pagination.purchases;
    const totalRows = purchasesList.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedPurchases = purchasesList.slice(startIndex, endIndex);
    return (
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Compras - Monto por Sucursal</h3>
          <div className="text-sm text-gray-600">{purchasesList.length} compras</div>
        </div>

        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={val => formatGuarani(val)} />
              <Bar dataKey="totalAmount" name="Monto (₲)" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">Historial de compras</div>
          <div className="space-x-2">
            <button onClick={() => exportPurchasesToCSV()} className="px-3 py-1 bg-blue-600 text-white rounded">Exportar CSV Compras</button>
            <button onClick={() => exportReportToPDF('purchases-history-table', 'Historial de Compras')} className="px-3 py-1 bg-gray-600 text-white rounded">Exportar PDF</button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto" id="purchases-history-table">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Sucursal</th>
                <th className="p-2 text-left">Cajero</th>
                <th className="p-2 text-left">Proveedor</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-left">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPurchases.map((p, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2">{p.id || p._id}</td>
                  <td className="p-2">{formatDate(p.date)}</td>
                  <td className="p-2">{(branches.find(b => String(b._id) === String(getId(p.branchId))) || {}).name || getId(p.branchId)}</td>
                  <td className="p-2">{(users.find(u => String(u._id) === String(getId(p.cashierId))) || {}).name || getId(p.cashierId)}</td>
                  <td className="p-2">{(persons.find(pp => String(pp._id) === String(getId(p.personId))) || {}).name || getId(p.personId)}</td>
                  <td className="p-2 text-right">{formatGuarani(p.total)}</td>
                  <td className="p-2">{Array.isArray(p.details) ? p.details.map(d => `${d.name} (x${d.quantity})`).join('; ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Controles de paginación */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm">Filas por página:</label>
              <select
                value={pagination.purchases.rowsPerPage}
                onChange={(e) => setPagination(prev => ({ ...prev, purchases: { ...prev.purchases, rowsPerPage: Number(e.target.value), currentPage: 1 } }))}
                className="px-2 py-1 border rounded"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, purchases: { ...prev.purchases, currentPage: Math.max(1, prev.purchases.currentPage - 1) } }))}
                disabled={pagination.purchases.currentPage === 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm">Página {pagination.purchases.currentPage} de {totalPages}</span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, purchases: { ...prev.purchases, currentPage: Math.min(totalPages, prev.purchases.currentPage + 1) } }))}
                disabled={pagination.purchases.currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

      </div>
    );
  };

  const renderCustomers = () => {
    // Calcular resumen por cliente a partir de ventas visibles (filtradas según UI/rol)
    const salesToUse = filteredSales;
    const customersMap = {};
    salesToUse.forEach(s => {
      const pid = getId(s.personId) || 'sin-cliente';
      if (!customersMap[pid]) customersMap[pid] = { personId: pid, totalSpent: 0, purchaseCount: 0, lastPurchase: null };
      customersMap[pid].totalSpent += Number(s.total || 0);
      customersMap[pid].purchaseCount += 1;
      // Registrar fecha de última compra para el cliente
      try {
        const sd = s.date ? new Date(s.date) : null;
        if (sd && (!customersMap[pid].lastPurchase || new Date(customersMap[pid].lastPurchase) < sd)) {
          customersMap[pid].lastPurchase = sd.toISOString();
        }
      } catch (e) {
        // ignore invalid dates
      }
    });
    // Construir lista completa de clientes (a partir de persons prop), enriqueciendo con totales calculados y lastPurchase
    const allClients = (persons || []).map(p => {
      const id = String(p._id || p.id || '');
      const stats = customersMap[id] || { totalSpent: 0, purchaseCount: 0, lastPurchase: null };
      return {
        id,
        name: p.name || '',
        type: p.type || '',
        contact: p.contact || '',
        cedula: p.cedula || '',
        totalSpent: stats.totalSpent,
        purchaseCount: stats.purchaseCount,
        lastPurchase: stats.lastPurchase || null
      };
    });
    // También incluir clientes que aparecen en ventas pero no en la colección persons (por si vienen como id)
    Object.values(customersMap).forEach(c => {
      if (!allClients.find(ac => ac.id === String(c.personId))) {
        allClients.push({ id: String(c.personId), name: String(c.personId), type: '', contact: '', cedula: '', totalSpent: c.totalSpent, purchaseCount: c.purchaseCount, lastPurchase: c.lastPurchase || null });
      }
    });

    // Ordenar todos los clientes por última compra descendente (más reciente arriba)
    allClients.sort((a, b) => {
      const ta = a.lastPurchase ? new Date(a.lastPurchase).getTime() : 0;
      const tb = b.lastPurchase ? new Date(b.lastPurchase).getTime() : 0;
      return tb - ta;
    });

    // Aplicar filtros específicos de Clientes (nombre y documento)
    const filteredClients = allClients.filter(c => {
      const nameMatch = !customerNameFilter || String(c.name || '').toLowerCase().includes(String(customerNameFilter).toLowerCase().trim());
      const docMatch = !customerDocFilter || String(c.cedula || '').toLowerCase().includes(String(customerDocFilter).toLowerCase().trim());
      return nameMatch && docMatch;
    });

    // Paginación
    const { currentPage, rowsPerPage } = pagination.customers;
    const totalRows = filteredClients.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedClients = filteredClients.slice(startIndex, endIndex);

    return (
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold mb-4">Clientes - Top Gastos y Todos los Clientes</h3>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={val => formatGuarani(val)} />
                <Bar dataKey="totalSpent" name="Total Gastado" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={frequentCustomers}
                  dataKey="purchaseCount"
                  nameKey="name"
                  outerRadius={100}
                  label={({ payload }) => `${payload.name} (${payload.purchaseCount})`}
                  labelLine={false}
                >
                  {frequentCustomers.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value} compras`, props?.payload?.name || name]} />
                <Legend formatter={value => value} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-2">
          <table id="customers-table-all" className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Tipo</th>
                <th className="p-2 text-left">Contacto</th>
                <th className="p-2 text-left">Documento</th>
                <th className="p-2 text-right">Total Gastado</th>
                <th className="p-2 text-right">Compras</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((c, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-2">{c.id}</td>
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.type}</td>
                  <td className="p-2">{c.contact}</td>
                  <td className="p-2">{c.cedula || ''}</td>
                  <td className="p-2 text-right">{formatGuarani(c.totalSpent)}</td>
                  <td className="p-2 text-right">{c.purchaseCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Controles de paginación */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm">Filas por página:</label>
              <select
                value={pagination.customers.rowsPerPage}
                onChange={(e) => setPagination(prev => ({ ...prev, customers: { ...prev.customers, rowsPerPage: Number(e.target.value), currentPage: 1 } }))}
                className="px-2 py-1 border rounded"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, customers: { ...prev.customers, currentPage: Math.max(1, prev.customers.currentPage - 1) } }))}
                disabled={pagination.customers.currentPage === 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm">Página {pagination.customers.currentPage} de {totalPages}</span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, customers: { ...prev.customers, currentPage: Math.min(totalPages, prev.customers.currentPage + 1) } }))}
                disabled={pagination.customers.currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProducts = () => {
    const { topProfitable, topLosses, bestSelling } = productAnalysis;

    // Calcular productos visibles con filtros aplicados
    const salesToUseForProducts = filteredSales;
    const lastSoldMap = {};
    salesToUseForProducts.forEach(sale => {
      if (!sale || !sale.date || !Array.isArray(sale.details)) return;
      sale.details.forEach(d => {
        const name = String(d.name || '').toLowerCase().trim();
        const cur = lastSoldMap[name];
        if (!cur || new Date(cur) < new Date(sale.date)) lastSoldMap[name] = sale.date;
      });
    });

    const productsSorted = (products || []).slice().sort((a, b) => {
      const la = lastSoldMap[String(a.name || '').toLowerCase().trim()];
      const lb = lastSoldMap[String(b.name || '').toLowerCase().trim()];
      const ta = la ? new Date(la).getTime() : 0;
      const tb = lb ? new Date(lb).getTime() : 0;
      return tb - ta;
    });

    const nameQ = String(productQuery || '').toLowerCase().trim();
    const catQ = String(categoryQuery || '').toLowerCase().trim();
    const visibleProducts = productsSorted.filter(prod => {
      const pName = String(prod.name || '').toLowerCase().trim();
      const pCat = String(prod.category || '').toLowerCase().trim();
      const nameOk = !nameQ || pName.includes(nameQ);
      const catOk = !catQ || pCat.includes(catQ);
      return nameOk && catOk;
    });

    // Paginación
    const { currentPage, rowsPerPage } = pagination.products;
    const totalRows = visibleProducts.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedProducts = visibleProducts.slice(startIndex, endIndex);

    return (
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-xl font-bold mb-4">Análisis de Productos</h3>
        <div>
          <h4 className="font-semibold mb-2">Más vendidos</h4>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestSelling}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={v => [v, 'Unidades']} />
                <Bar dataKey="soldQuantity" name="Unidades" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>


        {/* NUEVA SECCIÓN: Mostrar TODOS los productos */}
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Todos los productos</h4>
          <div className="mt-2 overflow-x-auto" id="products-table-all">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Producto</th>
                  <th className="p-2 text-right">Precio</th>
                  {!isCashier && <th className="p-2 text-right">Precio Compra</th>}
                  <th className="p-2 text-right">Stock</th>
                  <th className="p-2 text-right">Vendidas</th>
                  <th className="p-2 text-right">Ingresos</th>
                  {!isCashier && <th className="p-2 text-right">Ganancia Bruta</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((prod, idx) => {
                  const prodName = String(prod.name || '').toLowerCase().trim();
                  const analysisEntry = Object.values(productAnalysis.topProfitable || {})
                    .concat(Object.values(productAnalysis.topLosses || {}), Object.values(productAnalysis.bestSelling || {}))
                    .find(a => String(a.name || '').toLowerCase().trim() === prodName) || {};

                  const soldQty = analysisEntry.soldQuantity || 0;
                  const soldRevenue = analysisEntry.soldRevenue || 0;
                  let profit = analysisEntry.profit;
                  if (profit === undefined || profit === null) {
                    const purchasePrice = Number(prod.purchasePrice || 0);
                    const unitPrice = Number(prod.price || 0);
                    profit = (unitPrice - purchasePrice) * soldQty;
                  }

                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">{prod._id || prod.id}</td>
                      <td className="p-2">{prod.name}</td>
                      <td className="p-2 text-right">{formatGuarani(prod.price)}</td>
                      {!isCashier && <td className="p-2 text-right">{formatGuarani(prod.purchasePrice)}</td>}
                      <td className="p-2 text-right">{prod.stock || 0}</td>
                      <td className="p-2 text-right">{soldQty}</td>
                      <td className="p-2 text-right">{formatGuarani(soldRevenue)}</td>
                      {!isCashier && (
                        <td className="p-2 text-right" style={{ color: profit >= 0 ? '#16a34a' : '#dc2626' }}>
                          {formatGuarani(profit)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Controles de paginación */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <label className="text-sm">Filas por página:</label>
                <select
                  value={pagination.products.rowsPerPage}
                  onChange={(e) => setPagination(prev => ({ ...prev, products: { ...prev.products, rowsPerPage: Number(e.target.value), currentPage: 1 } }))}
                  className="px-2 py-1 border rounded"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, products: { ...prev.products, currentPage: Math.max(1, prev.products.currentPage - 1) } }))}
                  disabled={pagination.products.currentPage === 1}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm">Página {pagination.products.currentPage} de {totalPages}</span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, products: { ...prev.products, currentPage: Math.min(totalPages, prev.products.currentPage + 1) } }))}
                  disabled={pagination.products.currentPage === totalPages}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div className="space-x-2">
          <button onClick={() => setReportType('sales')} className={`px-4 py-2 rounded ${reportType === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Ventas</button>
          {/* Ocultar botón de Compras para usuarios cajero */}
          {!isCashier && (
            <button onClick={() => setReportType('purchases')} className={`px-4 py-2 rounded ${reportType === 'purchases' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Compras</button>
          )}
          <button onClick={() => setReportType('customers')} className={`px-4 py-2 rounded ${reportType === 'customers' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Clientes</button>
          <button onClick={() => setReportType('products')} className={`px-4 py-2 rounded ${reportType === 'products' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Productos</button>
        </div>

        {/* Filtros específicos según reporte */}
        {reportType === 'sales' && (
          <div className="ml-4 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Cliente (nombre)"
              value={customerQuery}
              onChange={e => setCustomerQuery(e.target.value)}
              className="px-2 py-1 border rounded w-44"
            />
            <input
              type="text"
              placeholder="Producto"
              value={productQuery}
              onChange={e => setProductQuery(e.target.value)}
              className="px-2 py-1 border rounded w-44"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2 py-1 border rounded"
              title="Fecha desde"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-2 py-1 border rounded"
              title="Fecha hasta"
            />
            <button
              onClick={() => { setFiltersApplied(prev => prev + 1); }}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Aplicar
            </button>
            <button
              onClick={() => { setCustomerQuery(''); setProductQuery(''); setDateFrom(''); setDateTo(''); setFiltersApplied(0); }}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Limpiar
            </button>
          </div>
        )}
        {reportType === 'purchases' && (
          <div className="ml-4 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Proveedor (nombre)"
              value={customerQuery}
              onChange={e => setCustomerQuery(e.target.value)}
              className="px-2 py-1 border rounded w-52"
            />
            <input
              type="text"
              placeholder="Producto"
              value={productQuery}
              onChange={e => setProductQuery(e.target.value)}
              className="px-2 py-1 border rounded w-44"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2 py-1 border rounded"
              title="Fecha desde"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-2 py-1 border rounded"
              title="Fecha hasta"
            />
            <button
              onClick={() => { setFiltersApplied(prev => prev + 1); }}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Aplicar
            </button>
            <button
              onClick={() => { setCustomerQuery(''); setProductQuery(''); setDateFrom(''); setDateTo(''); setFiltersApplied(0); }}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Limpiar
            </button>
          </div>
        )}
        {reportType === 'customers' && (
          <div className="ml-4 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Cliente (nombre)"
              value={customerNameFilter}
              onChange={e => setCustomerNameFilter(e.target.value)}
              className="px-2 py-1 border rounded w-56"
            />
            <input
              type="text"
              placeholder="N° documento (cédula)"
              value={customerDocFilter}
              onChange={e => setCustomerDocFilter(e.target.value)}
              className="px-2 py-1 border rounded w-56"
            />
            <button
              onClick={() => { setCustomerNameFilter(''); setCustomerDocFilter(''); }}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Limpiar
            </button>
          </div>
        )}
        {reportType === 'products' && (
          <div className="ml-4 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Producto"
              value={productQuery}
              onChange={e => setProductQuery(e.target.value)}
              className="px-2 py-1 border rounded w-52"
            />
            <input
              type="text"
              placeholder="Categoría"
              value={categoryQuery}
              onChange={e => setCategoryQuery(e.target.value)}
              className="px-2 py-1 border rounded w-52"
            />
            <button
              onClick={() => { setProductQuery(''); setCategoryQuery(''); }}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Limpiar
            </button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {currentUser && currentUser.role === 'admin' && (
            <button onClick={() => fetchServerKPIs()} disabled={serverLoading} className="px-3 py-2 bg-indigo-600 text-white rounded">
              {serverLoading ? 'Cargando...' : 'Cargar KPIs (Server)'}
            </button>
          )}
          <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="px-2 py-1 border rounded">
            <option value="A4">A4</option>
            <option value="Letter">Carta</option>
          </select>
          <select value={orientation} onChange={e => setOrientation(e.target.value)} className="px-2 py-1 border rounded">
            <option value="portrait">Vertical</option>
            <option value="landscape">Horizontal</option>
          </select>
          <select value={printMode} onChange={e => setPrintMode(e.target.value)} className="px-2 py-1 border rounded">
            <option value="detailed">Detallado</option>
            <option value="compact">Compacto</option>
          </select>
          <button onClick={refreshData} className="px-3 py-2 bg-green-600 text-white rounded">Refrescar</button>
          <button
            onClick={() => {
              const idMap = { sales: 'sales-history-table', purchases: 'purchases-history-table', customers: 'customers-table-all', products: 'products-table-all' };
              const human = { sales: 'Ventas', purchases: 'Compras', customers: 'Clientes', products: 'Productos' };
              exportReportToPDF(idMap[reportType] || 'sales-history-table', human[reportType] ? `${human[reportType]} - Reporte` : 'Reporte');
            }}
            className="px-3 py-2 bg-gray-700 text-white rounded"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {reportType === 'sales' && renderSales()}
        {reportType === 'purchases' && renderPurchases()}
        {reportType === 'customers' && renderCustomers()}
        {reportType === 'products' && renderProducts()}

        {/* If server-provided KPIs exist, show a compact summary */}
        {serverSalesSummary && currentUser && currentUser.role === 'admin' && (
          <div className="bg-white p-4 rounded shadow">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Ingresos Totales</div>
                <div className="text-lg font-bold">{formatGuarani(serverSalesSummary.totals?.totalRevenue || 0)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Tickets</div>
                <div className="text-lg font-bold">{serverSalesSummary.totals?.tickets || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Ticket Promedio</div>
                <div className="text-lg font-bold">{formatGuarani(Math.round(serverSalesSummary.totals?.avgTicket || 0))}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsModule;
