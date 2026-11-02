import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { join } from 'path';
import { EMPRESA } from './empresa';
import { calcularTotales, importeLinea } from './presupuesto-calculos';

export interface DatosPdfPresupuesto {
  numero: number;
  fecha: Date;
  validezDias: number;
  clienteNombre: string;
  clienteTelefono?: string | null;
  obra?: string | null;
  notas?: string | null;
  descuentoPct: number;
  items: Array<{
    tipo: 'producto' | 'combo' | 'servicio';
    descripcion: string;
    unidad: string;
    cantidad: number;
    precioUnitario: number;
  }>;
  /** Tasa BCV vigente (Bs/USD) para mostrar el equivalente referencial. */
  tasaBcv?: number | null;
  telefonoEmpresa?: string | null;
}

const ORO = '#B8902A';
const TINTA = '#1A1710';
const SUAVE = '#6B6455';
const FONDO = '#F3EEE2';
const MARGEN = 48;
const ANCHO = 595.28 - MARGEN * 2;
const LIMITE_Y = 842 - 96;

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const bs = (n: number) => `Bs. ${n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cant = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString('es-VE', { maximumFractionDigits: 2 }));
const fechaVE = (d: Date) =>
  new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);

const LOGO = join(__dirname, '..', '..', '..', 'assets', 'logo.png');

export function numeroFormateado(n: number): string {
  return String(n).padStart(4, '0');
}

export function construirPdfPresupuesto(d: DatosPdfPresupuesto): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGEN, bufferPages: true, info: { Title: `Presupuesto ${numeroFormateado(d.numero)}`, Author: EMPRESA.nombre } });
    const trozos: Buffer[] = [];
    doc.on('data', (t: Buffer) => trozos.push(t));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    // --- Encabezado ---
    let yTitulo = MARGEN;
    if (existsSync(LOGO)) {
      doc.image(LOGO, MARGEN, MARGEN, { height: 54 });
      yTitulo = MARGEN + 62;
    } else {
      doc.font('Helvetica-Bold').fontSize(20).fillColor(ORO).text(EMPRESA.nombre, MARGEN, MARGEN, { width: 300 });
      yTitulo = MARGEN + 28;
    }
    doc.font('Helvetica').fontSize(9).fillColor(SUAVE).text(EMPRESA.direccion, MARGEN, yTitulo, { width: 300 });
    doc.text(EMPRESA.horario, MARGEN, doc.y, { width: 300 });
    if (d.telefonoEmpresa) doc.text(`WhatsApp: ${d.telefonoEmpresa}`, MARGEN, doc.y, { width: 300 });

    const xDer = MARGEN + ANCHO - 190;
    doc.font('Helvetica-Bold').fontSize(18).fillColor(TINTA).text('PRESUPUESTO', xDer, MARGEN, { width: 190, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor(SUAVE);
    doc.text(`N° ${numeroFormateado(d.numero)}`, xDer, MARGEN + 26, { width: 190, align: 'right' });
    doc.text(`Fecha: ${fechaVE(d.fecha)}`, xDer, doc.y, { width: 190, align: 'right' });
    const vence = new Date(d.fecha.getTime() + d.validezDias * 86_400_000);
    doc.text(`Válido hasta: ${fechaVE(vence)}`, xDer, doc.y, { width: 190, align: 'right' });

    let y = Math.max(doc.y, yTitulo + 40) + 14;
    doc.moveTo(MARGEN, y).lineTo(MARGEN + ANCHO, y).lineWidth(1.5).strokeColor(ORO).stroke();
    y += 14;

    // --- Cliente ---
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TINTA).text('Cliente', MARGEN, y);
    doc.font('Helvetica').fontSize(11).fillColor(TINTA).text(d.clienteNombre, MARGEN, doc.y + 2, { width: ANCHO });
    doc.fontSize(9.5).fillColor(SUAVE);
    if (d.clienteTelefono) doc.text(`Teléfono: ${d.clienteTelefono}`, MARGEN, doc.y + 1, { width: ANCHO });
    if (d.obra) doc.text(`Obra: ${d.obra}`, MARGEN, doc.y + 1, { width: ANCHO });
    y = doc.y + 16;

    // --- Tabla ---
    const col = { desc: MARGEN + 8, unidad: MARGEN + 290, cant: MARGEN + 340, precio: MARGEN + 385, importe: MARGEN + 450 };
    const w = { desc: 275, unidad: 46, cant: 40, precio: 60, importe: ANCHO - 450 - 8 };

    const encabezadoTabla = (yy: number): number => {
      doc.rect(MARGEN, yy, ANCHO, 22).fill(TINTA);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#F3EEE2');
      doc.text('Descripción', col.desc, yy + 7, { width: w.desc });
      doc.text('Unidad', col.unidad, yy + 7, { width: w.unidad });
      doc.text('Cant.', col.cant, yy + 7, { width: w.cant, align: 'right' });
      doc.text('P. unit.', col.precio, yy + 7, { width: w.precio, align: 'right' });
      doc.text('Importe', col.importe, yy + 7, { width: w.importe, align: 'right' });
      return yy + 22;
    };

    const grupos: Array<{ titulo: string; lineas: DatosPdfPresupuesto['items'] }> = [
      { titulo: 'Materiales y productos', lineas: d.items.filter((i) => i.tipo !== 'servicio') },
      { titulo: 'Servicios', lineas: d.items.filter((i) => i.tipo === 'servicio') },
    ];

    y = encabezadoTabla(y);
    for (const g of grupos) {
      if (g.lineas.length === 0) continue;
      if (y + 40 > LIMITE_Y) {
        doc.addPage();
        y = encabezadoTabla(MARGEN);
      }
      doc.rect(MARGEN, y, ANCHO, 20).fill(FONDO);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ORO).text(g.titulo, col.desc, y + 6, { width: ANCHO - 16 });
      y += 20;
      for (const l of g.lineas) {
        doc.font('Helvetica').fontSize(9.5);
        const alto = Math.max(doc.heightOfString(l.descripcion, { width: w.desc }), 12) + 12;
        if (y + alto > LIMITE_Y) {
          doc.addPage();
          y = encabezadoTabla(MARGEN);
        }
        doc.fillColor(TINTA).text(l.descripcion, col.desc, y + 6, { width: w.desc });
        doc.fillColor(SUAVE).text(l.unidad, col.unidad, y + 6, { width: w.unidad, lineBreak: false });
        doc.fillColor(TINTA).text(cant(l.cantidad), col.cant, y + 6, { width: w.cant, align: 'right', lineBreak: false });
        doc.text(usd(l.precioUnitario), col.precio, y + 6, { width: w.precio, align: 'right', lineBreak: false });
        doc.text(usd(importeLinea(l)), col.importe, y + 6, { width: w.importe, align: 'right', lineBreak: false });
        y += alto;
        doc.moveTo(MARGEN, y).lineTo(MARGEN + ANCHO, y).lineWidth(0.5).strokeColor('#D9D2C1').stroke();
      }
    }
    if (d.items.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor(SUAVE).text('Sin líneas.', col.desc, y + 8);
      y += 28;
    }

    // --- Totales ---
    const t = calcularTotales(d.items, d.descuentoPct);
    if (y + 110 > LIMITE_Y) {
      doc.addPage();
      y = MARGEN;
    }
    y += 14;
    const xEt = MARGEN + ANCHO - 230;
    const fila = (etiqueta: string, valor: string, fuerte = false) => {
      doc.font(fuerte ? 'Helvetica-Bold' : 'Helvetica').fontSize(fuerte ? 13 : 10).fillColor(TINTA);
      doc.text(etiqueta, xEt, y, { width: 120, lineBreak: false });
      doc.text(valor, xEt + 100, y, { width: 130, align: 'right', lineBreak: false });
      y += fuerte ? 22 : 16;
    };
    if (t.subtotalProductos > 0 && t.subtotalServicios > 0) {
      fila('Materiales', usd(t.subtotalProductos));
      fila('Servicios', usd(t.subtotalServicios));
    }
    fila('Subtotal', usd(t.subtotal));
    if (t.descuentoMonto > 0) fila(`Descuento ${cant(t.descuentoPct)}%`, `-${usd(t.descuentoMonto)}`);
    doc.moveTo(xEt, y - 2).lineTo(MARGEN + ANCHO, y - 2).lineWidth(1).strokeColor(ORO).stroke();
    y += 4;
    fila('TOTAL (USD)', usd(t.total), true);
    if (d.tasaBcv && d.tasaBcv > 0) {
      doc.font('Helvetica').fontSize(9).fillColor(SUAVE);
      doc.text(`Referencia: ${bs(t.total * d.tasaBcv)} (tasa BCV ${d.tasaBcv.toLocaleString('es-VE', { minimumFractionDigits: 2 })})`, xEt - 30, y, { width: 260, align: 'right' });
      y = doc.y + 6;
    }

    // --- Notas y condiciones ---
    y += 12;
    if (y + 80 > LIMITE_Y) {
      doc.addPage();
      y = MARGEN;
    }
    if (d.notas) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(TINTA).text('Notas', MARGEN, y);
      doc.font('Helvetica').fontSize(9.5).fillColor(TINTA).text(d.notas, MARGEN, doc.y + 2, { width: ANCHO });
      y = doc.y + 12;
    }
    doc.font('Helvetica').fontSize(8.5).fillColor(SUAVE).text(
      `Presupuesto válido por ${d.validezDias} días desde su fecha. Los precios están en dólares (USD); el equivalente en bolívares es referencial y depende de la tasa BCV del día. Los productos están sujetos a disponibilidad al momento de la compra.`,
      MARGEN,
      y,
      { width: ANCHO },
    );

    // --- Pie en todas las páginas ---
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
      doc.switchToPage(rango.start + i);
      // Sin margen inferior, el pie no provoca un salto de página automático.
      doc.page.margins.bottom = 0;
      doc.moveTo(MARGEN, 842 - 60).lineTo(MARGEN + ANCHO, 842 - 60).lineWidth(0.5).strokeColor('#D9D2C1').stroke();
      doc.font('Helvetica').fontSize(8).fillColor(SUAVE);
      doc.text(`${EMPRESA.nombre} · ${EMPRESA.direccion}`, MARGEN, 842 - 52, { width: ANCHO - 60, lineBreak: false });
      doc.text(`Página ${i + 1} de ${rango.count}`, MARGEN + ANCHO - 60, 842 - 52, { width: 60, align: 'right', lineBreak: false });
    }
    doc.end();
  });
}
