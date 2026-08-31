import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service';
import { RolUsuario, Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

// Mock de bcrypt: en tests unitarios no queremos hashing real (lento y no
// determinístico), solo verificar que el servicio lo invoca correctamente.
jest.mock('bcrypt');

type MockRepository = Partial<Record<keyof Repository<Usuario>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('UsuariosService', () => {
  let service: UsuariosService;
  let repository: MockRepository;

  const usuarioBase: Usuario = {
    id: 'uuid-1',
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    passwordHash: 'hash-simulado',
    rol: RolUsuario.CLIENTE,
    telefono: '+584121234567',
    activo: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    repository = module.get(getRepositoryToken(Usuario));

    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateUsuarioDto = {
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'password123',
    };

    it('crea un usuario con password hasheado cuando el email no existe', async () => {
      repository.findOne!.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash-simulado');
      repository.create!.mockReturnValue(usuarioBase);
      repository.save!.mockResolvedValue(usuarioBase);

      const resultado = await service.create(dto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          passwordHash: 'hash-simulado',
        }),
      );
      expect(resultado).toEqual(usuarioBase);
    });

    it('lanza ConflictException si el email ya está registrado', async () => {
      repository.findOne!.mockResolvedValue(usuarioBase);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('retorna el usuario si existe', async () => {
      repository.findOne!.mockResolvedValue(usuarioBase);

      const resultado = await service.findOne('uuid-1');

      expect(resultado).toEqual(usuarioBase);
    });

    it('lanza NotFoundException si no existe', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza campos permitidos sin tocar el email si no cambia', async () => {
      repository.findOne!.mockResolvedValue({ ...usuarioBase });
      repository.save!.mockImplementation((u) => Promise.resolve(u));

      const resultado = await service.update('uuid-1', {
        nombre: 'Juan Actualizado',
      });

      expect(resultado.nombre).toBe('Juan Actualizado');
    });

    it('lanza ConflictException si el nuevo email ya está en uso por otro usuario', async () => {
      repository.findOne!
        .mockResolvedValueOnce({ ...usuarioBase }) // findOne interno (this.findOne)
        .mockResolvedValueOnce({ ...usuarioBase, id: 'otro-uuid' }); // email en uso

      await expect(
        service.update('uuid-1', { email: 'otro@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('desactivar', () => {
    it('marca activo = false y persiste el cambio', async () => {
      const usuarioActivo = { ...usuarioBase, activo: true };
      repository.findOne!.mockResolvedValue(usuarioActivo);
      repository.save!.mockResolvedValue({ ...usuarioActivo, activo: false });

      await service.desactivar('uuid-1');

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ activo: false }),
      );
    });
  });
});
