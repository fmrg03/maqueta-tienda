import { Exclude, Expose } from 'class-transformer';
import { RolUsuario } from '../entities/usuario.entity';

// Se usa con ClassSerializerInterceptor para garantizar que
// passwordHash nunca salga en una respuesta HTTP, sin depender
// solo de `select: false` en la entidad.
@Exclude()
export class UsuarioResponseDto {
  @Expose()
  id: string;

  @Expose()
  nombre: string;

  @Expose()
  email: string;

  @Expose()
  rol: RolUsuario;

  @Expose()
  telefono?: string;

  @Expose()
  activo: boolean;

  @Expose()
  protegido: boolean;

  @Expose()
  createdAt: Date;

  // Asignación explícita campo por campo (no Object.assign genérico):
  // así garantizamos que passwordHash u otros campos sensibles de la
  // entidad Usuario jamás terminen en esta instancia, sin depender
  // únicamente de que el ClassSerializerInterceptor esté activo.
  constructor(usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: RolUsuario;
    telefono?: string;
    activo: boolean;
    protegido: boolean;
    createdAt: Date;
  }) {
    this.id = usuario.id;
    this.nombre = usuario.nombre;
    this.email = usuario.email;
    this.rol = usuario.rol;
    this.telefono = usuario.telefono;
    this.activo = usuario.activo;
    this.protegido = usuario.protegido;
    this.createdAt = usuario.createdAt;
  }
}
