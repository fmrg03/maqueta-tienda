import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Categoria } from './entities/categoria.entity';
import { Material } from './entities/material.entity';
import { VarianteMaterial } from './entities/variante-material.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { getRlsManager } from '../../common/rls/request-context';
import { InventarioService } from './inventario.service';
import { FilaImportacionDto, ImportarProductosDto } from './dto/importar-productos.dto';

export interface FilaValidada extends Partial<FilaImportacionDto> {
  fila: number;
  errores: string[];
}

const COLUMNAS: Array<{ clave: keyof FilaImportacionDto; titulo: string; ancho: number; alias: string[] }> = [
  { clave: 'sku', titulo: 'SKU producto', ancho: 16, alias: ['sku', 'skuproducto', 'codigo'] },
  { clave: 'nombre', titulo: 'Nombre', ancho: 34, alias: ['nombre', 'producto'] },
  { clave: 'categoria', titulo: 'Categoría', ancho: 20, alias: ['categoria'] },
  { clave: 'skuVariante', titulo: 'SKU presentación', ancho: 18, alias: ['skupresentacion', 'skuvariante'] },
  { clave: 'presentacion', titulo: 'Presentación', ancho: 20, alias: ['presentacion'] },
  { clave: 'precioVenta', titulo: 'Precio venta (BCV)', ancho: 18, alias: ['precioventa', 'precioventabcv', 'precio'] },
  { clave: 'precioDivisas', titulo: 'Precio divisas', ancho: 16, alias: ['preciodivisas', 'divisas'] },
  { clave: 'precioCosto', titulo: 'Costo', ancho: 12, alias: ['costo', 'preciocosto'] },
  { clave: 'stock', titulo: 'Stock inicial', ancho: 14, alias: ['stock', 'stockinicial', 'existencia'] },
  { clave: 'tiempoEntregaDias', titulo: 'Entrega (días)', ancho: 14, alias: ['entregadias', 'entrega', 'tiempoentregadias'] },
];

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const NUMERICAS = new Set(['precioVenta', 'precioCosto', 'precioDivisas', 'stock', 'tiempoEntregaDias']);

@Injectable()
export class ImportacionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly inventario: InventarioService,
  ) {}

  private get manager() {
    return getRlsManager() ?? this.dataSource.manager;
  }

  async plantilla(): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Productos');
    hoja.columns = COLUMNAS.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho }));
    hoja.getRow(1).font = { bold: true };
    hoja.addRow({
      sku: 'CEM-001',
      nombre: 'Cemento gris',
      categoria: 'Cemento',
      skuVariante: 'CEM-001-42',
      presentacion: 'Saco 42,5 kg',
      precioVenta: 9.5,
      precioDivisas: 8.5,
      precioCosto: 7,
      stock: 100,
      tiempoEntregaDias: 2,
    });
    const nota = libro.addWorksheet('Instrucciones');
    nota.getColumn(1).width = 110;
    [
      'Una fila por presentación. Si un producto tiene varias presentaciones, repite el SKU del producto en cada fila.',
      'Obligatorias: SKU producto, Nombre, Precio venta y Costo.',
      '"Precio divisas" es opcional y solo se usa internamente (si queda vacío vale igual que el precio de venta).',
      'La categoría debe existir ya en el sistema. El proveedor se elige en pantalla al importar.',
      'Borra la fila de ejemplo antes de cargar tus productos.',
    ].forEach((t) => nota.addRow([t]));
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  /** Lee el Excel y valida las filas (no guarda nada). */
  async leerExcel(buffer: Buffer, proveedorId?: string) {
    const libro = new ExcelJS.Workbook();
    try {
      await libro.xlsx.load(buffer as any);
    } catch {
      throw new BadRequestException('No se pudo leer el archivo. Usa la plantilla en formato .xlsx.');
    }
    const hoja = libro.worksheets[0];
    if (!hoja) throw new BadRequestException('El archivo no tiene hojas.');

    const mapa = new Map<number, keyof FilaImportacionDto>();
    hoja.getRow(1).eachCell((celda, col) => {
      const n = normalizar(String(celda.text ?? ''));
      const c = COLUMNAS.find((x) => x.alias.includes(n));
      if (c) mapa.set(col, c.clave);
    });
    const faltan = ['sku', 'nombre', 'precioVenta', 'precioCosto'].filter((k) => ![...mapa.values()].includes(k as any));
    if (faltan.length) {
      throw new BadRequestException('Faltan columnas obligatorias en la primera fila. Descarga la plantilla para ver el formato.');
    }

    const filas: any[] = [];
    hoja.eachRow((row, num) => {
      if (num === 1) return;
      const f: any = { fila: num };
      let vacia = true;
      mapa.forEach((clave, col) => {
        const celda = row.getCell(col);
        const texto = String(celda.text ?? '').trim();
        if (texto === '') return;
        vacia = false;
        if (NUMERICAS.has(clave)) {
          const n = Number(typeof celda.value === 'number' ? celda.value : texto.replace(/\./g, '').replace(',', '.'));
          f[clave] = Number.isFinite(n) ? n : NaN;
        } else f[clave] = texto;
      });
      if (!vacia) filas.push(f);
    });
    if (filas.length === 0) throw new BadRequestException('El archivo no tiene filas con datos.');
    if (filas.length > 500) throw new BadRequestException('Máximo 500 filas por carga.');
    return this.validar(filas, proveedorId);
  }

  async validar(filas: Array<Partial<FilaImportacionDto> & { fila?: number }>, proveedorId?: string) {
    const m = this.manager;
    const errorGlobal: string[] = [];
    if (proveedorId && !(await m.getRepository(Proveedor).exist({ where: { id: proveedorId } }))) {
      errorGlobal.push('El proveedor elegido no existe.');
    }
    const categorias = await m.getRepository(Categoria).find();
    const porNombre = new Map(categorias.map((c) => [normalizar(c.nombre), c]));
    const skusMaterial = new Set((await m.getRepository(Material).find({ select: ['sku'] })).map((x) => x.sku.toLowerCase()));
    const skusVariante = new Set(
      (await m.getRepository(VarianteMaterial).find({ select: ['skuVariante'] })).map((x) => x.skuVariante.toLowerCase()),
    );
    const vistosVariante = new Set<string>();
    const nombrePorSku = new Map<string, string>();

    const salida: FilaValidada[] = filas.map((f, i) => {
      const errores: string[] = [];
      const sku = String(f.sku ?? '').trim();
      const nombre = String(f.nombre ?? '').trim();
      if (!sku) errores.push('Falta el SKU del producto');
      if (!nombre) errores.push('Falta el nombre');
      for (const k of ['precioVenta', 'precioCosto'] as const) {
        const v = f[k];
        if (v === undefined || v === null || Number.isNaN(Number(v))) errores.push(`Falta o es inválido: ${k === 'precioVenta' ? 'precio de venta' : 'costo'}`);
        else if (Number(v) < 0) errores.push(`${k === 'precioVenta' ? 'El precio' : 'El costo'} no puede ser negativo`);
      }
      if (f.precioDivisas !== undefined && f.precioDivisas !== null && (Number.isNaN(Number(f.precioDivisas)) || Number(f.precioDivisas) < 0)) {
        errores.push('Precio en divisas inválido');
      }
      if (f.stock !== undefined && (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 0)) errores.push('El stock debe ser un entero ≥ 0');
      if (f.tiempoEntregaDias !== undefined && (!Number.isInteger(Number(f.tiempoEntregaDias)) || Number(f.tiempoEntregaDias) < 0)) {
        errores.push('Los días de entrega deben ser un entero ≥ 0');
      }
      const cat = f.categoria?.trim();
      if (cat && !porNombre.has(normalizar(cat))) errores.push(`La categoría "${cat}" no existe`);

      const skuVar = (f.skuVariante?.trim() || sku).toLowerCase();
      if (sku) {
        if (skusVariante.has(skuVar)) errores.push(`Ya existe una presentación con SKU ${f.skuVariante?.trim() || sku}`);
        if (vistosVariante.has(skuVar)) errores.push(`SKU de presentación repetido en el archivo (${f.skuVariante?.trim() || sku})`);
        vistosVariante.add(skuVar);
        const previo = nombrePorSku.get(sku.toLowerCase());
        if (previo !== undefined && previo !== nombre) errores.push(`El SKU ${sku} aparece con nombres distintos`);
        nombrePorSku.set(sku.toLowerCase(), nombre);
      }
      return { ...f, sku, nombre, fila: f.fila ?? i + 1, errores };
    });

    const conErrores = salida.filter((f) => f.errores.length).length;
    return {
      errorGlobal,
      filas: salida.map((f) => ({ ...f, materialExiste: !!f.sku && skusMaterial.has(f.sku.toLowerCase()) })),
      total: salida.length,
      conErrores,
      validas: salida.length - conErrores,
    };
  }

  /** Crea todo o nada (corre dentro de la transacción de la petición). */
  async importar(dto: ImportarProductosDto, usuarioId?: string) {
    const r = await this.validar(dto.filas, dto.proveedorId);
    if (r.errorGlobal.length || r.conErrores > 0) {
      throw new BadRequestException({
        message: r.errorGlobal[0] ?? `Hay ${r.conErrores} fila(s) con errores; corrígelas y vuelve a intentar.`,
        filas: r.filas.filter((f) => f.errores.length),
      });
    }
    const m = this.manager;
    const categorias = new Map((await m.getRepository(Categoria).find()).map((c) => [normalizar(c.nombre), c]));
    const materiales = new Map<string, Material>();
    let materialesNuevos = 0;

    for (const f of dto.filas) {
      const skuKey = f.sku.trim().toLowerCase();
      let material = materiales.get(skuKey) ?? (await m.getRepository(Material).findOne({ where: { sku: f.sku.trim() } })) ?? undefined;
      if (!material) {
        const cat = f.categoria?.trim() ? categorias.get(normalizar(f.categoria)) : undefined;
        material = await m.getRepository(Material).save(
          m.getRepository(Material).create({ sku: f.sku.trim(), nombre: f.nombre.trim(), categoria: cat, activo: true }),
        );
        materialesNuevos++;
      }
      materiales.set(skuKey, material);
      await this.inventario.crearVariante(
        material.id,
        {
          skuVariante: f.skuVariante?.trim() || f.sku.trim(),
          atributos: f.presentacion?.trim() ? { Presentación: f.presentacion.trim() } : {},
          precioVenta: f.precioVenta,
          precioCosto: f.precioCosto,
          precioDivisas: f.precioDivisas ?? null,
          stock: f.stock,
          proveedorId: dto.proveedorId,
          tiempoEntregaDias: f.tiempoEntregaDias,
        } as any,
        usuarioId,
      );
    }
    return { productosNuevos: materialesNuevos, presentaciones: dto.filas.length };
  }
}
