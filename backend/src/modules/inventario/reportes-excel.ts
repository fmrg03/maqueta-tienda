import * as ExcelJS from 'exceljs';
import { ReportesService } from './reportes.service';

export type SeccionReporte = 'ventas' | 'mercancia' | 'proveedores' | 'asesorias';
export const SECCIONES: SeccionReporte[] = ['ventas', 'mercancia', 'proveedores', 'asesorias'];
const ESTADOS_ASESORIA: Record<string, string> = { pendiente: 'Pendiente', llamada_realizada: 'Llamada realizada', visita_pactada: 'Visita pactada', no_procede: 'No procede', cancelada: 'Cancelada' };

const USD = '"$"#,##0.00';
const attrs = (a: Record<string, string>) => Object.values(a ?? {}).join(' / ');
const fechaVE = (iso: string) =>
  new Date(iso).toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'short', timeStyle: 'short' });
const METODOS: Record<string, string> = {
  efectivo: 'Efectivo (Bs)', efectivo_divisas: 'Efectivo (divisas)', pago_movil: 'Pago móvil',
  transferencia: 'Transferencia', zelle: 'Zelle', binance: 'Binance', otro: 'Otro',
};

function hoja(
  wb: ExcelJS.Workbook,
  nombre: string,
  columnas: Array<{ header: string; key: string; width: number; formato?: string }>,
  filas: Array<Record<string, unknown>>,
) {
  const ws = wb.addWorksheet(nombre);
  ws.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.formato ? { numFmt: c.formato } : {} }));
  ws.addRows(filas);
  const cab = ws.getRow(1);
  cab.font = { bold: true };
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E2D4' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return ws;
}

export async function construirLibro(
  seccion: SeccionReporte,
  svc: ReportesService,
  desde: string,
  hasta: string,
  agrupacion: 'semana' | 'mes' | 'anio',
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Revestimiento Élite RY';

  if (seccion === 'ventas') {
    const [g, ventas] = await Promise.all([svc.reporteGanancias(desde, hasta, agrupacion), svc.reporteVentas(desde, hasta)]);
    hoja(wb, 'Ventas', [
      { header: 'Nº pedido', key: 'numero', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Método de pago', key: 'metodo', width: 20 },
      { header: 'Ref. de pago', key: 'ref', width: 18 },
      { header: 'Ventas (USD)', key: 'ventas', width: 14, formato: USD },
      { header: 'Costo (USD)', key: 'costo', width: 14, formato: USD },
      { header: 'Ganancia (USD)', key: 'ganancia', width: 14, formato: USD },
    ], ventas.map((v) => ({ numero: v.numero, fecha: fechaVE(v.fecha), cliente: v.cliente, metodo: v.metodoPago ? METODOS[v.metodoPago] ?? v.metodoPago : '', ref: v.referenciaPago ?? '', ventas: v.ventas, costo: v.costo, ganancia: v.ganancia })));
    hoja(wb, 'Por período', [
      { header: 'Período (inicio)', key: 'p', width: 18 },
      { header: 'Ventas (USD)', key: 'v', width: 14, formato: USD },
      { header: 'Costo (USD)', key: 'c', width: 14, formato: USD },
      { header: 'Ganancia (USD)', key: 'g', width: 14, formato: USD },
    ], [...g.serie.map((s) => ({ p: s.periodo, v: s.ventas, c: s.costo, g: s.ganancia })), { p: 'TOTAL', v: g.totalVentas, c: g.totalCosto, g: g.ganancia }]);
  }

  if (seccion === 'mercancia') {
    const [mov, top, stock] = await Promise.all([
      svc.reporteInventario({ desde, hasta, agrupacion }),
      svc.reporteMasVendidos(desde, hasta),
      svc.reporteStock(),
    ]);
    hoja(wb, 'Entradas y salidas', [
      { header: 'Período (inicio)', key: 'p', width: 18 },
      { header: 'Entradas (und.)', key: 'e', width: 16 },
      { header: 'Salidas (und.)', key: 's', width: 16 },
    ], mov.map((m) => ({ p: m.periodo, e: m.entradas, s: m.salidas })));
    hoja(wb, 'Más vendidos', [
      { header: 'Material', key: 'm', width: 32 },
      { header: 'Presentación', key: 'a', width: 24 },
      { header: 'SKU', key: 'k', width: 16 },
      { header: 'Unidades', key: 'u', width: 12 },
      { header: 'Ventas (USD)', key: 'v', width: 14, formato: USD },
      { header: 'Ganancia (USD)', key: 'g', width: 14, formato: USD },
    ], top.map((t) => ({ m: t.material, a: attrs(t.atributos), k: t.sku, u: t.unidades, v: t.ventas, g: t.ganancia })));
    hoja(wb, 'Stock actual', [
      { header: 'Material', key: 'm', width: 32 },
      { header: 'Presentación', key: 'a', width: 24 },
      { header: 'SKU', key: 'k', width: 16 },
      { header: 'Stock', key: 's', width: 10 },
      { header: 'Valor a costo (USD)', key: 'c', width: 18, formato: USD },
      { header: 'Valor a precio de venta (USD)', key: 'v', width: 24, formato: USD },
    ], stock.items.map((i) => ({ m: i.material, a: attrs(i.atributos), k: i.sku, s: i.stock, c: i.valorCosto, v: i.valorVenta })));
  }

  if (seccion === 'proveedores') {
    const c = await svc.reporteCompras(desde, hasta);
    hoja(wb, 'Por proveedor', [
      { header: 'Proveedor', key: 'p', width: 30 },
      { header: 'Entradas', key: 'e', width: 10 },
      { header: 'Unidades', key: 'u', width: 10 },
      { header: 'Total pagado (USD)', key: 't', width: 20, formato: USD },
      { header: 'Entradas sin costo', key: 's', width: 18 },
    ], [...c.porProveedor.map((r) => ({ p: r.proveedor, e: r.entradas, u: r.unidades, t: r.total, s: r.sinCosto })), { p: 'TOTAL', u: c.unidades, t: c.totalPagado }]);
    hoja(wb, 'Detalle de compras', [
      { header: 'Fecha', key: 'f', width: 18 },
      { header: 'Proveedor', key: 'p', width: 28 },
      { header: 'Material', key: 'm', width: 30 },
      { header: 'Presentación', key: 'a', width: 22 },
      { header: 'SKU', key: 'k', width: 16 },
      { header: 'Unidades', key: 'u', width: 10 },
      { header: 'Costo unit. (USD)', key: 'c', width: 16, formato: USD },
      { header: 'Total (USD)', key: 't', width: 14, formato: USD },
      { header: 'Motivo / nota', key: 'n', width: 30 },
    ], c.detalle.map((d) => ({ f: fechaVE(d.fecha), p: d.proveedor ?? 'Sin proveedor indicado', m: d.material, a: attrs(d.atributos), k: d.sku, u: d.unidades, c: d.costoUnitario ?? '', t: d.total ?? '', n: d.motivo ?? '' })));
  }
  if (seccion === 'asesorias') {
    const a = await svc.reporteAsesorias(desde, hasta);
    hoja(wb, 'Por asesor', [
      { header: 'Asesor', key: 'a', width: 28 },
      { header: 'Total', key: 't', width: 10 },
      { header: 'Pendientes', key: 'p', width: 12 },
      { header: 'Llamada realizada', key: 'l', width: 18 },
      { header: 'Visita pactada', key: 'v', width: 16 },
      { header: 'No procede', key: 'n', width: 12 },
      { header: 'Canceladas', key: 'c', width: 12 },
    ], a.porAsesor.map((r) => ({ a: r.asesor, t: r.total, p: r.pendiente, l: r.llamadaRealizada, v: r.visitaPactada, n: r.noProcede, c: r.cancelada })));
    hoja(wb, 'Citas', [
      { header: 'Fecha de la llamada', key: 'f', width: 20 },
      { header: 'Cliente', key: 'c', width: 28 },
      { header: 'Teléfono', key: 't', width: 16 },
      { header: 'Asesor', key: 'a', width: 26 },
      { header: 'Estado', key: 'e', width: 20 },
    ], a.detalle.map((d) => ({ f: fechaVE(d.fecha), c: d.cliente, t: d.telefono, a: d.asesor, e: ESTADOS_ASESORIA[d.estado] ?? d.estado })));
  }
  return wb;
}
