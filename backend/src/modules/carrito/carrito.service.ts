import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { precioDivisasLinea } from './precio-divisas';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  SolicitudCarrito,
  ItemSolicitudCarrito,
  ServicioSolicitud,
  PagoSolicitud,
  EstadoSolicitudCarrito,
  ESTADOS_EDITABLES,
} from './entities/solicitud-carrito.entity';
import {
  EventoSolicitudCarrito,
  type TipoEventoCarrito,
} from './entities/evento-solicitud-carrito.entity';
import {
  MovimientoInventario,
  TipoMovimiento,
} from '../inventario/entities/movimiento-inventario.entity';
import { TasasService } from '../tasas/tasas.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { EditarItemsCarritoDto } from './dto/editar-items-carrito.dto';
import { CancelarCarritoDto, CerrarCarritoDto, PagoDto } from './dto/cerrar-carrito.dto';
import {
  abonoPorDefecto,
  esMetodoBolivares,
  resumenCobro,
  TOLERANCIA_SALDO,
  totalesPedido,
  calcularFaltantes,
  CarritoNoCerrableError,
  planificarSalidas,
  repartirCobro,
  totalItems,
  totalServicios,
} from './carrito-calculos';
import { lineaItem } from '../../common/notificaciones/mensajes';
import { Material } from '../inventario/entities/material.entity';
import { VarianteMaterial } from '../inventario/entities/variante-material.entity';
import { Combo } from '../inventario/entities/combo.entity';
import { CreateSolicitudCarritoDto } from './dto/create-solicitud-carrito.dto';
import { ActualizarEstadoCarritoDto } from './dto/actualizar-estado-carrito.dto';
import { NotificacionesService } from '../../common/notificaciones/notificaciones.service';
import { getRlsManager } from '../../common/rls/request-context';

// Todo lo que el panel necesita para mostrar una solicitud (nombre de producto,
// presentación y componentes de combos incluidos).
const RELACIONES_DETALLE = [
  'items',
  'items.material',
  'items.variante',
  'items.variante.material',
  'items.combo',
  'items.combo.items',
  'items.combo.items.variante',
  'servicios',
  'pagos',
];

@Injectable()
export class CarritoService {
  constructor(
    @InjectRepository(SolicitudCarrito)
    private readonly solicitudRepositoryInyectado: Repository<SolicitudCarrito>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(VarianteMaterial)
    private readonly varianteRepository: Repository<VarianteMaterial>,
    @InjectRepository(Combo)
    private readonly comboRepository: Repository<Combo>,
    private readonly notificacionesService: NotificacionesService,
    private readonly dataSource: DataSource,
    private readonly tasas: TasasService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  // Manager transaccional del request (con el contexto RLS) o, fuera de un
  // request, el del DataSource.
  private get manager(): EntityManager {
    return getRlsManager() ?? this.dataSource.manager;
  }

  // `solicitudes_carrito` tiene RLS (ver migración AddRowLevelSecurity):
  // solo ventas/admin pueden leer, la creación es pública. Usamos el
  // repositorio transaccional del request cuando existe.
  private get solicitudRepository(): Repository<SolicitudCarrito> {
    return (
      getRlsManager()?.getRepository(SolicitudCarrito) ??
      this.solicitudRepositoryInyectado
    );
  }

  async crearSolicitud(dto: CreateSolicitudCarritoDto): Promise<SolicitudCarrito> {
    const items: ItemSolicitudCarrito[] = [];

    for (const itemDto of dto.items) {
      const referencias = [
        itemDto.materialId,
        itemDto.varianteId,
        itemDto.comboId,
      ].filter(Boolean);

      if (referencias.length !== 1) {
        throw new BadRequestException(
          'Cada item del carrito debe referenciar exactamente uno de: materialId, varianteId o comboId',
        );
      }

      const item = new ItemSolicitudCarrito();
      item.cantidad = itemDto.cantidad;

      if (itemDto.materialId) {
        item.material = await this.buscarOFallar(
          this.materialRepository,
          itemDto.materialId,
          'Material',
        );
        item.precioUnitario = null; // genérico: el asesor define la presentación
      } else if (itemDto.varianteId) {
        item.variante = await this.buscarOFallar(
          this.varianteRepository,
          itemDto.varianteId,
          'Variante',
          ['material'], // el nombre del producto va en la notificación
        );
        item.precioUnitario = Number(item.variante.precioVenta);
        item.precioDivisasUnitario = precioDivisasLinea(item.precioUnitario, item.precioUnitario, item.variante.precioDivisas);
      } else if (itemDto.comboId) {
        item.combo = await this.buscarOFallar(
          this.comboRepository,
          itemDto.comboId,
          'Combo',
        );
        item.precioUnitario = Number(item.combo.precioCombo);
        item.precioDivisasUnitario = precioDivisasLinea(item.precioUnitario, item.precioUnitario, item.combo.precioDivisas);
      }

      items.push(item);
    }

    const solicitud = this.solicitudRepository.create({
      clienteNombre: dto.clienteNombre,
      clienteTelefono: dto.clienteTelefono,
      clienteEmail: dto.clienteEmail,
      canalEnvio: dto.canalEnvio,
      items,
    });

    // El INSERT de TypeORM siempre agrega RETURNING para leer columnas
    // generadas. Postgres exige que la fila insertada también pase una
    // política de SELECT para devolverla — no alcanza con que el INSERT
    // esté permitido. Este endpoint es público (sin sesión), así que no
    // hay forma de que pase la política normal (solo ventas/admin);
    // reusamos el mismo contexto 'service_auth' que usuarios.service.ts.
    const manager = getRlsManager();
    if (manager) {
      await manager.query(`SELECT set_config('app.rol', 'service_auth', true)`);
    }

    const guardada = await this.solicitudRepository.save(solicitud);
    // Sin await: el cliente no espera al SMTP/WhatsApp, y el servicio de
    // notificaciones nunca lanza (captura y loguea cada canal por separado).
    void this.notificacionesService.notificarNuevaSolicitudCarrito(guardada);

    return this.sinDatosInternos(guardada);
  }

  /** Respuesta para el cliente anónimo: sin costos ni precios en divisas. */
  private sinDatosInternos(sol: SolicitudCarrito): SolicitudCarrito {
    return {
      ...sol,
      items: sol.items.map((i) => {
        const { precioDivisasUnitario: _d, ...resto } = i;
        const salida: any = { ...resto };
        if (i.variante) {
          const { precioCosto: _c, precioDivisas: _v, ...v } = i.variante as any;
          salida.variante = v;
        }
        if (i.combo) {
          const { precioDivisas: _p, ...c } = i.combo as any;
          salida.combo = c;
        }
        return salida;
      }),
    } as SolicitudCarrito;
  }

  /**
   * Crea una solicitud ya en contacto a partir de un presupuesto aprobado
   * (productos, combos y servicios, con el precio pactado en el presupuesto).
   */
  async crearDesdePresupuesto(
    datos: {
      numeroPresupuesto: number;
      clienteNombre: string;
      clienteTelefono: string;
      clienteEmail?: string;
      items: Array<{ varianteId?: string; comboId?: string; cantidad: number; precioUnitario: number; precioDivisasUnitario?: number | null }>;
      servicios?: Array<{ servicioId?: string; descripcion: string; unidad: string; cantidad: number; precioUnitario: number }>;
      totalFinal: number | null;
      notas: string;
    },
    usuarioId?: string,
  ): Promise<SolicitudCarrito> {
    const items = datos.items.map((d) => {
      const item = new ItemSolicitudCarrito();
      item.cantidad = d.cantidad;
      item.precioUnitario = d.precioUnitario;
      item.precioDivisasUnitario = d.precioDivisasUnitario ?? null;
      if (d.varianteId) item.variante = { id: d.varianteId } as VarianteMaterial;
      else item.combo = { id: d.comboId } as Combo;
      return item;
    });
    const guardada = await this.solicitudRepository.save(
      this.solicitudRepository.create({
        clienteNombre: datos.clienteNombre,
        clienteTelefono: datos.clienteTelefono,
        clienteEmail: datos.clienteEmail,
        estado: EstadoSolicitudCarrito.CONTACTADO,
        notas: datos.notas,
        totalFinal: datos.totalFinal,
        items,
        servicios: (datos.servicios ?? []).map((d, orden) =>
          Object.assign(new ServicioSolicitud(), {
            servicioId: d.servicioId ?? null,
            descripcion: d.descripcion,
            unidad: d.unidad,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            orden,
          }),
        ),
      }),
    );
    await this.registrarEvento(guardada, 'desde_presupuesto', usuarioId, { presupuesto: datos.numeroPresupuesto });
    return guardada;
  }

  /** Adjunta (sin guardar) los totales BCV/divisas y el saldo para el panel. */
  private conResumen<T extends SolicitudCarrito>(solicitud: T): T {
    solicitud.pagos = [...(solicitud.pagos ?? [])].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    (solicitud as any).resumenCobro = resumenCobro(this.totalesDe(solicitud), solicitud.pagos);
    return solicitud;
  }

  async findAll(estado?: string): Promise<SolicitudCarrito[]> {
    const filas = await this.solicitudRepository.find({
      where: estado ? ({ estado } as any) : {},
      relations: RELACIONES_DETALLE,
      order: { createdAt: 'DESC' },
    });
    return filas.map((f) => this.conResumen(f));
  }

  async findOne(id: string): Promise<SolicitudCarrito> {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id },
      relations: RELACIONES_DETALLE,
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud de carrito ${id} no encontrada`);
    }
    return this.conResumen(solicitud);
  }

  async actualizarEstado(
    id: string,
    dto: ActualizarEstadoCarritoDto,
    usuarioId?: string,
  ): Promise<SolicitudCarrito> {
    const solicitud = await this.findOne(id);
    if (!ESTADOS_EDITABLES.includes(solicitud.estado)) {
      throw new ConflictException(`La solicitud está ${solicitud.estado} y ya no se puede modificar`);
    }
    const anterior = solicitud.estado;
    solicitud.estado = dto.estado;
    if (dto.notas) {
      solicitud.notas = dto.notas;
    }
    const guardada = await this.solicitudRepository.save(solicitud);
    await this.registrarEvento(guardada, 'estado', usuarioId, { de: anterior, a: dto.estado, notas: dto.notas });
    return guardada;
  }

  private async registrarEvento(
    solicitud: SolicitudCarrito,
    tipo: TipoEventoCarrito,
    usuarioId: string | undefined,
    detalle?: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.manager.getRepository(EventoSolicitudCarrito);
    await repo.insert({
      solicitud: { id: solicitud.id },
      usuario: usuarioId ? { id: usuarioId } : null,
      tipo,
      detalle: detalle ?? null,
    } as any);
  }

  async historial(id: string): Promise<EventoSolicitudCarrito[]> {
    await this.findOne(id);
    return this.manager.getRepository(EventoSolicitudCarrito).find({
      where: { solicitud: { id } },
      order: { createdAt: 'DESC' },
    });
  }

  private resumenItems(items: ItemSolicitudCarrito[], servicios: ServicioSolicitud[] = []) {
    return [
      ...items.map((i) => ({
        texto: lineaItem(i).texto,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario === null || i.precioUnitario === undefined ? null : Number(i.precioUnitario),
      })),
      ...servicios.map((sv) => ({
        texto: `Servicio: ${sv.descripcion} (${sv.unidad})`,
        cantidad: Number(sv.cantidad),
        precioUnitario: Number(sv.precioUnitario),
      })),
    ];
  }

  /**
   * El asesor ajusta el pedido (cantidades, ítems, precio pactado, total).
   * Reemplaza el conjunto de ítems. Marca la solicitud como "modificada
   * desde el último envío": hay que reenviar el detalle antes de cerrar.
   */
  async editarItems(
    id: string,
    dto: EditarItemsCarritoDto,
    usuarioId?: string,
  ): Promise<SolicitudCarrito> {
    const m = this.manager;
    await m.query(`SELECT id FROM solicitudes_carrito WHERE id = $1 FOR UPDATE`, [id]);
    const solicitud = await this.findOne(id);
    if (!ESTADOS_EDITABLES.includes(solicitud.estado)) {
      throw new ConflictException(`La solicitud está ${solicitud.estado} y ya no se puede editar`);
    }
    const antes = this.resumenItems(solicitud.items, solicitud.servicios);

    const nuevos: ItemSolicitudCarrito[] = [];
    for (const d of dto.items) {
      const refs = [d.materialId, d.varianteId, d.comboId].filter(Boolean);
      if (refs.length !== 1) {
        throw new BadRequestException(
          'Cada ítem debe referenciar exactamente uno de: materialId, varianteId o comboId',
        );
      }
      const item = new ItemSolicitudCarrito();
      item.cantidad = d.cantidad;
      // Mismo ítem que ya estaba: conserva el precio pactado salvo que lo cambien.
      const previo = solicitud.items.find(
        (i) =>
          (d.varianteId && i.variante?.id === d.varianteId) ||
          (d.comboId && i.combo?.id === d.comboId) ||
          (d.materialId && i.material?.id === d.materialId),
      );
      let precioLista: number | null = null;
      let divisasLista: number | null = null;

      if (d.varianteId) {
        item.variante = await this.buscarOFallar(m.getRepository(VarianteMaterial), d.varianteId, 'Variante', ['material']);
        precioLista = Number(item.variante.precioVenta);
        divisasLista = item.variante.precioDivisas ?? null;
      } else if (d.comboId) {
        item.combo = await this.buscarOFallar(m.getRepository(Combo), d.comboId, 'Combo');
        precioLista = Number(item.combo.precioCombo);
        divisasLista = item.combo.precioDivisas ?? null;
      } else {
        item.material = await this.buscarOFallar(m.getRepository(Material), d.materialId!, 'Material');
      }

      const previoPrecio =
        previo?.precioUnitario !== null && previo?.precioUnitario !== undefined
          ? Number(previo.precioUnitario)
          : null;
      item.precioUnitario = d.precioUnitario ?? previoPrecio ?? precioLista;
      item.precioDivisasUnitario = precioDivisasLinea(item.precioUnitario, precioLista, divisasLista);
      item.solicitud = { id } as SolicitudCarrito;
      nuevos.push(item);
    }

    // Servicios: si no vienen, se conservan los que ya tenía el pedido.
    const servicios = dto.servicios
      ? dto.servicios.map((d, orden) =>
          Object.assign(new ServicioSolicitud(), {
            servicioId: d.servicioId ?? null,
            descripcion: d.descripcion.trim(),
            unidad: (d.unidad ?? 'unidad').trim() || 'unidad',
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            orden,
            solicitud: { id } as SolicitudCarrito,
          }),
        )
      : null;
    if (nuevos.length === 0 && (servicios ?? solicitud.servicios ?? []).length === 0) {
      throw new BadRequestException('El pedido necesita al menos un producto, combo o servicio');
    }

    await m.getRepository(ItemSolicitudCarrito).delete({ solicitud: { id } } as any);
    await m.getRepository(ItemSolicitudCarrito).save(nuevos);
    if (servicios) {
      await m.getRepository(ServicioSolicitud).delete({ solicitud: { id } } as any);
      await m.getRepository(ServicioSolicitud).save(servicios);
    }

    const cambios: Partial<SolicitudCarrito> = { modificadaDesdeEnvio: true };
    if (dto.totalFinal !== undefined) cambios.totalFinal = dto.totalFinal;
    await m.getRepository(SolicitudCarrito).update({ id }, cambios as any);

    const actualizada = await this.findOne(id);
    await this.registrarEvento(actualizada, 'items_editados', usuarioId, {
      antes,
      despues: this.resumenItems(actualizada.items, actualizada.servicios),
      totalFinal: actualizada.totalFinal ?? null,
    });
    return actualizada;
  }

  /**
   * Reenvía al cliente el detalle vigente: por correo si dejó uno y, para
   * WhatsApp, devuelve el texto listo para abrir el chat (wa.me no se puede
   * enviar solo: lo abre el asesor con un clic). Deja la solicitud al día.
   */
  async enviarDetalle(id: string, usuarioId?: string) {
    const solicitud = await this.findOne(id);
    if (!ESTADOS_EDITABLES.includes(solicitud.estado)) {
      throw new ConflictException(`La solicitud está ${solicitud.estado}`);
    }
    const { texto, emailEnviado } = await this.notificacionesService.enviarDetalleACliente(solicitud);
    await this.manager
      .getRepository(SolicitudCarrito)
      .update({ id }, { modificadaDesdeEnvio: false });
    await this.registrarEvento(solicitud, 'detalle_enviado', usuarioId, { emailEnviado });
    return { mensaje: texto, telefono: solicitud.clienteTelefono, emailEnviado };
  }

  private totalesDe(solicitud: SolicitudCarrito) {
    return totalesPedido((solicitud.items ?? []) as any, solicitud.servicios, solicitud.totalFinal);
  }

  /** Stock que otras reservas ya tienen apartado, por variante. */
  private async reservadoPorOtros(excluirId: string): Promise<Map<string, number>> {
    const otras = await this.manager.getRepository(SolicitudCarrito).find({
      where: { estado: EstadoSolicitudCarrito.RESERVADA },
      relations: RELACIONES_DETALLE,
    });
    const mapa = new Map<string, number>();
    for (const o of otras) {
      if (o.id === excluirId) continue;
      try {
        for (const sal of planificarSalidas(o.items as any)) {
          mapa.set(sal.variante.id, (mapa.get(sal.variante.id) ?? 0) + sal.cantidad);
        }
      } catch {
        // Una reserva con ítems sin definir no aparta nada concreto.
      }
    }
    return mapa;
  }

  /** Reservado por variante (para mostrar en el panel de inventario). */
  async reservas(): Promise<Array<{ varianteId: string; reservado: number }>> {
    return [...(await this.reservadoPorOtros('')).entries()].map(([varianteId, reservado]) => ({ varianteId, reservado }));
  }

  /** Faltantes del pedido contra el stock físico menos lo apartado por otras reservas. */
  private async faltantesDe(solicitud: SolicitudCarrito, lock = false) {
    const salidas = planificarSalidas(solicitud.items as any);
    const ids = salidas.map((x) => x.variante.id).sort();
    let variantes: VarianteMaterial[] = [];
    if (ids.length > 0) {
      const qb = this.manager.getRepository(VarianteMaterial).createQueryBuilder('v').where('v.id IN (:...ids)', { ids }).orderBy('v.id');
      if (lock) qb.setLock('pessimistic_write');
      variantes = await qb.getMany();
    }
    const ajeno = await this.reservadoPorOtros(solicitud.id);
    const stock = new Map(variantes.map((v) => [v.id, v.stock - (ajeno.get(v.id) ?? 0)]));
    return { salidas, variantes, faltantes: calcularFaltantes(salidas, stock) };
  }

  /**
   * Registra un cobro (parcial o total). El primer abono aparta el stock
   * (estado "reservada", sin descontarlo); al cubrir todo el total se cierra la
   * venta sola y recién ahí se descuenta el inventario.
   */
  async registrarPago(id: string, dto: PagoDto, usuarioId?: string): Promise<SolicitudCarrito> {
    const m = this.manager;
    await m.query(`SELECT id FROM solicitudes_carrito WHERE id = $1 FOR UPDATE`, [id]);
    await this.agregarPago(id, dto, usuarioId);
    return this.reevaluar(id, usuarioId);
  }

  private async agregarPago(id: string, dto: PagoDto, usuarioId?: string): Promise<void> {
    const m = this.manager;
    const solicitud = await this.findOne(id);
    if (!ESTADOS_EDITABLES.includes(solicitud.estado)) {
      throw new ConflictException(`La solicitud ya está ${solicitud.estado}`);
    }
    if (solicitud.modificadaDesdeEnvio) {
      throw new BadRequestException(
        'El pedido tiene cambios que no se han enviado al cliente. Envía el detalle actualizado antes de cobrar.',
      );
    }
    try {
      planificarSalidas(solicitud.items as any);
    } catch (error) {
      if (error instanceof CarritoNoCerrableError) throw new BadRequestException(error.message);
      throw error;
    }
    const totales = this.totalesDe(solicitud);
    if (totales.bcv <= 0) throw new BadRequestException('El pedido no tiene un total que cobrar');
    const previo = resumenCobro(totales, solicitud.pagos ?? []);

    const abona = dto.abona ?? abonoPorDefecto(dto.metodo, dto.monto, totales.factor);
    if (abona > previo.saldo + TOLERANCIA_SALDO) {
      throw new BadRequestException(
        `Ese pago cubre $${abona.toFixed(2)} y el saldo del pedido es $${previo.saldo.toFixed(2)}. Ajusta el monto.`,
      );
    }
    let tasa: number | null = null;
    let montoBs: number | null = null;
    if (esMetodoBolivares(dto.metodo)) {
      tasa = dto.tasaBcv ?? (await this.tasas.vigente())?.valor ?? null;
      if (!tasa) {
        throw new BadRequestException(
          'No hay tasa BCV disponible. Regístrala en Configuración o indícala en el pago.',
        );
      }
      montoBs = Math.round(dto.monto * tasa * 100) / 100;
    }
    await m.getRepository(PagoSolicitud).insert({
      solicitud: { id },
      metodo: dto.metodo,
      monto: dto.monto,
      abona,
      tasaBcv: tasa,
      montoBs,
      referencia: dto.referencia ?? null,
      usuarioId: usuarioId ?? null,
    } as any);
    await this.registrarEvento(solicitud, 'pago', usuarioId, {
      metodo: dto.metodo,
      monto: dto.monto,
      abona,
      referencia: dto.referencia ?? null,
      saldoAntes: previo.saldo,
    });
  }

  /**
   * Deja el estado coherente con lo cobrado: sin pagos, vuelve a "contactado";
   * con abonos pendientes, "reservada" (o "pendiente por stock" si no alcanza la
   * mercancía); con todo cobrado, cierra la venta y descuenta el inventario.
   */
  private async reevaluar(id: string, usuarioId?: string): Promise<SolicitudCarrito> {
    const m = this.manager;
    const solicitud = await this.findOne(id);
    const resumen = resumenCobro(this.totalesDe(solicitud), solicitud.pagos ?? []);
    const repo = m.getRepository(SolicitudCarrito);

    if ((solicitud.pagos ?? []).length === 0) {
      if (solicitud.estado === EstadoSolicitudCarrito.RESERVADA || solicitud.estado === EstadoSolicitudCarrito.PENDIENTE_STOCK) {
        await repo.update({ id }, { estado: EstadoSolicitudCarrito.CONTACTADO, reservaVenceAt: null, faltantes: null } as any);
      } else if (solicitud.reservaVenceAt) {
        await repo.update({ id }, { reservaVenceAt: null } as any);
      }
      return this.findOne(id);
    }

    if (resumen.pagadoCompleto) return this.finalizar(id, usuarioId);

    const { faltantes } = await this.faltantesDe(solicitud);
    const venceAt =
      solicitud.reservaVenceAt ?? new Date(Date.now() + (await this.configuracion.reservaDias()) * 24 * 60 * 60 * 1000);
    if (faltantes.length > 0) {
      await repo.update({ id }, { estado: EstadoSolicitudCarrito.PENDIENTE_STOCK, faltantes, reservaVenceAt: venceAt } as any);
    } else {
      await repo.update({ id }, { estado: EstadoSolicitudCarrito.RESERVADA, faltantes: null, reservaVenceAt: venceAt } as any);
      if (solicitud.estado !== EstadoSolicitudCarrito.RESERVADA) {
        await this.registrarEvento(solicitud, 'reserva', usuarioId, { venceAt: venceAt.toISOString() });
      }
    }
    return this.findOne(id);
  }

  async eliminarPago(id: string, pagoId: string, usuarioId?: string): Promise<SolicitudCarrito> {
    const m = this.manager;
    await m.query(`SELECT id FROM solicitudes_carrito WHERE id = $1 FOR UPDATE`, [id]);
    const solicitud = await this.findOne(id);
    if (!ESTADOS_EDITABLES.includes(solicitud.estado)) {
      throw new ConflictException(`La solicitud ya está ${solicitud.estado}: no se pueden quitar pagos`);
    }
    const pago = (solicitud.pagos ?? []).find((p) => p.id === pagoId);
    if (!pago) throw new NotFoundException('Pago no encontrado en esta solicitud');
    await m.getRepository(PagoSolicitud).delete({ id: pagoId });
    await this.registrarEvento(solicitud, 'pago_eliminado', usuarioId, {
      metodo: pago.metodo,
      monto: pago.monto,
      abona: pago.abona,
      referencia: pago.referencia ?? null,
    });
    return this.reevaluar(id, usuarioId);
  }

  /** Cambia el vencimiento de la reserva (a N días desde hoy). */
  async prorrogarReserva(id: string, dias: number, usuarioId?: string): Promise<SolicitudCarrito> {
    const solicitud = await this.findOne(id);
    if (solicitud.estado !== EstadoSolicitudCarrito.RESERVADA && solicitud.estado !== EstadoSolicitudCarrito.PENDIENTE_STOCK) {
      throw new ConflictException('Solo se puede cambiar el vencimiento de una solicitud con abonos');
    }
    const venceAt = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    await this.manager.getRepository(SolicitudCarrito).update({ id }, { reservaVenceAt: venceAt } as any);
    await this.registrarEvento(solicitud, 'reserva', usuarioId, { venceAt: venceAt.toISOString(), prorroga: true });
    return this.findOne(id);
  }

  /**
   * Cierra la venta: requiere todo cobrado. Con `pagos` los registra antes
   * (cierre en un solo paso: si algo falla no queda nada a medias); sin ellos
   * reintenta cerrar con lo abonado (útil tras "pendiente por stock").
   */
  async cerrar(id: string, dto: CerrarCarritoDto, usuarioId?: string): Promise<SolicitudCarrito> {
    const m = this.manager;
    await m.query(`SELECT id FROM solicitudes_carrito WHERE id = $1 FOR UPDATE`, [id]);
    for (const pago of dto.pagos ?? []) await this.agregarPago(id, pago, usuarioId);
    const solicitud = await this.findOne(id);
    if (!ESTADOS_EDITABLES.includes(solicitud.estado)) {
      throw new ConflictException(`La solicitud ya está ${solicitud.estado}`);
    }
    if (solicitud.modificadaDesdeEnvio) {
      throw new BadRequestException(
        'El pedido tiene cambios que no se han enviado al cliente. Envía el detalle actualizado antes de cerrar.',
      );
    }
    const resumen = resumenCobro(this.totalesDe(solicitud), solicitud.pagos ?? []);
    if (!resumen.pagadoCompleto) {
      throw new BadRequestException(
        resumen.recibido === 0 && resumen.bcv > 0
          ? 'Registra el pago antes de cerrar la venta.'
          : `Falta cobrar $${resumen.saldo.toFixed(2)} (a precio BCV) para cerrar la venta.`,
      );
    }
    return this.finalizar(id, usuarioId);
  }

  /**
   * Con todo cobrado: descuenta el stock y registra el ingreso, todo en la
   * transacción del request. Si falta mercancía no descuenta nada: deja la venta
   * en "pendiente por stock" con el detalle de lo que falta (el cobro se conserva).
   */
  private async finalizar(id: string, usuarioId?: string): Promise<SolicitudCarrito> {
    const m = this.manager;
    const solicitud = await this.findOne(id);
    const totales = this.totalesDe(solicitud);
    const pagos = solicitud.pagos ?? [];
    const resumen = resumenCobro(totales, pagos);

    // Lo cobrado en dinero: los servicios valen igual en cualquier método.
    const monto = resumen.recibido;
    const reparto = repartirCobro(monto, totales.productosBcv, totales.serviciosBcv, totales.serviciosBcv > 0 ? totales.serviciosBcv : undefined);

    let planificado;
    try {
      planificado = planificarSalidas(solicitud.items as any, reparto.productos);
    } catch (error) {
      if (error instanceof CarritoNoCerrableError) throw new BadRequestException(error.message);
      throw error;
    }
    const { variantes, faltantes } = await this.faltantesDe(solicitud, true);

    const principal = [...pagos].sort((a, b) => b.monto - a.monto)[0];
    const bs = pagos.filter((p) => p.montoBs !== null && p.montoBs !== undefined);
    const ultimaTasa = [...bs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]?.tasaBcv ?? null;
    const datosPago = {
      metodoPago: principal.metodo,
      referenciaPago: principal.referencia ?? null,
      montoCobrado: monto,
      montoServicios: reparto.servicios,
      descuentoIncluyeServicios: null,
      descuentoPct: null,
      descuentoMonto: null,
      tasaBcv: ultimaTasa,
      montoCobradoBs: bs.length ? Math.round(bs.reduce((x, p) => x + Number(p.montoBs), 0) * 100) / 100 : null,
    };

    if (faltantes.length > 0) {
      await m.getRepository(SolicitudCarrito).update(
        { id },
        { ...datosPago, estado: EstadoSolicitudCarrito.PENDIENTE_STOCK, faltantes } as any,
      );
      const pendiente = await this.findOne(id);
      await this.registrarEvento(pendiente, 'pendiente_stock', usuarioId, { faltantes, ...datosPago });
      return pendiente;
    }

    const repoVar = m.getRepository(VarianteMaterial);
    const repoMov = m.getRepository(MovimientoInventario);
    for (const s of planificado) {
      const variante = variantes.find((v) => v.id === s.variante.id)!;
      variante.stock -= s.cantidad;
      await repoVar.save(variante);
      await repoMov.save(
        repoMov.create({
          variante,
          tipo: TipoMovimiento.SALIDA,
          cantidad: s.cantidad,
          motivo: `Venta carrito ${id.slice(0, 8)}`,
          usuario: usuarioId ? ({ id: usuarioId } as any) : undefined,
          precioVentaUnitario: s.precioVentaUnitario,
          precioCostoUnitario: s.precioCostoUnitario,
          solicitudId: id,
        }),
      );
    }

    await m.getRepository(SolicitudCarrito).update(
      { id },
      { ...datosPago, estado: EstadoSolicitudCarrito.CERRADA, faltantes: null, cerradaAt: new Date(), reservaVenceAt: null } as any,
    );
    const cerrada = await this.findOne(id);
    await this.registrarEvento(cerrada, 'cerrada', usuarioId, {
      ...datosPago,
      pagos: pagos.length,
      unidades: planificado.reduce((a, s) => a + s.cantidad, 0),
    });
    return cerrada;
  }

  /**
   * Registra (o quita, con null) lo pagado a trabajadores por la mano de obra
   * del pedido. Se puede hacer antes o después de cerrar la venta, porque el
   * pago a los trabajadores suele conocerse después.
   */
  async registrarCostoServicios(id: string, costo: number | null, usuarioId?: string): Promise<SolicitudCarrito> {
    const m = this.manager;
    await m.query(`SELECT id FROM solicitudes_carrito WHERE id = $1 FOR UPDATE`, [id]);
    const solicitud = await this.findOne(id);
    if (solicitud.estado === EstadoSolicitudCarrito.CANCELADA) {
      throw new ConflictException('La solicitud está cancelada');
    }
    if ((solicitud.servicios ?? []).length === 0) {
      throw new BadRequestException('Este pedido no tiene servicios');
    }
    const nuevo = costo ?? null;
    await m.getRepository(SolicitudCarrito).update({ id }, { costoServicios: nuevo } as any);
    const actualizada = await this.findOne(id);
    await this.registrarEvento(actualizada, 'costo_servicios', usuarioId, {
      antes: solicitud.costoServicios ?? null,
      despues: nuevo,
    });
    return actualizada;
  }

  /**
   * Cancela la solicitud (cliente desistió, o reembolso por falta de stock).
   * Si ya estaba cerrada es una anulación: solo admin, y repone el stock con
   * entradas compensatorias; el reporte de ganancias deja de contarla.
   */
  async cancelar(
    id: string,
    dto: CancelarCarritoDto,
    usuario?: { id: string; rol: string },
  ): Promise<SolicitudCarrito> {
    const m = this.manager;
    await m.query(`SELECT id FROM solicitudes_carrito WHERE id = $1 FOR UPDATE`, [id]);
    const solicitud = await this.findOne(id);

    if (solicitud.estado === EstadoSolicitudCarrito.CANCELADA) {
      throw new ConflictException('La solicitud ya está cancelada');
    }
    const anulacion = solicitud.estado === EstadoSolicitudCarrito.CERRADA;
    if (anulacion && usuario?.rol !== 'admin') {
      throw new ForbiddenException('Solo un administrador puede anular una venta cerrada');
    }

    if (anulacion) {
      const repoMov = m.getRepository(MovimientoInventario);
      const salidas = await repoMov.find({
        where: { solicitudId: id, tipo: TipoMovimiento.SALIDA },
      });
      const repoVar = m.getRepository(VarianteMaterial);
      for (const salida of [...salidas].sort((a, b) => a.variante.id.localeCompare(b.variante.id))) {
        const variante = await repoVar
          .createQueryBuilder('v')
          .setLock('pessimistic_write')
          .where('v.id = :id', { id: salida.variante.id })
          .getOneOrFail();
        variante.stock += salida.cantidad;
        await repoVar.save(variante);
        await repoMov.save(
          repoMov.create({
            variante,
            tipo: TipoMovimiento.ENTRADA,
            cantidad: salida.cantidad,
            motivo: `Anulación venta carrito ${id.slice(0, 8)}`,
            usuario: usuario ? ({ id: usuario.id } as any) : undefined,
            solicitudId: id,
          }),
        );
      }
    }

    await m.getRepository(SolicitudCarrito).update(
      { id },
      {
        estado: EstadoSolicitudCarrito.CANCELADA,
        motivoCancelacion: dto.motivo,
        montoReembolsado: dto.montoReembolsado ?? null,
        faltantes: null,
      } as any,
    );
    const cancelada = await this.findOne(id);
    await this.registrarEvento(cancelada, anulacion ? 'anulada' : 'cancelada', usuario?.id, {
      motivo: dto.motivo,
      montoReembolsado: dto.montoReembolsado ?? null,
    });
    return cancelada;
  }

  private async buscarOFallar<T extends { id: string }>(
    repo: Repository<T>,
    id: string,
    nombreEntidad: string,
    relations: string[] = [],
  ): Promise<T> {
    const entidad = await repo.findOne({ where: { id } as any, relations });
    if (!entidad) {
      throw new NotFoundException(`${nombreEntidad} ${id} no encontrado`);
    }
    return entidad;
  }
}
