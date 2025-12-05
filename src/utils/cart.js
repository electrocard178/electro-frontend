// frontend/src/utils/cart.js
'use strict';

/**
 * Módulo de utilidades para carrito (inmutable, atómico a nivel de función).
 * API mínima exportada:
 * - add(cart, product, quantity=1)
 * - remove(cart, productId, quantity=1)
 * - setQuantity(cart, product, quantity)
 * - deleteLine(cart, productId)
 * - computeTotals(cart)
 *
 * Cada función devuelve un objeto { cart: newCartArray, total: number } sin mutar el array original.
 * Errores lanzados: CartError con .code (MISSING_PRODUCT, INVALID_QUANTITY, INVALID_PRODUCT, OUT_OF_STOCK, NOT_FOUND)
 */

class CartError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CartError';
    this.code = code;
  }
}

const getProductId = (product) => product && (product.productId ?? product.id ?? product.productID ?? product.sku);

/**
 * computeTotals(cart)
 * - Calcula el total sumando subtotales de línea (o price * quantity si subtotal no existe)
 * - Retorna { cart, total }
 */
function computeTotals(cart) {
  const total = cart.reduce((sum, line) => sum + (line.subtotal ?? (line.price * line.quantity)), 0);
  return { cart, total: Number(total.toFixed(2)) };
}

/**
 * add(cart, product, quantity=1)
 * - Añade cantidad a la línea existente o crea nueva línea si no existe.
 * - Valida stock (product.stock).
 * - Retorna nuevo estado inmutable y total actualizado.
 */
function add(cart = [], product, quantity = 1) {
  if (!product) throw new CartError('Product required', 'MISSING_PRODUCT');
  quantity = Math.trunc(quantity);
  if (quantity <= 0) throw new CartError('Quantity must be positive', 'INVALID_QUANTITY');

  const productId = getProductId(product);
  if (!productId) throw new CartError('productId not found on product object', 'INVALID_PRODUCT');

  const stock = Number.isFinite(product.stock) ? product.stock : Infinity;
  const price = Number(product.price ?? 0);

  const existingIndex = cart.findIndex(l => l.productId === productId);

  if (existingIndex === -1) {
    if (quantity > stock) throw new CartError('Not enough stock', 'OUT_OF_STOCK');
    const newLine = {
      productId,
      name: product.name ?? product.title ?? '',
      price,
      quantity,
      subtotal: Number((price * quantity).toFixed(2)),
      stock
    };
    const newCart = [...cart, newLine];
    return computeTotals(newCart);
  } else {
    const existing = cart[existingIndex];
    const newQty = existing.quantity + quantity;
    if (newQty > stock) throw new CartError('Not enough stock to add', 'OUT_OF_STOCK');
    const newLine = {
      ...existing,
      quantity: newQty,
      price, // prefer provided price
      subtotal: Number((price * newQty).toFixed(2)),
      stock,
      name: existing.name ?? product.name ?? ''
    };
    const newCart = [...cart.slice(0, existingIndex), newLine, ...cart.slice(existingIndex + 1)];
    return computeTotals(newCart);
  }
}

/**
 * remove(cart, productId, quantity=1)
 * - Decrementa la cantidad de la línea.
 * - Si la cantidad resultante <= 0 elimina la línea.
 * - Si producto no está en carrito lanza CartError('NOT_FOUND').
 */
function remove(cart = [], productId, quantity = 1) {
  quantity = Math.trunc(quantity);
  if (quantity <= 0) throw new CartError('Quantity must be positive', 'INVALID_QUANTITY');

  const existingIndex = cart.findIndex(l => l.productId === productId);
  if (existingIndex === -1) throw new CartError('Product not in cart', 'NOT_FOUND');

  const existing = cart[existingIndex];
  const newQty = existing.quantity - quantity;

  if (newQty > 0) {
    const newLine = { ...existing, quantity: newQty, subtotal: Number((existing.price * newQty).toFixed(2)) };
    const newCart = [...cart.slice(0, existingIndex), newLine, ...cart.slice(existingIndex + 1)];
    return computeTotals(newCart);
  } else {
    // eliminar la línea
    const newCart = [...cart.slice(0, existingIndex), ...cart.slice(existingIndex + 1)];
    return computeTotals(newCart);
  }
}

/**
 * setQuantity(cart, product, quantity)
 * - Establece la cantidad de la línea. Si quantity === 0 elimina la línea.
 * - Requiere el objeto producto (para comprobación de stock y precio si la línea no existía).
 */
function setQuantity(cart = [], product, quantity) {
  quantity = Math.trunc(quantity);
  if (quantity < 0) throw new CartError('Quantity cannot be negative', 'INVALID_QUANTITY');
  if (!product) throw new CartError('Product required for stock check', 'MISSING_PRODUCT');

  const productId = getProductId(product);
  if (!productId) throw new CartError('productId not found on product object', 'INVALID_PRODUCT');

  const stock = Number.isFinite(product.stock) ? product.stock : Infinity;
  if (quantity > stock) throw new CartError('Not enough stock', 'OUT_OF_STOCK');

  const existingIndex = cart.findIndex(l => l.productId === productId);

  if (existingIndex === -1) {
    if (quantity === 0) return computeTotals([...cart]); // no-op
    const price = Number(product.price ?? 0);
    const newLine = {
      productId,
      name: product.name ?? '',
      price,
      quantity,
      subtotal: Number((price * quantity).toFixed(2)),
      stock
    };
    const newCart = [...cart, newLine];
    return computeTotals(newCart);
  } else {
    if (quantity === 0) {
      const newCart = [...cart.slice(0, existingIndex), ...cart.slice(existingIndex + 1)];
      return computeTotals(newCart);
    } else {
      const existing = cart[existingIndex];
      const price = existing.price ?? Number(product.price ?? 0);
      const newLine = {
        ...existing,
        quantity,
        price,
        subtotal: Number((price * quantity).toFixed(2)),
        stock,
        name: existing.name ?? product.name ?? ''
      };
      const newCart = [...cart.slice(0, existingIndex), newLine, ...cart.slice(existingIndex + 1)];
      return computeTotals(newCart);
    }
  }
}

/**
 * deleteLine(cart, productId)
 * - Elimina completamente la línea (no lanza error si no existe).
 */
function deleteLine(cart = [], productId) {
  const existingIndex = cart.findIndex(l => l.productId === productId);
  if (existingIndex === -1) return computeTotals([...cart]);
  const newCart = [...cart.slice(0, existingIndex), ...cart.slice(existingIndex + 1)];
  return computeTotals(newCart);
}

module.exports = {
  CartError,
  add,
  remove,
  setQuantity,
  deleteLine,
  computeTotals
};