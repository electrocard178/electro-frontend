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
            @page {
              margin: 0;
              size: 80mm auto; /* 80mm width, auto height */
            }
            body {
              font-family: 'Courier New', Courier, monospace; /* Thermal printer font */
              font-size: 12px;
              width: 80mm;
              margin: 0;
              padding: 5px;
              color: black;
              background: white;
            }
            .ticket-container {
              width: 100%;
              max-width: 78mm; /* Slight padding */
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .dashed-line {
              border-top: 1px dashed black;
              margin: 5px 0;
              width: 100%;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .item-name {
              flex: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-right: 5px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              margin-top: 2px;
            }
            .footer {
              margin-top: 15px;
              font-size: 10px;
              text-align: center;
            }
            /* Hide scrollbars in print window */
            ::-webkit-scrollbar { display: none; }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            ${ticketHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for content to load before printing (important for images if added later)
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Preview Container (styled to look like the ticket on screen too) */}
        <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-[70vh] overflow-y-auto">
          <div id="ticket-content" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '12px', color: 'black' }}>

            {/* Header */}
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold uppercase tracking-wider">ELECTROCAR REPUESTOS</h2>
              <p className="text-xs">de Juan Carlos Salcedo Ramirez</p>
              <p className="text-xs">Comercio de partes, piesas acessorios nuevos y usados para vehiculos automotores</p>
              <p className="text-xs">Mcal Jose Felix Estigarribia c/ Variante ruta ||</p>
              <p className="text-xs">Caacupe Coordillera Paraguay</p>
              <p className="text-xs">RUC: 2365284-5</p>
              <p className="text-xs">Tel: (0983) 135 111</p>
            </div>

            <div className="dashed-line" style={{ borderTop: '1px dashed black', margin: '5px 0' }}></div>

            {/* Info */}
            <div className="mb-2 text-xs">
              <p><strong>FECHA:</strong> {sale.date}</p>
              <p><strong>TICKET:</strong> #{sale._id ? sale._id.slice(-6).toUpperCase() : '---'}</p>
              <p><strong>CLIENTE:</strong> {getPersonName(sale.personId)}</p>
              <p><strong>CAJERO:</strong> {getCashierName(sale.cashierId)}</p>
            </div>

            <div className="dashed-line" style={{ borderTop: '1px dashed black', margin: '5px 0' }}></div>

            {/* Items Header */}
            <div className="flex justify-between text-xs font-bold mb-1">
              <span>DESC</span>
              <span>CANT x PRECIO</span>
              <span>TOTAL</span>
            </div>

            {/* Items List */}
            <div className="mb-2">
              {sale.details.map((item, index) => (
                <div key={index} className="mb-1">
                  <div className="text-xs font-bold">{item.name}</div>
                  <div className="flex justify-between text-xs">
                    <span></span> {/* Spacer */}
                    <span>{item.quantity} x {formatGuarani(item.price)}</span>
                    <span>{formatGuarani(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="dashed-line" style={{ borderTop: '1px dashed black', margin: '5px 0' }}></div>

            {/* Totals */}
            <div className="text-right">
              <div className="flex justify-between text-sm font-bold">
                <span>TOTAL:</span>
                <span>{formatGuarani(sale.total)}</span>
              </div>

              {sale.paymentMethod === 'efectivo' && (
                <>
                  <div className="flex justify-between text-xs mt-1">
                    <span>EFECTIVO:</span>
                    <span>{formatGuarani(sale.amountReceived)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>VUELTO:</span>
                    <span>{formatGuarani(sale.change)}</span>
                  </div>
                </>
              )}

              {sale.paymentMethod === 'mixto' && (
                <>
                  <div className="flex justify-between text-xs mt-1">
                    <span>PAGO EFECTIVO:</span>
                    <span>{formatGuarani(sale.cashAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>PAGO TARJETA:</span>
                    <span>{formatGuarani(sale.cardAmount)}</span>
                  </div>
                </>
              )}
              {sale.paymentMethod === 'tarjeta' && (
                <div className="flex justify-between text-xs mt-1">
                  <span>TARJETA:</span>
                  <span>{formatGuarani(sale.total)}</span>
                </div>
              )}
            </div>

            <div className="dashed-line" style={{ borderTop: '1px dashed black', margin: '5px 0' }}></div>

            {/* Footer */}
            <div className="text-center text-xs mt-4">
              <p>*** GRACIAS POR SU COMPRA ***</p>
              <p className="mt-1">No válido como comprobante fiscal</p>
            </div>

          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
          >
            Cerrar
          </button>
          <button
            onClick={printTicket}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleTicketModal;
// Cambio para forzar nuevo despliegue
