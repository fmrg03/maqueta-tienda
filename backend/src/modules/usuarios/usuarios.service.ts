import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { getRlsManager } from '../../common/rls/request-context';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

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

  async findAll(): Promise<Usuario[]> {
    return this.repo.find();
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

  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
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

    Object.assign(usuario, dto);
    return this.repo.save(usuario);
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
  }
}
