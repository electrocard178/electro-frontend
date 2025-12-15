import React, { useState, useEffect } from 'react';
import { serviceService } from '../services/apiService';

const ServiceForm = ({ onSave, onCancel, products = [], initialData = null, currentUser, token }) => {
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        supplies: []
    });
    const [selectedProduct, setSelectedProduct] = useState('');
    const [supplyQuantity, setSupplyQuantity] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                supplies: initialData.supplies ? initialData.supplies.map(s => ({
                    productId: s.productId._id || s.productId,
                    name: s.productId.name || 'Producto desconocido',
                    quantity: s.quantity
                })) : []
            });
        }
    }, [initialData]);

    const handleAddSupply = () => {
        if (!selectedProduct) return;

        // Validar cantidad
        const qty = parseFloat(supplyQuantity);
        if (!qty || qty <= 0) {
            alert('Ingrese una cantidad válida');
            return;
        }

        const product = products.find(p => p._id === selectedProduct);
        if (!product) return;

        // Verificar si ya existe
        if (formData.supplies.some(s => s.productId === selectedProduct)) {
            alert('Este insumo ya está agregado');
            return;
        }

        setFormData(prev => ({
            ...prev,
            supplies: [...prev.supplies, {
                productId: product._id,
                name: product.name,
                quantity: qty
            }]
        }));

        setSelectedProduct('');
        setSupplyQuantity('');
    };

    const handleRemoveSupply = (index) => {
        setFormData(prev => ({
            ...prev,
            supplies: prev.supplies.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) {
            setError('Nombre y precio son requeridos');
            return;
        }

        try {
            // Preparar datos para API (solo enviar IDs de productos)
            const serviceData = {
                ...formData,
                price: parseFloat(formData.price),
                adminPercentage: parseFloat(formData.adminPercentage !== undefined ? formData.adminPercentage : 100),
                supplies: formData.supplies.map(s => ({
                    productId: s.productId,
                    quantity: parseFloat(s.quantity)
                }))
            };

            await onSave(serviceData);
        } catch (err) {
            setError('Error al guardar el servicio: ' + err.message);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(amount);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <div className="relative bg-white rounded-xl shadow-2xl p-8 m-4 max-w-2xl w-full">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                    {initialData ? 'Editar Servicio' : 'Nuevo Servicio'}
                </h3>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Nombre del Servicio</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Precio (Gs)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                required
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                % Ganancia Local (Admin)
                                <span className="ml-1 text-xs font-normal text-gray-500" title="Si el admin hace el servicio gana 100%. Si lo hace un empleado, el local retiene este porcentaje.">ℹ️</span>
                            </label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.adminPercentage !== undefined ? formData.adminPercentage : 100}
                                onChange={(e) => setFormData({ ...formData, adminPercentage: e.target.value })}
                                required
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Descripción</label>
                        <textarea
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows="2"
                        />
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="text-lg font-semibold mb-3">Insumos Requeridos</h4>
                        <div className="flex gap-2 mb-4 items-end">
                            <div className="flex-grow">
                                <label className="block text-gray-700 text-xs font-bold mb-1">Buscar Insumo (Producto)</label>
                                <select
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg"
                                    value={selectedProduct}
                                    onChange={(e) => setSelectedProduct(e.target.value)}
                                >
                                    <option value="">Seleccionar insumo...</option>
                                    {products.map(p => (
                                        <option key={p._id} value={p._id}>{p.name} (Stock: {p.stock})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-gray-700 text-xs font-bold mb-1">Cant.</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg"
                                    value={supplyQuantity}
                                    onChange={(e) => setSupplyQuantity(e.target.value)}
                                    placeholder="1"
                                    min="0.001"
                                    step="0.001"
                                />
                            </div>
                            <button
                                type="button"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                onClick={handleAddSupply}
                            >
                                Agregar
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                            {formData.supplies.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center">No hay insumos agregados</p>
                            ) : (
                                <ul className="space-y-2">
                                    {formData.supplies.map((supply, index) => (
                                        <li key={index} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                            <span className="text-sm">{supply.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold">{supply.quantity} u.</span>
                                                <button
                                                    type="button"
                                                    className="text-red-500 hover:text-red-700"
                                                    onClick={() => handleRemoveSupply(index)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Guardar Servicio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ServiceForm;
