import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  SolicitudCarrito,
  ItemSolicitudCarrito,
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
import { EditarItemsCarritoDto } from './dto/editar-items-carrito.dto';
import { CancelarCarritoDto, CerrarCarritoDto } from './dto/cerrar-carrito.dto';
import {
  calcularFaltantes,
  CarritoNoCerrableError,
  planificarSalidas,
  totalItems,
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
      } else if (itemDto.comboId) {
        item.combo = await this.buscarOFallar(
          this.comboRepository,
          itemDto.comboId,
          'Combo',
        );
        item.precioUnitario = Number(item.combo.precioCombo);
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

    return guardada;
  }

  async findAll(estado?: string): Promise<SolicitudCarrito[]> {
    return this.solicitudRepository.find({
      where: estado ? ({ estado } as any) : {},
      relations: RELACIONES_DETALLE,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SolicitudCarrito> {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id },
      relations: RELACIONES_DETALLE,
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud de carrito ${id} no encontrada`);
    }
    return solicitud;
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

  private resumenItems(items: ItemSolicitudCarrito[]) {
    return items.map((i) => ({
      texto: lineaItem(i).texto,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario === null || i.precioUnitario === undefined ? null : Number(i.precioUnitario),
    }));
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
    const antes = this.resumenItems(solicitud.items);

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

      if (d.varianteId) {
        item.variante = await this.buscarOFallar(m.getRepository(VarianteMaterial), d.varianteId, 'Variante', ['material']);
        precioLista = Number(item.variante.precioVenta);
      } else if (d.comboId) {
        item.combo = await this.buscarOFallar(m.getRepository(Combo), d.comboId, 'Combo');
        precioLista = Number(item.combo.precioCombo);
      } else {
        item.material = await this.buscarOFallar(m.getRepository(Material), d.materialId!, 'Material');
      }

      const previoPrecio =
        previo?.precioUnitario !== null && previo?.precioUnitario !== undefined
          ? Number(previo.precioUnitario)
          : null;
      item.precioUnitario = d.precioUnitario ?? previoPrecio ?? precioLista;
      item.solicitud = { id } as SolicitudCarrito;
      nuevos.push(item);
    }

    await m.getRepository(ItemSolicitudCarrito).delete({ solicitud: { id } } as any);
    await m.getRepository(ItemSolicitudCarrito).save(nuevos);

    const cambios: Partial<SolicitudCarrito> = { modificadaDesdeEnvio: true };
    if (dto.totalFinal !== undefined) cambios.totalFinal = dto.totalFinal;
    await m.getRepository(SolicitudCarrito).update({ id }, cambios as any);

    const actualizada = await this.findOne(id);
    await this.registrarEvento(actualizada, 'items_editados', usuarioId, {
      antes,
      despues: this.resumenItems(actualizada.items),
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

  /**
   * Cierra la venta con el pago verificado: descuenta el stock y registra
   * el ingreso, todo en la transacción del request (si algo falla no queda
   * nada a medias). Si falta mercancía no descuenta nada: deja la venta en
   * "pendiente por stock" con el detalle de lo que falta, guardando el pago.
   */
  async cerrar(
    id: string,
    dto: CerrarCarritoDto,
    usuarioId?: string,
  ): Promise<SolicitudCarrito> {
    const m = this.manager;
    // Bloquea la solicitud: dos cierres simultáneos no descuentan dos veces.
    await m.query(`SELECT id FROM solicitudes_carrito WHERE id = $1 FOR UPDATE`, [id]);
    const solicitud = await this.findOne(id);

    if (!ESTADOS_EDITABLES.includes(solicitud.estado)) {
      throw new ConflictException(`La solicitud ya está ${solicitud.estado}`);
    }
    if (solicitud.modificadaDesdeEnvio) {
      throw new BadRequestException(
        'El pedido tiene cambios que no se han enviado al cliente. Envía el detalle actualizado antes de cerrar.',
      );
    }

    const { total } = totalItems(solicitud.items as any);
    const fijo = solicitud.totalFinal !== null && solicitud.totalFinal !== undefined ? Number(solicitud.totalFinal) : null;
    const monto = dto.montoCobrado ?? fijo ?? total;

    let salidas;
    try {
      salidas = planificarSalidas(solicitud.items as any, monto);
    } catch (error) {
      if (error instanceof CarritoNoCerrableError) throw new BadRequestException(error.message);
      throw error;
    }

    const ids = salidas.map((s) => s.variante.id).sort();
    const variantes = await m
      .getRepository(VarianteMaterial)
      .createQueryBuilder('v')
      .setLock('pessimistic_write')
      .where('v.id IN (:...ids)', { ids })
      .orderBy('v.id')
      .getMany();
    const stock = new Map(variantes.map((v) => [v.id, v.stock]));
    const faltantes = calcularFaltantes(salidas, stock);

    const datosPago = {
      metodoPago: dto.metodoPago,
      referenciaPago: dto.referenciaPago ?? null,
      montoCobrado: monto,
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
    for (const s of salidas) {
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
      { ...datosPago, estado: EstadoSolicitudCarrito.CERRADA, faltantes: null, cerradaAt: new Date() } as any,
    );
    const cerrada = await this.findOne(id);
    await this.registrarEvento(cerrada, 'cerrada', usuarioId, { ...datosPago, unidades: salidas.reduce((a, s) => a + s.cantidad, 0) });
    return cerrada;
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
