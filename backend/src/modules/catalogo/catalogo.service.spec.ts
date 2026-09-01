import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';
import { Material } from '../inventario/entities/material.entity';
import { Combo } from '../inventario/entities/combo.entity';
import { Categoria } from '../inventario/entities/categoria.entity';

const createMockRepository = () => ({
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
});

describe('CatalogoService', () => {
  let service: CatalogoService;
  let materialRepo: ReturnType<typeof createMockRepository>;
  let comboRepo: ReturnType<typeof createMockRepository>;
  let categoriaRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogoService,
        { provide: getRepositoryToken(Material), useValue: createMockRepository() },
        { provide: getRepositoryToken(Combo), useValue: createMockRepository() },
        { provide: getRepositoryToken(Categoria), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<CatalogoService>(CatalogoService);
    materialRepo = module.get(getRepositoryToken(Material));
    comboRepo = module.get(getRepositoryToken(Combo));
    categoriaRepo = module.get(getRepositoryToken(Categoria));
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('listarMateriales', () => {
    it('pagina correctamente y solo trae materiales activos', async () => {
      materialRepo.findAndCount.mockResolvedValue([[{ id: '1' }], 1]);

      const resultado = await service.listarMateriales(2, 10);

      expect(materialRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { activo: true },
          skip: 10,
          take: 10,
        }),
      );
      expect(resultado).toEqual({
        items: [{ id: '1' }],
        total: 1,
        pagina: 2,
        porPagina: 10,
      });
    });
  });

  describe('obtenerMaterial', () => {
    it('lanza NotFoundException si no existe o no está activo', async () => {
      materialRepo.findOne.mockResolvedValue(null);

      await expect(service.obtenerMaterial('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listarCombos', () => {
    it('solo trae combos activos', async () => {
      comboRepo.find.mockResolvedValue([]);

      await service.listarCombos();

      expect(comboRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { activo: true } }),
      );
    });
  });
});
