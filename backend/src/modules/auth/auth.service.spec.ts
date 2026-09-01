import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RolUsuario, Usuario } from '../usuarios/entities/usuario.entity';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usuariosService: Partial<Record<keyof UsuariosService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;

  const usuarioConHash: Usuario = {
    id: 'uuid-1',
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    passwordHash: 'hash-guardado',
    rol: RolUsuario.CLIENTE,
    telefono: '+584121234567',
    activo: true,
    protegido: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    usuariosService = {
      create: jest.fn(),
      findOne: jest.fn(),
      findByEmailConPassword: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: usuariosService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('secret-de-prueba') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('retorna tokens y usuario cuando las credenciales son válidas', async () => {
      usuariosService.findByEmailConPassword!.mockResolvedValue(
        usuarioConHash,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync!
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const resultado = await service.login({
        email: 'juan@example.com',
        password: 'password123',
      });

      expect(resultado.accessToken).toBe('access-token');
      expect(resultado.refreshToken).toBe('refresh-token');
      expect(resultado.usuario.email).toBe('juan@example.com');
      // passwordHash nunca debe filtrarse en la respuesta
      expect((resultado.usuario as any).passwordHash).toBeUndefined();
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usuariosService.findByEmailConPassword!.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el usuario está inactivo', async () => {
      usuariosService.findByEmailConPassword!.mockResolvedValue({
        ...usuarioConHash,
        activo: false,
      });

      await expect(
        service.login({ email: 'juan@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el password no coincide', async () => {
      usuariosService.findByEmailConPassword!.mockResolvedValue(
        usuarioConHash,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'juan@example.com', password: 'incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('genera nuevos tokens si el refresh token es válido y el usuario está activo', async () => {
      jwtService.verifyAsync!.mockResolvedValue({
        sub: 'uuid-1',
        email: 'juan@example.com',
        rol: RolUsuario.CLIENTE,
      });
      usuariosService.findOne!.mockResolvedValue(usuarioConHash);
      jwtService.signAsync!
        .mockResolvedValueOnce('nuevo-access-token')
        .mockResolvedValueOnce('nuevo-refresh-token');

      const resultado = await service.refresh('refresh-token-valido');

      expect(resultado.accessToken).toBe('nuevo-access-token');
      expect(resultado.refreshToken).toBe('nuevo-refresh-token');
    });

    it('lanza UnauthorizedException si el token es inválido o expiró', async () => {
      jwtService.verifyAsync!.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('token-invalido')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el usuario del token está inactivo', async () => {
      jwtService.verifyAsync!.mockResolvedValue({
        sub: 'uuid-1',
        email: 'juan@example.com',
        rol: RolUsuario.CLIENTE,
      });
      usuariosService.findOne!.mockResolvedValue({
        ...usuarioConHash,
        activo: false,
      });

      await expect(service.refresh('refresh-token-valido')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
