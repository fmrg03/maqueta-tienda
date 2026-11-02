import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Servicio de la lista interna (demolición, pegado de cerámica, etc.) con su precio base en USD. */
@Entity('servicios')
export class Servicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  descripcion?: string | null;

  // Cómo se cobra: m², m, unidad, global, día…
  @Column({ type: 'varchar', length: 30, default: 'unidad' })
  unidad: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string | null) => (v === null ? v : Number(v)) },
  })
  precioBase: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
