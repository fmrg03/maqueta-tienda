import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service';
import { RolUsuario, Usuario } from './entities/usuario.entity';
import { BadRequestException } from '@nestjs/common';
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
  update: jest.fn(),
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
    protegido: false,
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

    it('lanza ForbiddenException si intenta cambiar el rol de una cuenta protegida', async () => {
      repository.findOne!.mockResolvedValue({
        ...usuarioBase,
        protegido: true,
        rol: RolUsuario.ADMIN,
      });

      await expect(
        service.update('uuid-1', { rol: RolUsuario.CLIENTE }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('permite editar otros campos de una cuenta protegida si no toca el rol', async () => {
      repository.findOne!.mockResolvedValue({
        ...usuarioBase,
        protegido: true,
        rol: RolUsuario.ADMIN,
      });
      repository.save!.mockImplementation((u) => Promise.resolve(u));

      const resultado = await service.update('uuid-1', { nombre: 'Nuevo Nombre' });

      expect(resultado.nombre).toBe('Nuevo Nombre');
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

    it('lanza ForbiddenException si la cuenta está protegida, sin importar quién la pida', async () => {
      repository.findOne!.mockResolvedValue({
        ...usuarioBase,
        protegido: true,
        activo: true,
      });

      await expect(service.desactivar('uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('administración de cuentas', () => {
    it('no deja desactivar la cuenta protegida por PATCH', async () => {
      repository.findOne!.mockResolvedValue({ ...usuarioBase, protegido: true, rol: RolUsuario.ADMIN });
      await expect(service.update('uuid-1', { activo: false }, 'otro-admin')).rejects.toThrow(ForbiddenException);
    });

    it('no deja que un admin se desactive ni cambie su propio rol', async () => {
      repository.findOne!.mockResolvedValue({ ...usuarioBase, rol: RolUsuario.ADMIN });
      await expect(service.update('uuid-1', { activo: false }, 'uuid-1')).rejects.toThrow(BadRequestException);
      await expect(service.update('uuid-1', { rol: RolUsuario.VENTAS }, 'uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('al desactivar o cambiar de rol cierra las sesiones del usuario', async () => {
      const redis = { set: jest.fn() };
      (service as any).redis = redis;
      repository.findOne!.mockResolvedValue({ ...usuarioBase });
      repository.save!.mockImplementation((u) => Promise.resolve(u));
      await service.update('uuid-1', { activo: false }, 'admin-x');
      expect(redis.set).toHaveBeenCalledWith('sesiones:corte:uuid-1', expect.any(String), 'EX', expect.any(Number));
    });

    it('restablecerPassword genera una temporal de 12 caracteres, la guarda hasheada y cierra sesiones', async () => {
      const redis = { set: jest.fn() };
      (service as any).redis = redis;
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash-nuevo');
      repository.findOne!.mockResolvedValue({ ...usuarioBase });
      const r = await service.restablecerPassword('uuid-1', 'admin-x');
      expect(r.passwordTemporal).toHaveLength(12);
      expect(repository.update).toHaveBeenCalledWith({ id: 'uuid-1' }, { passwordHash: 'hash-nuevo' });
      expect(redis.set).toHaveBeenCalled();
    });

    it('la contraseña de la cuenta protegida solo la cambia su dueño', async () => {
      repository.findOne!.mockResolvedValue({ ...usuarioBase, protegido: true });
      await expect(service.restablecerPassword('uuid-1', 'otro-admin')).rejects.toThrow(ForbiddenException);
      (bcrypt.hash as jest.Mock).mockResolvedValue('h');
      await expect(service.restablecerPassword('uuid-1', 'uuid-1', 'ClaveNueva123')).resolves.toEqual({});
    });
  });

  describe('cambiarPasswordPropia', () => {
    const qb = (u: unknown) => ({ addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(u) });

    it('rechaza si la contraseña actual no coincide', async () => {
      repository.createQueryBuilder!.mockReturnValue(qb({ ...usuarioBase }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.cambiarPasswordPropia('uuid-1', 'mala', 'NuevaClave123')).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rechaza una nueva igual a la actual', async () => {
      repository.createQueryBuilder!.mockReturnValue(qb({ ...usuarioBase }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.cambiarPasswordPropia('uuid-1', 'Misma12345', 'Misma12345')).rejects.toThrow(BadRequestException);
    });

    it('guarda el hash nuevo y cierra las sesiones', async () => {
      const redis = { set: jest.fn() };
      (service as any).redis = redis;
      repository.createQueryBuilder!.mockReturnValue(qb({ ...usuarioBase }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash-nuevo');
      await service.cambiarPasswordPropia('uuid-1', 'Actual12345', 'NuevaClave123');
      expect(repository.update).toHaveBeenCalledWith({ id: 'uuid-1' }, { passwordHash: 'hash-nuevo' });
      expect(redis.set).toHaveBeenCalled();
    });
  });
});
