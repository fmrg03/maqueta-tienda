import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Material } from '../../inventario/entities/material.entity';
import { VarianteMaterial } from '../../inventario/entities/variante-material.entity';
import { Combo } from '../../inventario/entities/combo.entity';

export enum EstadoSolicitudCarrito {
  NUEVA = 'nueva',
  CONTACTADO = 'contactado',
  PAGO_EN_VERIFICACION = 'pago_en_verificacion',
  // Pago recibido pero falta mercancía: no se descontó nada del inventario.
  PENDIENTE_STOCK = 'pendiente_stock',
  CERRADA = 'cerrada',
  CANCELADA = 'cancelada',
}

export const ESTADOS_EDITABLES = [
  EstadoSolicitudCarrito.NUEVA,
  EstadoSolicitudCarrito.CONTACTADO,
  EstadoSolicitudCarrito.PAGO_EN_VERIFICACION,
  EstadoSolicitudCarrito.PENDIENTE_STOCK,
];

export enum MetodoPago {
  // Efectivo en bolívares (el valor histórico 'efectivo').
  EFECTIVO = 'efectivo',
  EFECTIVO_DIVISAS = 'efectivo_divisas',
  PAGO_MOVIL = 'pago_movil',
  TRANSFERENCIA = 'transferencia',
  ZELLE = 'zelle',
  BINANCE = 'binance',
  OTRO = 'otro',
}

/**
 * Métodos que dan derecho al descuento global mientras el admin no elija otros
 * en Configuración (comportamiento original: efectivo en divisas y Zelle).
 */
export const METODOS_DESCUENTO_POR_DEFECTO: MetodoPago[] = [MetodoPago.EFECTIVO_DIVISAS, MetodoPago.ZELLE];

export enum CanalEnvio {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  FORMULARIO = 'formulario',
}

@Entity('solicitudes_carrito')
export class SolicitudCarrito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Número de pedido legible (correlativo); lo asigna la base de datos.
  @Column({ type: 'int', insert: false, update: false })
  numero: number;

  @Column({ type: 'varchar', length: 150 })
  clienteNombre: string;

  @Column({ type: 'varchar', length: 30 })
  clienteTelefono: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  clienteEmail?: string;

  @OneToMany(() => ItemSolicitudCarrito, (item) => item.solicitud, {
    cascade: true,
  })
  items: ItemSolicitudCarrito[];

  @Column({
    type: 'enum',
    enum: EstadoSolicitudCarrito,
    default: EstadoSolicitudCarrito.NUEVA,
  })
  estado: EstadoSolicitudCarrito;

  @Column({ type: 'enum', enum: CanalEnvio, default: CanalEnvio.WHATSAPP })
  canalEnvio: CanalEnvio;

  @Column({ type: 'text', nullable: true })
  notas?: string;

  // Total pactado con el cliente; si es null vale la suma de los ítems.
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalFinal?: number | null;

  // true cuando el asesor editó el pedido y aún no se le reenvió el detalle
  // al cliente: no se puede cerrar la venta sobre una versión sin confirmar.
  @Column({ type: 'boolean', default: false })
  modificadaDesdeEnvio: boolean;

  @Column({ type: 'enum', enum: MetodoPago, nullable: true })
  metodoPago?: MetodoPago | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenciaPago?: string | null;

  // Dinero realmente cobrado (lo que cuenta como ingreso).
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoCobrado?: number | null;

  // % y monto de descuento por divisas aplicados (congelados al cerrar).
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  descuentoPct?: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  descuentoMonto?: number | null;

  // Tasa BCV (Bs/USD) usada al registrar el pago y lo cobrado en bolívares.
  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  tasaBcv?: number | null;

  @Column({ type: 'decimal', precision: 16, scale: 2, nullable: true })
  montoCobradoBs?: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoReembolsado?: number | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivoCancelacion?: string | null;

  // [{varianteId, sku, requerido, disponible, faltan}] mientras esté pendiente_stock.
  @Column({ type: 'jsonb', nullable: true })
  faltantes?: Array<{
    varianteId: string;
    sku: string;
    requerido: number;
    disponible: number;
    faltan: number;
  }> | null;

  @Column({ type: 'timestamptz', nullable: true })
  cerradaAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity('items_solicitud_carrito')
export class ItemSolicitudCarrito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SolicitudCarrito, (solicitud) => solicitud.items, {
    onDelete: 'CASCADE',
  })
  solicitud: SolicitudCarrito;

  @ManyToOne(() => Material, { nullable: true, eager: true })
  material?: Material;

  @ManyToOne(() => VarianteMaterial, { nullable: true, eager: true })
  variante?: VarianteMaterial;

  @ManyToOne(() => Combo, { nullable: true, eager: true })
  combo?: Combo;

  @Column({ type: 'int' })
  cantidad: number;

  // Precio pactado por unidad (editable). null = a confirmar.
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioUnitario?: number | null;
}
