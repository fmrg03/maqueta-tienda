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

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const existente = await this.usuarioRepository.findOne({
      where: { email: dto.email },
    });
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const usuario = this.usuarioRepository.create({
      nombre: dto.nombre,
      email: dto.email,
      passwordHash,
      rol: dto.rol,
      telefono: dto.telefono,
    });

    return this.usuarioRepository.save(usuario);
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuarioRepository.find();
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return usuario;
  }

  // Incluye passwordHash explícitamente — solo para uso interno de Auth,
  // nunca se expone vía controller.
  async findByEmailConPassword(email: string): Promise<Usuario | null> {
    return this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id);

    if (dto.email && dto.email !== usuario.email) {
      const emailEnUso = await this.usuarioRepository.findOne({
        where: { email: dto.email },
      });
      if (emailEnUso) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    Object.assign(usuario, dto);
    return this.usuarioRepository.save(usuario);
  }

  async desactivar(id: string): Promise<void> {
    const usuario = await this.findOne(id);
    usuario.activo = false;
    await this.usuarioRepository.save(usuario);
  }
}
