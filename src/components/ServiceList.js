import React, { useState } from 'react';
import ServiceForm from './ServiceForm';
import { serviceService } from '../services/apiService';

const ServiceList = ({ services, products, currentUser, token, onRefresh }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSave = async (serviceData) => {
        try {
            if (editingService) {
                await serviceService.update(token, currentUser, editingService._id, serviceData);
            } else {
                await serviceService.create(token, currentUser, serviceData);
            }
            setShowForm(false);
            setEditingService(null);
            if (onRefresh) onRefresh();
            alert('Servicio guardado exitosamente');
        } catch (error) {
            alert('Error guardando servicio: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Está seguro de eliminar este servicio?')) {
            try {
                await serviceService.delete(token, currentUser, id);
                if (onRefresh) onRefresh();
            } catch (error) {
                alert('Error eliminando servicio: ' + error.message);
            }
        }
    };

    const filteredServices = services.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(amount);
    };

    return (
        <div className="h-full flex flex-col relative"
            style={{
                backgroundImage: 'url(/fondo.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>

            <div className="relative z-10 p-6 h-full overflow-hidden flex flex-col">
                <div className="bg-white bg-opacity-90 rounded-2xl shadow-xl p-6 mb-6 flex-shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-3xl font-extrabold text-blue-900">Servicios de Peluquería</h2>

                        <div className="flex gap-3 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Buscar servicio..."
                                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition duration-200 font-bold shadow-lg"
                            >
                                + Nuevo Servicio
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white bg-opacity-90 rounded-2xl shadow-xl p-6 flex-grow overflow-y-auto">
                    {filteredServices.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-xl">
                            No hay servicios registrados
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredServices.map(service => (
                                <div key={service._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-gray-800">{service.name}</h3>
                                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                                {service.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>

                                        <p className="text-gray-600 mb-4 h-12 overflow-hidden text-sm">
                                            {service.description || 'Sin descripción'}
                                        </p>

                                        <div className="flex justify-between items-end">
                                            <div className="text-2xl font-bold text-green-600">
                                                {formatCurrency(service.price)}
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                            <p className="text-xs text-gray-500 mb-2 font-semibold">Insumos:</p>
                                            {service.supplies && service.supplies.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {service.supplies.map((s, idx) => (
                                                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                            {s.productId?.name || 'Item'} ({s.quantity})
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-gray-400">Sin insumos configurados</span>
                                            )}
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingService(service);
                                                    setShowForm(true);
                                                }}
                                                className="flex-1 bg-yellow-100 text-yellow-700 py-2 rounded-lg hover:bg-yellow-200 font-medium text-sm transition-colors"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service._id)}
                                                className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 font-medium text-sm transition-colors"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {(showForm || editingService) && (
                <ServiceForm
                    products={products}
                    initialData={editingService}
                    currentUser={currentUser}
                    token={token}
                    onSave={handleSave}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingService(null);
                    }}
                />
            )}
        </div>
    );
};

export default ServiceList;
