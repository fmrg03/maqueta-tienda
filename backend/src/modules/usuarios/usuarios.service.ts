import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { randomInt } from 'crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { ConsultaUsuariosDto } from './dto/consulta-usuarios.dto';
import * as bcrypt from 'bcrypt';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { getRlsManager } from '../../common/rls/request-context';

const BCRYPT_SALT_ROUNDS = 12;
const SESIONES_TTL_SEGUNDOS = 7 * 24 * 60 * 60;
// Sin caracteres que se confunden al dictarlos (0/O, 1/l/I).
const ALFABETO_TEMPORAL = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const claveCorteSesiones = (usuarioId: string) => `sesiones:corte:${usuarioId}`;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
  ) {}

  /** Cierra todas las sesiones abiertas del usuario (refresh y access tokens emitidos hasta ahora). */
  async revocarSesiones(usuarioId: string): Promise<void> {
    await this.redis?.set(
      claveCorteSesiones(usuarioId),
      String(Math.floor(Date.now() / 1000)),
      'EX',
      SESIONES_TTL_SEGUNDOS,
    );
  }

  // La tabla `usuarios` tiene RLS (ver migración AddRowLevelSecurity). Si
  // hay un request en curso con contexto de RLS activo, usamos el
  // repositorio de esa transacción (respeta las políticas); si no —tests
  // unitarios, scripts— caemos al repositorio inyectado normalmente.
  private get repo(): Repository<Usuario> {
    return getRlsManager()?.getRepository(Usuario) ?? this.usuarioRepository;
  }

  async create(
    dto: CreateUsuarioDto,
    opciones?: { esRegistroPublico?: boolean },
  ): Promise<Usuario> {
    // Igual que en el insert más abajo: sin esto, el SELECT de este
    // chequeo de duplicado queda bloqueado por RLS en el registro público
    // (no hay sesión admin ni "propio id" todavía), así que `existente`
    // daría siempre null sin importar si el email ya existe — el INSERT
    // fallaría después con un error crudo de constraint única en vez de
    // un 409 claro. Encontrado con un intento real de registro duplicado.
    const manager = getRlsManager();
    if (opciones?.esRegistroPublico && manager) {
      await manager.query(
        `SELECT set_config('app.rol', 'service_auth', true)`,
      );
    }

    const existente = await this.repo.findOne({
      where: { email: dto.email },
    });
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const usuario = this.repo.create({
      nombre: dto.nombre,
      email: dto.email,
      passwordHash,
      rol: dto.rol,
      telefono: dto.telefono,
    });

    // El INSERT de TypeORM siempre agrega RETURNING para leer columnas
    // generadas (id, defaults). Postgres exige que la fila insertada
    // también pase las políticas de SELECT para poder devolverla — no
    // solo las de INSERT. El set_config de arriba ya cubre este caso
    // también (dura toda la transacción, no hace falta repetirlo).
    return this.repo.save(usuario);
  }

  async findAll(f: ConsultaUsuariosDto = {}): Promise<Usuario[]> {
    const base: Record<string, unknown> = {};
    if (f.rol) base.rol = f.rol;
    if (f.estado === 'activos') base.activo = true;
    if (f.estado === 'inactivos') base.activo = false;
    const texto = f.buscar?.trim();
    const patron = texto ? `%${texto.replace(/[\\%_]/g, '\\$&')}%` : null;
    const where = patron ? [{ ...base, nombre: ILike(patron) }, { ...base, email: ILike(patron) }] : base;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.repo.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return usuario;
  }

  // Incluye passwordHash explícitamente — solo para uso interno de Auth,
  // nunca se expone vía controller. Setea temporalmente `app.rol =
  // 'service_auth'` (política acotada en la migración) porque en este
  // punto todavía no hay un usuario autenticado en la sesión — es
  // exactamente el caso del login.
  async findByEmailConPassword(email: string): Promise<Usuario | null> {
    const manager = getRlsManager();
    if (manager) {
      await manager.query(
        `SELECT set_config('app.rol', 'service_auth', true)`,
      );
    }

    return this.repo
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.email = :email', { email })
      .getOne();
  }

  // Usado exclusivamente por AuthService.refresh(). El endpoint de
  // refresh no pasa por JwtAuthGuard (recibe el refresh token en el
  // body, no un access token en el header), así que no hay contexto de
  // sesión seteado — el `findOne` normal (RLS-protegido) nunca vería al
  // usuario, sin importar si el refresh token es válido. La verificación
  // de firma del JWT ya prueba la identidad antes de llegar acá, así que
  // es seguro usar el mismo contexto 'service_auth' que login/registro.
  // Encontrado con un intento real de refresh: rompía TODOS los refresh,
  // incluso con tokens perfectamente válidos.
  async findOneParaRefresh(id: string): Promise<Usuario> {
    const manager = getRlsManager();
    if (manager) {
      await manager.query(
        `SELECT set_config('app.rol', 'service_auth', true)`,
      );
    }
    return this.findOne(id);
  }

  async update(id: string, dto: UpdateUsuarioDto, actorId?: string): Promise<Usuario> {
    const usuario = await this.findOne(id);

    if (dto.email && dto.email !== usuario.email) {
      const emailEnUso = await this.repo.findOne({
        where: { email: dto.email },
      });
      if (emailEnUso) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    // Igual que con desactivar: nadie puede quitarle el rol admin a la
    // cuenta protegida, aunque sí puede editar otros campos (nombre, etc).
    if (usuario.protegido && dto.rol && dto.rol !== usuario.rol) {
      throw new ForbiddenException(
        'Esta cuenta está protegida y no puede cambiar de rol',
      );
    }
    if (usuario.protegido && dto.activo === false) {
      throw new ForbiddenException(
        'Esta cuenta está protegida y no puede desactivarse',
      );
    }
    // Evita que un admin se deje a sí mismo sin acceso por un descuido.
    if (actorId && actorId === id) {
      if (dto.activo === false) throw new BadRequestException('No puedes desactivar tu propia cuenta');
      if (dto.rol && dto.rol !== usuario.rol) throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    const cierraSesiones =
      (dto.activo === false && usuario.activo) || (dto.rol !== undefined && dto.rol !== usuario.rol);
    Object.assign(usuario, dto);
    const guardado = await this.repo.save(usuario);
    if (cierraSesiones) await this.revocarSesiones(id);
    return guardado;
  }

  /**
   * Fija una contraseña nueva (la indicada o una temporal generada) y cierra
   * las sesiones abiertas. La cuenta protegida solo puede restablecerla ella misma.
   */
  async restablecerPassword(
    id: string,
    actorId: string | undefined,
    password?: string,
  ): Promise<{ passwordTemporal?: string }> {
    const usuario = await this.findOne(id);
    if (usuario.protegido && actorId !== id) {
      throw new ForbiddenException('La contraseña de la cuenta protegida solo puede cambiarla su propietario');
    }
    const nueva = password ?? Array.from({ length: 12 }, () => ALFABETO_TEMPORAL[randomInt(ALFABETO_TEMPORAL.length)]).join('');
    const passwordHash = await bcrypt.hash(nueva, BCRYPT_SALT_ROUNDS);
    await this.repo.update({ id }, { passwordHash });
    await this.revocarSesiones(id);
    return password ? {} : { passwordTemporal: nueva };
  }

  async desactivar(id: string): Promise<void> {
    const usuario = await this.findOne(id);
    // Sin excepción por rol: ni siquiera otro admin puede desactivar la
    // cuenta protegida — es la cuenta raíz de la que dependen todas las
    // demás (ver docs/ARCHITECTURE.md).
    if (usuario.protegido) {
      throw new ForbiddenException(
        'Esta cuenta está protegida y no puede desactivarse',
      );
    }
    usuario.activo = false;
    await this.repo.save(usuario);
    await this.revocarSesiones(id);
  }
}
