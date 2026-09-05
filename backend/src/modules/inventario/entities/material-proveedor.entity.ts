import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { VarianteMaterial } from './variante-material.entity';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';

@Entity('material_proveedor')
export class MaterialProveedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Antes apuntaba a Material — se movió a VarianteMaterial porque el
  // costo del proveedor también varía por presentación (una bolsa de
  // 25kg y una de 50kg tienen costos de proveedor distintos), igual que
  // el precio de venta.
  @ManyToOne(() => VarianteMaterial, { onDelete: 'CASCADE' })
  variante: VarianteMaterial;

  @ManyToOne(() => Proveedor, { eager: true, onDelete: 'CASCADE' })
  proveedor: Proveedor;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioCostoProveedor: number;

  @Column({ type: 'int', default: 0 })
  tiempoEntregaDias: number;
}
