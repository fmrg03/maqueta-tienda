import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RolUsuario, Usuario } from '../usuarios/entities/usuario.entity';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usuariosService: Partial<Record<keyof UsuariosService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock; ttl: jest.Mock };

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
      findOneParaRefresh: jest.fn(),
      findByEmailConPassword: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn(),
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
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('retorna tokens y usuario cuando las credenciales son válidas, y registra la sesión en Redis', async () => {
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
      expect((resultado.usuario as any).passwordHash).toBeUndefined();
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('refresh:familia:'),
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usuariosService.findByEmailConPassword!.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('corre bcrypt.compare incluso si el usuario no existe (mitiga timing attack de enumeración)', async () => {
      usuariosService.findByEmailConPassword!.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'noexiste@example.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).toHaveBeenCalled();
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
    const payloadValido = { sub: 'uuid-1', familyId: 'familia-1', jti: 'jti-1' };

    it('rota el token si el jti coincide con el vigente en Redis', async () => {
      jwtService.verifyAsync!.mockResolvedValue(payloadValido);
      redis.get.mockResolvedValue('jti-1');
      redis.ttl.mockResolvedValue(500_000);
      usuariosService.findOneParaRefresh!.mockResolvedValue(usuarioConHash);
      jwtService.signAsync!
        .mockResolvedValueOnce('nuevo-access-token')
        .mockResolvedValueOnce('nuevo-refresh-token');

      const resultado = await service.refresh('refresh-token-valido');

      expect(resultado.accessToken).toBe('nuevo-access-token');
      expect(resultado.refreshToken).toBe('nuevo-refresh-token');
      expect(redis.set).toHaveBeenCalledWith(
        'refresh:familia:familia-1',
        expect.any(String),
        'EX',
        500_000,
      );
    });

    it('detecta reuso (jti no coincide con el vigente) y revoca toda la familia', async () => {
      jwtService.verifyAsync!.mockResolvedValue(payloadValido);
      redis.get.mockResolvedValue('otro-jti-mas-nuevo');

      await expect(service.refresh('refresh-token-viejo-reusado')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(redis.del).toHaveBeenCalledWith('refresh:familia:familia-1');
      expect(usuariosService.findOneParaRefresh).not.toHaveBeenCalled();
    });

    it('rechaza si la familia no existe en Redis (sesión ya cerrada o expirada)', async () => {
      jwtService.verifyAsync!.mockResolvedValue(payloadValido);
      redis.get.mockResolvedValue(null);

      await expect(service.refresh('refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el token es inválido o expiró', async () => {
      jwtService.verifyAsync!.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refresh('token-invalido')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revoca la familia si el usuario del token está inactivo', async () => {
      jwtService.verifyAsync!.mockResolvedValue(payloadValido);
      redis.get.mockResolvedValue('jti-1');
      usuariosService.findOneParaRefresh!.mockResolvedValue({
        ...usuarioConHash,
        activo: false,
      });

      await expect(service.refresh('refresh-token-valido')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redis.del).toHaveBeenCalledWith('refresh:familia:familia-1');
    });
  });

  describe('logout', () => {
    it('revoca la familia de sesión del token presentado', async () => {
      jwtService.verifyAsync!.mockResolvedValue({
        sub: 'uuid-1',
        familyId: 'familia-1',
        jti: 'jti-1',
      });

      await service.logout('refresh-token-valido');

      expect(redis.del).toHaveBeenCalledWith('refresh:familia:familia-1');
    });

    it('no lanza error si el token ya es inválido — el objetivo (que no sirva) ya se cumple', async () => {
      jwtService.verifyAsync!.mockRejectedValue(new Error('jwt expired'));

      await expect(service.logout('token-invalido')).resolves.not.toThrow();
      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
