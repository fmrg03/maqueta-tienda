import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Categoria } from './categoria.entity';
import { VarianteMaterial } from './variante-material.entity';

@Entity('materiales')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  sku: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @ManyToOne(() => Categoria, { nullable: true, eager: true })
  categoria?: Categoria;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioCosto: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioVenta: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imagenUrl?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => VarianteMaterial, (variante) => variante.material)
  variantes: VarianteMaterial[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
