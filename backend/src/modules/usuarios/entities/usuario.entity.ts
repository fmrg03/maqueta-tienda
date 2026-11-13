import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** Claves de los roles de sistema. Los roles personalizados no están aquí. */
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

  // Clave de `roles` (configurable desde el panel); FK en BD.
  @Column({ type: 'varchar', length: 40, default: RolUsuario.CLIENTE })
  rol: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // true solo en la cuenta admin fundacional (creada por el seed script,
  // nunca vía API). Ningún endpoint puede desactivarla o eliminarla,
  // sin importar quién lo pida — es la cuenta raíz de la que dependen
  // todas las demás. Ver UsuariosService.desactivar y docs/ARCHITECTURE.md.
  @Column({ type: 'boolean', default: false })
  protegido: boolean;

  // timestamptz: ver ARCHITECTURE.md sección "Modelo de Datos" — todo en UTC.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
