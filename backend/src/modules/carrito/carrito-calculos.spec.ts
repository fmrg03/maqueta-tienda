import {
  abonoPorDefecto,
  resumenCobro,
  totalesPedido,
  calcularFaltantes,
  CarritoNoCerrableError,
  planificarSalidas,
  repartirCobro,
  totalServicios,
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

  describe('totalesPedido / abonos', () => {
    const items = [
      { cantidad: 10, precioUnitario: 10, precioDivisasUnitario: 8 },
      { cantidad: 2, precioUnitario: 50, precioDivisasUnitario: null },
    ];

    it('calcula el total BCV y el de divisas (sin precio de divisas vale el normal)', () => {
      const t = totalesPedido(items, []);
      expect(t.bcv).toBe(200);
      expect(t.divisas).toBe(180);
      expect(t.factor).toBeCloseTo(0.9, 5);
    });

    it('los servicios valen igual en divisas y en BCV', () => {
      const t = totalesPedido(items, [{ cantidad: 1, precioUnitario: 100 }]);
      expect(t.bcv).toBe(300);
      expect(t.divisas).toBe(280);
      expect(t.serviciosBcv).toBe(100);
    });

    it('con total fijado aplica la misma proporción a divisas', () => {
      const t = totalesPedido(items, [], 100);
      expect(t.bcv).toBe(100);
      expect(t.divisas).toBe(90);
    });

    it('abonoPorDefecto: en divisas un monto menor cubre la misma deuda', () => {
      expect(abonoPorDefecto('zelle', 90, 0.9)).toBe(100);
      expect(abonoPorDefecto('pago_movil', 90, 0.9)).toBe(90);
      expect(abonoPorDefecto('binance', 50, 1)).toBe(50);
    });

    it('resumenCobro: saldo, cobro completo con tolerancia de centavos', () => {
      const t = totalesPedido(items, []);
      const parcial = resumenCobro(t, [{ monto: 60, abona: 60 }, { monto: 45, abona: 50 }]);
      expect(parcial.recibido).toBe(105);
      expect(parcial.abonado).toBe(110);
      expect(parcial.saldo).toBe(90);
      expect(parcial.saldoDivisas).toBe(81);
      expect(parcial.pagadoCompleto).toBe(false);
      const completo = resumenCobro(t, [{ monto: 100, abona: 100 }, { monto: 90, abona: 99.995 }]);
      expect(completo.pagadoCompleto).toBe(true);
      expect(completo.saldo).toBe(0);
    });
  });
});

describe('servicios (mano de obra)', () => {
  it('totalServicios suma cantidad × precio con decimales', () => {
    expect(totalServicios([{ cantidad: 12.5, precioUnitario: 6.4 }, { cantidad: '2', precioUnitario: '10.00' }])).toBe(100);
    expect(totalServicios(undefined)).toBe(0);
  });

  it('repartirCobro divide lo cobrado en proporción y suma exacto', () => {
    const r = repartirCobro(90, 100, 100);
    expect(r).toEqual({ productos: 45, servicios: 45 });
    const t = repartirCobro(93.6, 24, 80);
    expect(t.productos + t.servicios).toBeCloseTo(93.6, 2);
    expect(t.servicios).toBe(72);
  });

  it('repartirCobro: solo productos o solo servicios', () => {
    expect(repartirCobro(50, 50, 0)).toEqual({ productos: 50, servicios: 0 });
    expect(repartirCobro(50, 0, 50)).toEqual({ productos: 0, servicios: 50 });
  });

  it('planificarSalidas sin ítems no genera salidas', () => {
    expect(planificarSalidas([], 0)).toEqual([]);
  });

  it('con servicios fijos el reparto les deja su parte completa', () => {
    expect(repartirCobro(190, 100, 100, 100)).toEqual({ productos: 90, servicios: 100 });
  });
});
