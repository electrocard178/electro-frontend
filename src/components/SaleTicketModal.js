import React from 'react';

const SaleTicketModal = ({ sale, onClose, getPersonName, getCashierName, formatGuarani }) => {
  if (!sale) return null;

  const printTicket = () => {
    const ticketHtml = document.getElementById('ticket-content').innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Venta</title>
          <style>
            body {
              font-family: monospace;
              font-size: 12px;
              width: 300px;
              margin: 0 auto;
              padding: 20px;
            }
            @media print {
              @page {
                margin: 0;
                size: auto;
              }
              body {
                margin: 0;
              }
              @top-center { content: none; }
              @bottom-center { content: none; }
              @top-left { content: none; }
              @top-right { content: none; }
              @bottom-left { content: none; }
              @bottom-right { content: none; }
            }
          </style>
        </head>
        <body>
          ${ticketHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div id="ticket-content" className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">VAPOENERGY</h2>
          <p className="text-gray-600 mb-4">Tu tienda de vapeadores de confianza</p>
          <div className="border-b border-gray-300 pb-4 mb-4 text-left">
            <p className="text-lg text-gray-700 mb-1"><strong>Venta ID:</strong> {sale._id || sale.id}</p>
            <p className="text-lg text-gray-700 mb-1"><strong>Cliente:</strong> {getPersonName(sale.personId)}</p>
            <p className="text-lg text-gray-700 mb-1"><strong>Cajero:</strong> {getCashierName(sale.cashierId)}</p>
            <p className="text-lg text-gray-700 mb-1"><strong>Fecha:</strong> {sale.date}</p>
            <p className="text-lg text-gray-700 mb-1"><strong>Método de Pago:</strong> {sale.paymentMethod === 'mixto' ? 'Mixto' : sale.paymentMethod}</p>
            {sale.paymentMethod === 'mixto' && (
              <>
                <p className="text-lg text-gray-700 mb-1"><strong>Efectivo:</strong> {formatGuarani(sale.cashAmount)}</p>
                <p className="text-lg text-gray-700 mb-1"><strong>Tarjeta:</strong> {formatGuarani(sale.cardAmount)}</p>
              </>
            )}
          </div>

          <div className="mb-4 text-left">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Productos:</h3>
            <ul className="space-y-2">
              {sale.details.map((item, index) => (
                <li key={index} className="flex justify-between text-gray-700 text-lg">
                  <span>{item.name} ({item.quantity} x {formatGuarani(item.price)})</span>
                  <span>{formatGuarani(item.subtotal)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-300 pt-4 mt-4 text-right">
            <p className="text-2xl font-bold text-gray-900">Total: {formatGuarani(sale.total)}</p>
            {sale.paymentMethod === 'efectivo' && (
              <>
                <p className="text-xl text-gray-700 mt-2">Recibido: {formatGuarani(sale.amountReceived)}</p>
                <p className="text-xl text-gray-700">Vuelto: {formatGuarani(sale.change)}</p>
              </>
            )}
            {sale.paymentMethod === 'mixto' && (
              <>
                <p className="text-xl text-gray-700 mt-2">Efectivo recibido: {formatGuarani(sale.cashAmount)}</p>
                <p className="text-xl text-gray-700">Tarjeta: {formatGuarani(sale.cardAmount)}</p>
              </>
            )}
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">¡Gracias por tu compra!</p>
            <p className="text-gray-600 text-sm">Vuelve pronto.</p>
          </div>
        </div>

        <button
          onClick={printTicket}
          className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Imprimir Ticket
        </button>
      </div>
    </div>
  );
};

export default SaleTicketModal;