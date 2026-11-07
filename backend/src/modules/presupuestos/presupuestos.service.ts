import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { precioDivisasLinea } from '../carrito/precio-divisas';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Presupuesto, PresupuestoItem, type EstadoPresupuesto } from './entities/presupuesto.entity';
import { Servicio } from './entities/servicio.entity';
import { GuardarPresupuestoDto, ItemPresupuestoDto } from './dto/guardar-presupuesto.dto';
import { calcularTotales, type TotalesPresupuesto } from './presupuesto-calculos';
import { construirPdfPresupuesto, numeroFormateado } from './presupuesto-pdf';
import { VarianteMaterial } from '../inventario/entities/variante-material.entity';
import { Combo } from '../inventario/entities/combo.entity';
import { TasasService } from '../tasas/tasas.service';
import { CarritoService } from '../carrito/carrito.service';
import { getRlsManager } from '../../common/rls/request-context';

export type PresupuestoConTotales = Presupuesto & { totales: TotalesPresupuesto };

export interface ResumenPresupuesto {
  id: string;
  numero: number;
  clienteNombre: string;
  obra?: string | null;
  estado: EstadoPresupuesto;
  creadoPorNombre?: string | null;
  createdAt: Date;
  total: number;
  lineas: number;
  solicitudId?: string | null;
}

const textoAtributos = (a: Record<string, string> | null | undefined) =>
  Object.values(a ?? {}).filter(Boolean).join(' · ');

@Injectable()
export class PresupuestosService {
  constructor(
    @InjectRepository(Presupuesto) private readonly repoInyectado: Repository<Presupuesto>,
    private readonly dataSource: DataSource,
    private readonly tasas: TasasService,
    private readonly carrito: CarritoService,
    private readonly config: ConfigService,
  ) {}

  private get manager(): EntityManager {
    return getRlsManager() ?? this.dataSource.manager;
  }

  private get repo(): Repository<Presupuesto> {
    return getRlsManager()?.getRepository(Presupuesto) ?? this.repoInyectado;
  }

  private conTotales(p: Presupuesto): PresupuestoConTotales {
    p.items = [...(p.items ?? [])].sort((a, b) => a.orden - b.orden);
    return Object.assign(p, { totales: calcularTotales(p.items, p.descuentoPct) });
  }

  async listar(estado?: string, buscar?: string): Promise<ResumenPresupuesto[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.items', 'i')
      .orderBy('p.createdAt', 'DESC')
      .take(300);
    if (estado) qb.andWhere('p.estado = :estado', { estado });
    const filas = await qb.getMany();
    const q = buscar?.trim().toLowerCase();
    return filas
      .filter((p) => !q || p.clienteNombre.toLowerCase().includes(q) || (p.obra ?? '').toLowerCase().includes(q) || String(p.numero).includes(q))
      .map((p) => {
        const t = calcularTotales(p.items, p.descuentoPct);
        return {
          id: p.id,
          numero: p.numero,
          clienteNombre: p.clienteNombre,
          obra: p.obra,
          estado: p.estado,
          creadoPorNombre: p.creadoPorNombre,
          createdAt: p.createdAt,
          total: t.total,
          lineas: p.items.length,
          solicitudId: p.solicitudId,
        };
      });
  }

  async obtener(id: string): Promise<PresupuestoConTotales> {
    const p = await this.repo.findOne({ where: { id }, relations: ['items'] });
    if (!p) throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    return this.conTotales(p);
  }

  /** Completa cada línea con los datos del catálogo que el usuario no mandó. */
  private async resolverItems(items: ItemPresupuestoDto[]): Promise<Array<Omit<PresupuestoItem, 'id' | 'presupuesto'>>> {
    const m = this.manager;
    const salida: Array<Omit<PresupuestoItem, 'id' | 'presupuesto'>> = [];
    for (const [orden, d] of items.entries()) {
      const base = { orden, tipo: d.tipo, varianteId: null, comboId: null, servicioId: null } as Pick<
        PresupuestoItem,
        'orden' | 'tipo' | 'varianteId' | 'comboId' | 'servicioId'
      >;
      let descripcion = d.descripcion?.trim();
      let unidad = d.unidad?.trim();
      let precio = d.precioUnitario;
      let divisasLista: number | null = null;
      let precioLista: number | null = null;

      if (d.tipo === 'producto' || d.tipo === 'combo') {
        if (!Number.isInteger(d.cantidad)) {
          throw new BadRequestException(`La cantidad de "${descripcion ?? 'un producto'}" debe ser un número entero`);
        }
      }

      if (d.tipo === 'producto') {
        if (!d.varianteId) throw new BadRequestException('Cada producto debe indicar su presentación (varianteId)');
        const v = await m.getRepository(VarianteMaterial).findOne({ where: { id: d.varianteId }, relations: ['material'] });
        if (!v) throw new BadRequestException('Una presentación del presupuesto ya no existe en el catálogo');
        base.varianteId = v.id;
        const detalle = textoAtributos(v.atributos);
        descripcion ||= detalle ? `${v.material.nombre} — ${detalle}` : v.material.nombre;
        precioLista = Number(v.precioVenta);
        divisasLista = v.precioDivisas ?? null;
        precio ??= precioLista;
      } else if (d.tipo === 'combo') {
        if (!d.comboId) throw new BadRequestException('Cada combo debe indicar su comboId');
        const c = await m.getRepository(Combo).findOne({ where: { id: d.comboId } });
        if (!c) throw new BadRequestException('Un combo del presupuesto ya no existe en el catálogo');
        base.comboId = c.id;
        descripcion ||= /^combo\b/i.test(c.nombre) ? c.nombre : `Combo ${c.nombre}`;
        precioLista = Number(c.precioCombo);
        divisasLista = c.precioDivisas ?? null;
        precio ??= precioLista;
      } else {
        if (d.servicioId) {
          const s = await m.getRepository(Servicio).findOne({ where: { id: d.servicioId } });
          if (!s) throw new BadRequestException('Un servicio del presupuesto ya no existe en la lista');
          base.servicioId = s.id;
          descripcion ||= s.nombre;
          unidad ||= s.unidad;
          precio ??= Number(s.precioBase);
        }
        if (!descripcion) throw new BadRequestException('Cada servicio necesita una descripción');
        if (precio === undefined || precio === null) throw new BadRequestException(`Falta el precio de "${descripcion}"`);
      }
      salida.push({
        ...base,
        descripcion: descripcion!.slice(0, 300),
        unidad: (unidad || 'unidad').slice(0, 30),
        cantidad: d.cantidad,
        precioUnitario: precio!,
        precioDivisasUnitario: precioDivisasLinea(precio, precioLista, divisasLista),
      });
    }
    return salida;
  }

  private cabecera(dto: GuardarPresupuestoDto) {
    return {
      clienteNombre: dto.clienteNombre.trim(),
      clienteTelefono: dto.clienteTelefono?.trim() || null,
      clienteEmail: dto.clienteEmail?.trim() || null,
      obra: dto.obra?.trim() || null,
      notas: dto.notas?.trim() || null,
      validezDias: dto.validezDias ?? 15,
      descuentoPct: dto.descuentoPct ?? 0,
    };
  }

  async crear(dto: GuardarPresupuestoDto, usuarioId?: string): Promise<PresupuestoConTotales> {
    const items = await this.resolverItems(dto.items);
    let nombre: string | null = null;
    if (usuarioId) {
      const fila: Array<{ nombre: string }> = await this.manager.query(`SELECT nombre FROM usuarios WHERE id = $1`, [usuarioId]);
      nombre = fila[0]?.nombre ?? null;
    }
    const guardado = await this.repo.save(
      this.repo.create({ ...this.cabecera(dto), creadoPorId: usuarioId ?? null, creadoPorNombre: nombre, estado: 'borrador' }),
    );
    await this.reemplazarItems(guardado.id, items);
    return this.obtener(guardado.id);
  }

  private async reemplazarItems(id: string, items: Array<Omit<PresupuestoItem, 'id' | 'presupuesto'>>) {
    const repoItems = this.manager.getRepository(PresupuestoItem);
    await repoItems.delete({ presupuesto: { id } } as any);
    if (items.length > 0) {
      await repoItems.insert(items.map((i) => ({ ...i, presupuesto: { id } })) as any);
    }
  }

  private async editable(id: string): Promise<Presupuesto> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    if (p.estado === 'convertido') {
      throw new ConflictException('El presupuesto ya se convirtió en una solicitud de carrito y no se puede modificar');
    }
    return p;
  }

  async actualizar(id: string, dto: GuardarPresupuestoDto): Promise<PresupuestoConTotales> {
    await this.editable(id);
    const items = await this.resolverItems(dto.items);
    await this.repo.update({ id }, { ...this.cabecera(dto), updatedAt: new Date() } as any);
    await this.reemplazarItems(id, items);
    return this.obtener(id);
  }

  async cambiarEstado(id: string, estado: Exclude<EstadoPresupuesto, 'convertido'>): Promise<PresupuestoConTotales> {
    await this.editable(id);
    await this.repo.update({ id }, { estado, updatedAt: new Date() });
    return this.obtener(id);
  }

  async eliminar(id: string): Promise<void> {
    const p = await this.editable(id);
    await this.repo.delete({ id: p.id });
  }

  private urlPdfPublico(token: string): string {
    const base = (this.config.get<string>('API_PUBLIC_URL') ?? `http://localhost:${this.config.get('PORT') ?? 3000}`).replace(/\/$/, '');
    return `${base}/api/v1/presupuesto-publico/${token}/pdf`;
  }

  /**
   * Deja listo el envío al cliente: marca el presupuesto como enviado (si era
   * borrador) y devuelve el texto de WhatsApp con el enlace al PDF. wa.me no se
   * puede enviar solo: lo abre la persona con un clic.
   */
  async enviar(id: string) {
    const p = await this.obtener(id);
    if (p.estado === 'convertido') throw new ConflictException('El presupuesto ya se convirtió en solicitud');
    if (p.items.length === 0) throw new BadRequestException('Agrega al menos una línea antes de enviar el presupuesto');
    const fila: Array<{ token: string }> = await this.manager.query(`SELECT "tokenPublico" AS token FROM presupuestos WHERE id = $1`, [id]);
    const enlace = this.urlPdfPublico(fila[0].token);
    if (p.estado === 'borrador') await this.repo.update({ id }, { estado: 'enviado', updatedAt: new Date() });
    const tasa = (await this.tasas.vigente())?.valor;
    const total = p.totales.total;
    const bs = tasa ? ` (≈ Bs. ${(total * Number(tasa)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : '';
    const mensaje =
      `Hola ${p.clienteNombre}, te compartimos el presupuesto N° ${numeroFormateado(p.numero)} de Revestimiento Élite RY.\n` +
      `Total: $${total.toFixed(2)}${bs}.\n` +
      (p.totales.totalDivisas < total - 0.004 ? `Pagando en divisas (efectivo USD, Zelle, Binance): $${p.totales.totalDivisas.toFixed(2)}.\n` : '') +
      `Válido por ${p.validezDias} días.\n` +
      `Puedes verlo y descargarlo aquí: ${enlace}`;
    return { mensaje, telefono: p.clienteTelefono ?? null, enlace, estado: p.estado === 'borrador' ? 'enviado' : p.estado };
  }

  /** Convierte los productos y combos en una solicitud de carrito (los servicios quedan en el presupuesto). */
  async convertir(id: string, usuarioId?: string) {
    const p = await this.obtener(id);
    if (p.estado === 'convertido') throw new ConflictException('Este presupuesto ya se convirtió en solicitud');
    if (p.estado !== 'aprobado') throw new ConflictException('Solo se puede convertir un presupuesto aprobado');
    if (!p.clienteTelefono) throw new BadRequestException('Agrega el teléfono del cliente antes de convertir el presupuesto');
    const productos = p.items.filter((i) => i.tipo !== 'servicio');
    const servicios = p.items.filter((i) => i.tipo === 'servicio');
    if (productos.length === 0 && servicios.length === 0) throw new BadRequestException('El presupuesto no tiene líneas');
    const huerfano = productos.find((i) => !i.varianteId && !i.comboId);
    if (huerfano) throw new ConflictException(`"${huerfano.descripcion}" ya no existe en el catálogo: quítalo o cámbialo antes de convertir`);

    const solicitud = await this.carrito.crearDesdePresupuesto(
      {
        numeroPresupuesto: p.numero,
        clienteNombre: p.clienteNombre,
        clienteTelefono: p.clienteTelefono,
        clienteEmail: p.clienteEmail ?? undefined,
        items: productos.map((i) => ({
          varianteId: i.varianteId ?? undefined,
          comboId: i.comboId ?? undefined,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          precioDivisasUnitario: i.precioDivisasUnitario ?? null,
        })),
        servicios: servicios.map((i) => ({
          servicioId: i.servicioId ?? undefined,
          descripcion: i.descripcion,
          unidad: i.unidad,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
        })),
        totalFinal: p.descuentoPct > 0 ? calcularTotales(p.items, p.descuentoPct).total : null,
        notas: `Desde el presupuesto N° ${numeroFormateado(p.numero)}.`,
      },
      usuarioId,
    );
    await this.repo.update({ id }, { estado: 'convertido', solicitudId: solicitud.id, updatedAt: new Date() });
    // `numero` lo asigna la base de datos: se lee aparte.
    const fila: Array<{ numero: number }> = await this.manager.query(`SELECT numero FROM solicitudes_carrito WHERE id = $1`, [solicitud.id]);
    return { solicitudId: solicitud.id, numeroSolicitud: fila[0]?.numero ?? null };
  }

  private async pdfDe(p: PresupuestoConTotales): Promise<Buffer> {
    const tasa = (await this.tasas.vigente())?.valor;
    return construirPdfPresupuesto({
      numero: p.numero,
      fecha: p.createdAt,
      validezDias: p.validezDias,
      clienteNombre: p.clienteNombre,
      clienteTelefono: p.clienteTelefono,
      obra: p.obra,
      notas: p.notas,
      descuentoPct: p.descuentoPct,
      items: p.items,
      tasaBcv: tasa ? Number(tasa) : null,
      telefonoEmpresa: this.config.get<string>('EMPRESA_TELEFONO') || null,
    });
  }

  async pdf(id: string): Promise<{ buffer: Buffer; nombre: string }> {
    const p = await this.obtener(id);
    return { buffer: await this.pdfDe(p), nombre: `Presupuesto-${numeroFormateado(p.numero)}.pdf` };
  }

  /** Enlace público (por token) al PDF: solo presupuestos ya enviados. */
  async pdfPublico(token: string): Promise<{ buffer: Buffer; nombre: string }> {
    await this.manager.query(`SELECT set_config('app.rol', 'service_auth', true)`);
    const p = await this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.items', 'i')
      .where('p."tokenPublico" = :token', { token })
      .getOne();
    if (!p || p.estado === 'borrador') throw new NotFoundException('Presupuesto no encontrado');
    const completo = this.conTotales(p);
    return { buffer: await this.pdfDe(completo), nombre: `Presupuesto-${numeroFormateado(p.numero)}.pdf` };
  }
}
