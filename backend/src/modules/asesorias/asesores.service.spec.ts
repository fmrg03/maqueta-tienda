import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AsesoresService } from './asesores.service';
import { Asesor, DisponibilidadAsesor } from './entities/asesoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { UsuariosService } from '../usuarios/usuarios.service';

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
  update: jest.fn(),
});

describe('AsesoresService', () => {
  let service: AsesoresService;
  let asesorRepo: ReturnType<typeof createMockRepository>;
  let usuarioRepo: ReturnType<typeof createMockRepository>;
  let disponibilidadRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsesoresService,
        { provide: getRepositoryToken(Asesor), useValue: createMockRepository() },
        { provide: getRepositoryToken(Usuario), useValue: createMockRepository() },
        { provide: getRepositoryToken(DisponibilidadAsesor), useValue: createMockRepository() },
        { provide: UsuariosService, useValue: { create: jest.fn() } },
      ],
    }).compile();

    service = module.get<AsesoresService>(AsesoresService);
    asesorRepo = module.get(getRepositoryToken(Asesor));
    usuarioRepo = module.get(getRepositoryToken(Usuario));
    disponibilidadRepo = module.get(getRepositoryToken(DisponibilidadAsesor));
    jest.clearAllMocks();
  });

  describe('listarPublicos', () => {
    it('consulta solo id, nombre y especialidad de asesores activos (sin datos de la cuenta)', async () => {
      const query = jest.fn().mockResolvedValue([{ id: 'a1', nombre: 'Ana', especialidad: 'Pisos' }]);
      (asesorRepo as any).manager = { query };

      const res = await service.listarPublicos();

      expect(res).toEqual([{ id: 'a1', nombre: 'Ana', especialidad: 'Pisos' }]);
      const sql = query.mock.calls[0][0] as string;
      expect(sql).toContain('a.activo = true');
      expect(sql).not.toMatch(/email|telefono|passwordHash|password/i);
    });
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('crearAsesor', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);

      await expect(service.crearAsesor({ usuarioId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('crea el asesor si el usuario existe', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 'user-1' });
      asesorRepo.create.mockReturnValue({ id: 'asesor-1' });
      asesorRepo.save.mockResolvedValue({ id: 'asesor-1' });

      const resultado = await service.crearAsesor({ usuarioId: 'user-1', especialidad: 'Construcción' });

      expect(resultado).toEqual({ id: 'asesor-1' });
    });
  });

  describe('crearAsesor (cuenta nueva y duplicados)', () => {
    it('crea la cuenta con rol asesor y luego el perfil', async () => {
      const crear = (service as any).usuariosService.create as jest.Mock;
      crear.mockResolvedValue({ id: 'u-nuevo' });
      asesorRepo.findOne.mockResolvedValue(null);
      asesorRepo.create.mockImplementation((x) => x);
      asesorRepo.save.mockImplementation((x) => Promise.resolve({ id: 'a1', ...x }));

      const r = await service.crearAsesor({ nombre: 'Ana', email: 'a@x.com', password: '12345678', especialidad: 'Pisos' });

      expect(crear).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Ana', rol: 'asesor' }));
      expect(r).toMatchObject({ id: 'a1', especialidad: 'Pisos' });
    });

    it('rechaza si la cuenta ya es asesor (409)', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 'u1' });
      asesorRepo.findOne.mockResolvedValue({ id: 'a-existente' });
      await expect(service.crearAsesor({ usuarioId: 'u1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('actualizar', () => {
    it('hace UPDATE de las columnas que cambian y nunca save() (no pisa la cuenta del asesor)', async () => {
      asesorRepo.findOne.mockResolvedValue({ id: 'a1', usuario: null });
      await service.actualizar('a1', { activo: false });
      expect(asesorRepo.update).toHaveBeenCalledWith({ id: 'a1' }, { activo: false });
      expect(asesorRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('agenda: lote y borrado', () => {
    it('el lote rechaza horarios pasados', async () => {
      asesorRepo.findOne.mockResolvedValue({ id: 'a1' });
      await expect(
        service.agregarDisponibilidadLote('a1', { fechasHora: [new Date(Date.now() - 3600e3).toISOString()] }),
      ).rejects.toThrow('ya pasaron');
    });

    it('no borra una franja reservada (409) pero sí una libre', async () => {
      disponibilidadRepo.findOne.mockResolvedValue({ id: 'f1', disponible: false });
      await expect(service.eliminarFranja('f1')).rejects.toThrow(ConflictException);
      (disponibilidadRepo as any).delete = jest.fn();
      disponibilidadRepo.findOne.mockResolvedValue({ id: 'f2', disponible: true });
      await service.eliminarFranja('f2');
      expect((disponibilidadRepo as any).delete).toHaveBeenCalledWith({ id: 'f2' });
    });
  });

  describe('agregarDisponibilidad', () => {
    it('lanza ConflictException si ya existe una franja igual', async () => {
      asesorRepo.findOne.mockResolvedValue({ id: 'asesor-1' });
      disponibilidadRepo.findOne.mockResolvedValue({ id: 'disp-existente' });

      await expect(
        service.agregarDisponibilidad('asesor-1', {
          fechaHora: '2026-09-15T14:00:00Z',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea la franja si no existe conflicto', async () => {
      asesorRepo.findOne.mockResolvedValue({ id: 'asesor-1' });
      disponibilidadRepo.findOne.mockResolvedValue(null);
      disponibilidadRepo.create.mockReturnValue({ id: 'disp-1' });
      disponibilidadRepo.save.mockResolvedValue({ id: 'disp-1' });

      const resultado = await service.agregarDisponibilidad('asesor-1', {
        fechaHora: '2026-09-15T14:00:00Z',
      });

      expect(resultado).toEqual({ id: 'disp-1' });
    });
  });

  describe('disponibilidadLibre', () => {
    it('consulta solo franjas disponibles del asesor desde la fecha dada', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      disponibilidadRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.disponibilidadLibre('asesor-1', new Date('2026-09-01'));

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'disponibilidad.asesorId = :asesorId',
        { asesorId: 'asesor-1' },
      );
      expect(queryBuilder.getMany).toHaveBeenCalled();
    });
  });

  describe('acceso a horarios', () => {
    it('el admin siempre puede; el asesor solo sobre su propia agenda', async () => {
      const query = jest.fn();
      (asesorRepo as any).manager = { query };
      await expect(service.verificarAcceso({ id: 'u1', rol: 'admin' }, 'a1')).resolves.toBeUndefined();
      expect(query).not.toHaveBeenCalled();

      query.mockResolvedValueOnce([{ '?column?': 1 }]);
      await expect(service.verificarAcceso({ id: 'u1', rol: 'asesor' }, 'a1')).resolves.toBeUndefined();
      expect(query).toHaveBeenCalledWith(expect.stringContaining('"usuarioId" = $2'), ['a1', 'u1']);

      query.mockResolvedValueOnce([]);
      await expect(service.verificarAcceso({ id: 'u1', rol: 'asesor' }, 'a-ajeno')).rejects.toThrow(ForbiddenException);
    });

    it('una franja ajena también se rechaza', async () => {
      (asesorRepo as any).manager = { query: jest.fn().mockResolvedValue([]) };
      await expect(service.verificarAccesoFranja({ id: 'u1', rol: 'asesor' }, 'f1')).rejects.toThrow(ForbiddenException);
    });
  });
});
