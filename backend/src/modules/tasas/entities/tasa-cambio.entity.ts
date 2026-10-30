import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type FuenteTasa = 'bcv' | 'manual';

/** Historial de la tasa BCV: una fila por cambio de valor (no por consulta). */
@Entity('tasas_cambio')
export class TasaCambio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  fuente: FuenteTasa;

  // Bs por 1 USD.
  @Column({ type: 'decimal', precision: 14, scale: 4 })
  valor: number;

  // Fecha que reporta la fuente (cuándo el BCV/API actualizó el valor).
  @Column({ type: 'timestamptz', nullable: true })
  fechaFuente?: Date | null;

  // Última vez que se confirmó que este valor seguía vigente.
  @Column({ type: 'timestamptz', default: () => 'now()' })
  verificadaAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'uuid', nullable: true })
  usuarioId?: string | null;
}
