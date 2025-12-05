// frontend/src/utils/__tests__/cart.test.js
const { add, remove, setQuantity, deleteLine, CartError, computeTotals } = require('../cart');

describe('Cart utils (immutable) - unit tests', () => {
  const p1 = { productId: 'p1', name: 'Producto 1', price: 10.0, stock: 5 };
  const p2 = { productId: 'p2', name: 'Producto 2', price: 7.5, stock: 2 };

  test('Agregar producto nuevo', () => {
    const cart = [];
    const result = add(cart, p1, 2);
    // estado anterior no mutado
    expect(cart).toEqual([]);
    // nueva línea añadida
    expect(result.cart).toEqual([
      { productId: 'p1', name: 'Producto 1', price: 10, quantity: 2, subtotal: 20.0, stock: 5 }
    ]);
    expect(result.total).toBe(20.0);
  });

  test('Agregar producto existente (incrementa cantidad, no crea línea nueva)', () => {
    const cart = [
      { productId: 'p1', name: 'Producto 1', price: 10, quantity: 1, subtotal: 10.0, stock: 5 }
    ];
    const result = add(cart, p1, 3); // total 4 (<= stock)
    expect(result.cart.length).toBe(1);
    expect(result.cart[0].quantity).toBe(4);
    expect(result.cart[0].subtotal).toBe(40.0);
    expect(result.total).toBe(40.0);
  });

  test('Quitar cuando cantidad > 1 (decrementa cantidad)', () => {
    const cart = [
      { productId: 'p1', name: 'Producto 1', price: 10, quantity: 3, subtotal: 30.0, stock: 5 }
    ];
    const result = remove(cart, 'p1', 1);
    expect(result.cart.length).toBe(1);
    expect(result.cart[0].quantity).toBe(2);
    expect(result.cart[0].subtotal).toBe(20.0);
    expect(result.total).toBe(20.0);
  });

  test('Quitar cuando cantidad = 1 (elimina la línea)', () => {
    const cart = [
      { productId: 'p2', name: 'Producto 2', price: 7.5, quantity: 1, subtotal: 7.5, stock: 2 }
    ];
    const result = remove(cart, 'p2', 1);
    expect(result.cart.length).toBe(0);
    expect(result.total).toBe(0);
  });

  test('Intentar quitar un producto no presente (lanza NOT_FOUND)', () => {
    const cart = [
      { productId: 'p1', name: 'Producto 1', price: 10, quantity: 1, subtotal: 10.0, stock: 5 }
    ];
    expect(() => remove(cart, 'no-existe', 1)).toThrowError(CartError);
    try {
      remove(cart, 'no-existe', 1);
    } catch (err) {
      expect(err.code).toBe('NOT_FOUND');
    }
  });

  test('Intentar agregar más que el stock disponible (lanza OUT_OF_STOCK)', () => {
    const cart = [];
    expect(() => add(cart, p2, 5)).toThrowError(CartError);
    try {
      add(cart, p2, 5);
    } catch (err) {
      expect(err.code).toBe('OUT_OF_STOCK');
    }
  });

  test('setQuantity crea línea si no existe y elimina si se establece 0', () => {
    const cart = [];
    const res1 = setQuantity(cart, p1, 2);
    expect(res1.cart.length).toBe(1);
    expect(res1.cart[0].quantity).toBe(2);
    expect(res1.total).toBe(20.0);

    const res2 = setQuantity(res1.cart, p1, 0);
    expect(res2.cart.length).toBe(0);
    expect(res2.total).toBe(0);
  });

  test('computeTotals usa subtotal si existe y suma correctamente', () => {
    const cart = [
      { productId: 'p1', price: 10, quantity: 2, subtotal: 19.99, stock: 5 },
      { productId: 'p2', price: 5, quantity: 1, stock: 2 } // sin subtotal: price * qty = 5
    ];
    const { total } = computeTotals(cart);
    // 19.99 + 5 = 24.99
    expect(total).toBeCloseTo(24.99, 2);
  });
});