import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MaterialesService } from './materiales.service';
import { Material } from './entities/material.entity';
import { Categoria } from './entities/categoria.entity';

type MockRepository<T extends object = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = (): MockRepository => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('MaterialesService', () => {
  let service: MaterialesService;
  let materialRepo: MockRepository;
  let categoriaRepo: MockRepository;

  const materialBase: Material = {
    id: 'uuid-mat-1',
    sku: 'CEM-001',
    nombre: 'Cemento Portland',
    descripcion: 'Bolsa 25kg',
    precioCosto: 5,
    precioVenta: 8,
    imagenUrl: undefined,
    activo: true,
    variantes: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
  } as Material;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialesService,
        { provide: getRepositoryToken(Material), useValue: createMockRepository() },
        { provide: getRepositoryToken(Categoria), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<MaterialesService>(MaterialesService);
    materialRepo = module.get(getRepositoryToken(Material));
    categoriaRepo = module.get(getRepositoryToken(Categoria));
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      sku: 'CEM-001',
      nombre: 'Cemento Portland',
      precioCosto: 5,
      precioVenta: 8,
    };

    it('crea un material cuando el SKU no existe', async () => {
      materialRepo.findOne!.mockResolvedValue(null);
      materialRepo.create!.mockReturnValue({ ...materialBase });
      materialRepo.save!.mockResolvedValue(materialBase);

      const resultado = await service.create(dto);

      expect(materialRepo.findOne).toHaveBeenCalledWith({
        where: { sku: dto.sku },
      });
      expect(resultado).toEqual(materialBase);
    });

    it('lanza ConflictException si el SKU ya existe', async () => {
      materialRepo.findOne!.mockResolvedValue(materialBase);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('asocia categoría cuando se provee categoriaId', async () => {
      materialRepo.findOne!.mockResolvedValue(null);
      materialRepo.create!.mockReturnValue({ ...materialBase });
      materialRepo.save!.mockImplementation((m) => Promise.resolve(m));
      categoriaRepo.findOne!.mockResolvedValue({ id: 'cat-1', nombre: 'Cemento' });

      const resultado = await service.create({ ...dto, categoriaId: 'cat-1' });

      expect(categoriaRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
      expect(resultado.categoria).toEqual({ id: 'cat-1', nombre: 'Cemento' });
    });

    it('lanza NotFoundException si la categoría no existe', async () => {
      materialRepo.findOne!.mockResolvedValue(null);
      materialRepo.create!.mockReturnValue({ ...materialBase });
      categoriaRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.create({ ...dto, categoriaId: 'cat-inexistente' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si no existe', async () => {
      materialRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
