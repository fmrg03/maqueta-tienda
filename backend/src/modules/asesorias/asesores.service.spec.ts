import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AsesoresService } from './asesores.service';
import { Asesor, DisponibilidadAsesor } from './entities/asesoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AsesoresService>(AsesoresService);
    asesorRepo = module.get(getRepositoryToken(Asesor));
    usuarioRepo = module.get(getRepositoryToken(Usuario));
    disponibilidadRepo = module.get(getRepositoryToken(DisponibilidadAsesor));
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('crearAsesor', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);

      await expect(service.crearAsesor('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('crea el asesor si el usuario existe', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 'user-1' });
      asesorRepo.create.mockReturnValue({ id: 'asesor-1' });
      asesorRepo.save.mockResolvedValue({ id: 'asesor-1' });

      const resultado = await service.crearAsesor('user-1', 'Construcción');

      expect(resultado).toEqual({ id: 'asesor-1' });
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
});
