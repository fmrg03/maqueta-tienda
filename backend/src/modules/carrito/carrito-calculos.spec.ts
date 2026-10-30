import {
  calcularCobro,
  calcularFaltantes,
  CarritoNoCerrableError,
  planificarSalidas,
  totalItems,
  type VarianteCalculo,
} from './carrito-calculos';

const v = (id: string, venta: number, costo: number): VarianteCalculo => ({
  id,
  skuVariante: `SKU-${id}`,
  precioVenta: venta,
  precioCosto: costo,
});

describe('carrito-calculos', () => {
  describe('totalItems', () => {
    it('suma cantidad × precio y marca parcial si falta algún precio', () => {
      const r = totalItems([
        { cantidad: 2, precioUnitario: '8.00' },
        { cantidad: 1, precioUnitario: null },
      ]);
      expect(r).toEqual({ total: 16, parcial: true });
    });
  });

  describe('planificarSalidas', () => {
    it('una variante sale directo con su precio pactado', () => {
      const a = v('a', 10, 6);
      const [s] = planificarSalidas([{ cantidad: 3, precioUnitario: 9, variante: a }]);
      expect(s).toMatchObject({ cantidad: 3, precioVentaUnitario: 9, precioCostoUnitario: 6 });
    });

    it('agrupa la misma variante repetida en una sola salida', () => {
      const a = v('a', 10, 6);
      const r = planificarSalidas([
        { cantidad: 2, precioUnitario: 10, variante: a },
        { cantidad: 3, precioUnitario: 10, variante: a },
      ]);
      expect(r).toHaveLength(1);
      expect(r[0].cantidad).toBe(5);
    });

    it('expande un combo y reparte el ingreso proporcional al precio de lista', () => {
      const a = v('a', 10, 5);
      const b = v('b', 30, 20);
      const r = planificarSalidas([
        {
          cantidad: 2,
          precioUnitario: 36, // combo con descuento (lista = 40)
          combo: { items: [{ cantidad: 1, variante: a }, { cantidad: 1, variante: b }] },
        },
      ]);
      const ingreso = r.reduce((s, x) => s + x.cantidad * x.precioVentaUnitario, 0);
      expect(r.find((x) => x.variante.id === 'a')!.cantidad).toBe(2);
      expect(ingreso).toBeCloseTo(72, 2);
      expect(r.find((x) => x.variante.id === 'a')!.precioVentaUnitario).toBeCloseTo(9, 3);
      expect(r.find((x) => x.variante.id === 'b')!.precioVentaUnitario).toBeCloseTo(27, 3);
    });

    it('escala todo para que la suma sea exactamente el monto cobrado', () => {
      const a = v('a', 10, 5);
      const b = v('b', 20, 10);
      const r = planificarSalidas(
        [
          { cantidad: 1, precioUnitario: 10, variante: a },
          { cantidad: 2, precioUnitario: 20, variante: b },
        ],
        45, // lista = 50, el cliente pagó 45
      );
      const ingreso = r.reduce((s, x) => s + x.cantidad * x.precioVentaUnitario, 0);
      expect(ingreso).toBeCloseTo(45, 2);
    });

    it('rechaza materiales genéricos, ítems sin precio y combos vacíos', () => {
      expect(() =>
        planificarSalidas([{ cantidad: 1, precioUnitario: 5, material: { nombre: 'Cemento' } }]),
      ).toThrow(CarritoNoCerrableError);
      expect(() =>
        planificarSalidas([{ cantidad: 1, precioUnitario: null, variante: v('a', 1, 1) }]),
      ).toThrow(CarritoNoCerrableError);
      expect(() =>
        planificarSalidas([{ cantidad: 1, precioUnitario: 5, combo: { items: [] } }]),
      ).toThrow(CarritoNoCerrableError);
    });
  });

  describe('calcularFaltantes', () => {
    it('devuelve solo lo que no alcanza', () => {
      const a = v('a', 10, 5);
      const b = v('b', 10, 5);
      const salidas = planificarSalidas([
        { cantidad: 5, precioUnitario: 10, variante: a },
        { cantidad: 2, precioUnitario: 10, variante: b },
      ]);
      const f = calcularFaltantes(salidas, new Map([['a', 3], ['b', 10]]));
      expect(f).toEqual([
        { varianteId: 'a', sku: 'SKU-a', requerido: 5, disponible: 3, faltan: 2 },
      ]);
    });
  });

  describe('calcularCobro', () => {
    const base = { base: 100, divisas: true, aplicarDescuento: true, porcentaje: 10, tasa: 40 };

    it('aplica el descuento por divisas y convierte a bolívares', () => {
      expect(calcularCobro(base)).toEqual({ monto: 90, descuentoPct: 10, descuentoMonto: 10, montoBs: 3600 });
    });

    it('sin descuento si el método no es en divisas o se desmarca', () => {
      expect(calcularCobro({ ...base, divisas: false }).monto).toBe(100);
      expect(calcularCobro({ ...base, aplicarDescuento: false })).toMatchObject({ monto: 100, descuentoPct: null, descuentoMonto: null });
    });

    it('sin descuento si el porcentaje configurado es 0', () => {
      expect(calcularCobro({ ...base, porcentaje: 0 }).descuentoPct).toBeNull();
    });

    it('un monto manual manda sobre el descuento y no registra porcentaje', () => {
      expect(calcularCobro({ ...base, montoManual: 85 })).toEqual({ monto: 85, descuentoPct: null, descuentoMonto: null, montoBs: 3400 });
    });

    it('redondea a centavos', () => {
      const r = calcularCobro({ ...base, base: 33.33, porcentaje: 7.5, tasa: 36.1234 });
      expect(r.descuentoMonto).toBe(2.5);
      expect(r.monto).toBe(30.83);
      expect(r.montoBs).toBeCloseTo(30.83 * 36.1234, 2);
    });
  });
});
