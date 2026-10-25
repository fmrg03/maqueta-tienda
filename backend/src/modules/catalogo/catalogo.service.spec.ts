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
    it('filtra por categoría cuando se provee categoriaId', async () => {
      materialRepo.findAndCount.mockResolvedValue([[{ id: '1' }], 1]);

      await service.listarMateriales(1, 20, 'cat-123');

      expect(materialRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { activo: true, categoria: { id: 'cat-123' } },
        }),
      );
    });

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
        items: [{ id: '1', variantes: [] }],
        total: 1,
        pagina: 2,
        porPagina: 10,
      });
    });

    it('NUNCA expone precioCosto de las variantes (dato interno del negocio)', async () => {
      materialRepo.findAndCount.mockResolvedValue([
        [
          {
            id: '1',
            variantes: [
              { id: 'v1', skuVariante: 'A', precioVenta: 8, precioCosto: 5 },
              { id: 'v2', skuVariante: 'B', precioVenta: 15, precioCosto: 9.5 },
            ],
          },
        ],
        1,
      ]);

      const resultado = await service.listarMateriales();

      for (const variante of resultado.items[0].variantes) {
        expect(variante).not.toHaveProperty('precioCosto');
        expect(variante).toHaveProperty('precioVenta');
      }
    });
  });

  describe('obtenerMaterial', () => {
    it('lanza NotFoundException si no existe o no está activo', async () => {
      materialRepo.findOne.mockResolvedValue(null);

      await expect(service.obtenerMaterial('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('NUNCA expone precioCosto en la ficha de un material', async () => {
      materialRepo.findOne.mockResolvedValue({
        id: '1',
        variantes: [{ id: 'v1', precioVenta: 8, precioCosto: 5 }],
      });

      const resultado = await service.obtenerMaterial('1');

      expect(resultado.variantes[0]).not.toHaveProperty('precioCosto');
      expect(resultado.variantes[0].precioVenta).toBe(8);
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

    it('no pide la relación items.material (ya no existe tras mover el precio a la variante)', async () => {
      comboRepo.find.mockResolvedValue([]);

      await service.listarCombos();

      expect(comboRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['items', 'items.variante'] }),
      );
    });

    it('NUNCA expone precioCosto de las variantes dentro de los items del combo', async () => {
      comboRepo.find.mockResolvedValue([
        {
          id: 'c1',
          items: [{ id: 'i1', cantidad: 2, variante: { id: 'v1', precioVenta: 8, precioCosto: 5 } }],
        },
      ]);

      const [combo] = await service.listarCombos();

      expect(combo.items[0].variante).not.toHaveProperty('precioCosto');
      expect(combo.items[0].variante.precioVenta).toBe(8);
    });
  });
});
