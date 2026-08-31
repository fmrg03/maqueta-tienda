import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RolUsuario {
  ADMIN = 'admin',
  VENTAS = 'ventas',
  ASESOR = 'asesor',
  CLIENTE = 'cliente',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  email: string;

  // Nunca se expone en respuestas de la API (ver UsuarioResponseDto).
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.CLIENTE })
  rol: RolUsuario;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // timestamptz: ver ARCHITECTURE.md sección "Modelo de Datos" — todo en UTC.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
