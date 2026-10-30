import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/** Ajustes globales del negocio editables desde el panel (clave → valor JSON). */
@Entity('configuracion')
export class Configuracion {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  clave: string;

  @Column({ type: 'jsonb' })
  valor: unknown;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  usuarioId?: string | null;
}
