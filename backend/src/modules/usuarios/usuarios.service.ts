import {
  ConflictException,
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
    // solo las de INSERT. Un usuario recién auto-registrado no es "admin"
    // ni "su propio id" todavía (no hay sesión), así que reusamos el
    // mismo contexto 'service_auth' que login usa para su propio lookup.
    const manager = getRlsManager();
    if (opciones?.esRegistroPublico && manager) {
      await manager.query(
        `SELECT set_config('app.rol', 'service_auth', true)`,
      );
    }

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

    Object.assign(usuario, dto);
    return this.repo.save(usuario);
  }

  async desactivar(id: string): Promise<void> {
    const usuario = await this.findOne(id);
    usuario.activo = false;
    await this.repo.save(usuario);
  }
}
