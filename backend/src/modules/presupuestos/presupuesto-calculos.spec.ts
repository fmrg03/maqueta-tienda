import { calcularTotales, importeLinea } from './presupuesto-calculos';

describe('presupuesto-calculos', () => {
  const lineas = [
    { tipo: 'producto' as const, cantidad: 10, precioUnitario: '8.00' },
    { tipo: 'combo' as const, cantidad: 1, precioUnitario: 14 },
    { tipo: 'servicio' as const, cantidad: 12.5, precioUnitario: '6.40' },
  ];

  it('importe de una línea redondea a centavos', () => {
    expect(importeLinea({ cantidad: 3, precioUnitario: 0.335 })).toBe(1.01);
    expect(importeLinea({ cantidad: '2.5', precioUnitario: '4.00' })).toBe(10);
  });

  it('separa productos/combos de servicios y suma', () => {
    const t = calcularTotales(lineas);
    expect(t.subtotalProductos).toBe(94);
    expect(t.subtotalServicios).toBe(80);
    expect(t.subtotal).toBe(174);
    expect(t.descuentoMonto).toBe(0);
    expect(t.total).toBe(174);
  });

  it('aplica el descuento sobre el subtotal general', () => {
    const t = calcularTotales(lineas, 10);
    expect(t.descuentoMonto).toBe(17.4);
    expect(t.total).toBe(156.6);
  });

  it('acota el descuento a 0–100 y tolera valores raros', () => {
    expect(calcularTotales(lineas, 150).total).toBe(0);
    expect(calcularTotales(lineas, -5).total).toBe(174);
    expect(calcularTotales(lineas, 'x').total).toBe(174);
  });

  it('presupuesto vacío da cero', () => {
    expect(calcularTotales([]).total).toBe(0);
  });
});
