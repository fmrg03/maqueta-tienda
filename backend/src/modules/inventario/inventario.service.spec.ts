import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InventarioService } from './inventario.service';
import { VarianteMaterial } from './entities/variante-material.entity';
import { Material } from './entities/material.entity';
import {
  MovimientoInventario,
  TipoMovimiento,
} from './entities/movimiento-inventario.entity';

type MockRepository = Partial<Record<string, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('InventarioService', () => {
  let service: InventarioService;
  let varianteRepo: MockRepository;
  let materialRepo: MockRepository;
  let movimientoRepo: MockRepository;
  let dataSource: Partial<Record<keyof DataSource, jest.Mock>>;

  const varianteBase: VarianteMaterial = {
    id: 'uuid-var-1',
    material: { id: 'uuid-mat-1' } as Material,
    atributos: { tamano: '25kg' },
    skuVariante: 'CEM-001-25KG',
    stock: 50,
    precioVenta: 8,
    precioCosto: 5,
  };

  beforeEach(async () => {
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventarioService,
        { provide: getRepositoryToken(VarianteMaterial), useValue: createMockRepository() },
        { provide: getRepositoryToken(Material), useValue: createMockRepository() },
        { provide: getRepositoryToken(MovimientoInventario), useValue: createMockRepository() },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<InventarioService>(InventarioService);
    varianteRepo = module.get(getRepositoryToken(VarianteMaterial));
    materialRepo = module.get(getRepositoryToken(Material));
    movimientoRepo = module.get(getRepositoryToken(MovimientoInventario));
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('crearVariante', () => {
    it('crea la variante si el material existe y el SKU está libre', async () => {
      materialRepo.findOne!.mockResolvedValue({ id: 'uuid-mat-1' });
      varianteRepo.findOne!.mockResolvedValue(null);
      varianteRepo.create!.mockReturnValue(varianteBase);
      varianteRepo.save!.mockResolvedValue(varianteBase);

      const spy = jest
        .spyOn(service, 'registrarMovimiento')
        .mockResolvedValue({} as any);

      const resultado = await service.crearVariante(
        'uuid-mat-1',
        { skuVariante: 'CEM-001-25KG', stock: 50, precioVenta: 8, precioCosto: 5 },
        'user-1',
      );

      expect(resultado.id).toBe(varianteBase.id);
      // El stock inicial queda en el kardex como una ENTRADA, no escrito a mano.
      expect(varianteRepo.create).toHaveBeenCalledWith(expect.objectContaining({ stock: 0 }));
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'entrada', cantidad: 50, motivo: 'Stock inicial' }),
        'user-1',
      );
      expect(resultado.stock).toBe(50);
    });

    it('sin stock inicial no registra ningún movimiento', async () => {
      materialRepo.findOne!.mockResolvedValue({ id: 'uuid-mat-1' });
      varianteRepo.findOne!.mockResolvedValue(null);
      varianteRepo.create!.mockReturnValue({ ...varianteBase });
      varianteRepo.save!.mockResolvedValue({ ...varianteBase });
      const spy = jest.spyOn(service, 'registrarMovimiento');

      await service.crearVariante('uuid-mat-1', { skuVariante: 'X-1', precioVenta: 8, precioCosto: 5 });

      expect(spy).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el material no existe', async () => {
      materialRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.crearVariante('no-existe', {
          skuVariante: 'X',
          precioVenta: 8,
          precioCosto: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('actualizarVariante', () => {
    it('lanza NotFoundException si no existe', async () => {
      varianteRepo.findOne!.mockResolvedValue(null);
      await expect(service.actualizarVariante('x', { precioVenta: 9 })).rejects.toThrow(NotFoundException);
    });

    it('rechaza un SKU que ya usa otra variante', async () => {
      varianteRepo.findOne!
        .mockResolvedValueOnce({ id: 'v1', skuVariante: 'A' })
        .mockResolvedValueOnce({ id: 'v2', skuVariante: 'B' });
      await expect(service.actualizarVariante('v1', { skuVariante: 'B' })).rejects.toThrow(ConflictException);
    });

    it('actualiza precios y atributos sin tocar el stock', async () => {
      varianteRepo.findOne!.mockResolvedValue({ id: 'v1', skuVariante: 'A', stock: 7, precioVenta: 1 });
      varianteRepo.save!.mockImplementation((v) => Promise.resolve(v));
      const r = await service.actualizarVariante('v1', { precioVenta: 9.5, atributos: { peso: '25kg' } });
      expect(r).toMatchObject({ precioVenta: 9.5, stock: 7, atributos: { peso: '25kg' } });
    });
  });

  describe('registrarMovimiento', () => {
    // Helper que simula dataSource.transaction ejecutando el callback con
    // un "manager" falso cuyo getRepository siempre devuelve el mock que
    // corresponda según la entidad pedida.
    const mockManager = (varianteEncontrada: VarianteMaterial | null) => {
      const varianteQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(varianteEncontrada),
      };

      const varianteManagerRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(varianteQueryBuilder),
        save: jest.fn().mockImplementation((v) => Promise.resolve(v)),
      };

      const movimientoManagerRepo = {
        create: jest.fn().mockImplementation((data) => data),
        save: jest.fn().mockImplementation((m) => Promise.resolve(m)),
      };

      return {
        getRepository: jest.fn((entity) => {
          if (entity === VarianteMaterial) return varianteManagerRepo;
          if (entity === MovimientoInventario) return movimientoManagerRepo;
          return {};
        }),
        varianteManagerRepo,
        movimientoManagerRepo,
      };
    };

    it('incrementa el stock en una entrada', async () => {
      const manager = mockManager({ ...varianteBase, stock: 50 });
      dataSource.transaction!.mockImplementation((cb: any) => cb(manager));

      await service.registrarMovimiento({
        varianteId: 'uuid-var-1',
        tipo: TipoMovimiento.ENTRADA,
        cantidad: 20,
      });

      expect(manager.varianteManagerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 70 }),
      );
    });

    it('decrementa el stock en una salida con stock suficiente', async () => {
      const manager = mockManager({ ...varianteBase, stock: 50 });
      dataSource.transaction!.mockImplementation((cb: any) => cb(manager));

      await service.registrarMovimiento({
        varianteId: 'uuid-var-1',
        tipo: TipoMovimiento.SALIDA,
        cantidad: 30,
      });

      expect(manager.varianteManagerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 20 }),
      );
    });

    it('lanza BadRequestException si el stock es insuficiente para la salida', async () => {
      const manager = mockManager({ ...varianteBase, stock: 5 });
      dataSource.transaction!.mockImplementation((cb: any) => cb(manager));

      await expect(
        service.registrarMovimiento({
          varianteId: 'uuid-var-1',
          tipo: TipoMovimiento.SALIDA,
          cantidad: 30,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(manager.varianteManagerRepo.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la variante no existe', async () => {
      const manager = mockManager(null);
      dataSource.transaction!.mockImplementation((cb: any) => cb(manager));

      await expect(
        service.registrarMovimiento({
          varianteId: 'no-existe',
          tipo: TipoMovimiento.ENTRADA,
          cantidad: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('usa lock pesimista al leer la variante dentro de la transacción', async () => {
      const manager = mockManager({ ...varianteBase, stock: 50 });
      dataSource.transaction!.mockImplementation((cb: any) => cb(manager));

      await service.registrarMovimiento({
        varianteId: 'uuid-var-1',
        tipo: TipoMovimiento.ENTRADA,
        cantidad: 10,
      });

      const queryBuilder = manager.varianteManagerRepo.createQueryBuilder();
      expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    });
  });

  describe('listarMovimientos', () => {
    it('filtra por variante cuando se provee', async () => {
      movimientoRepo.find!.mockResolvedValue([]);

      await service.listarMovimientos('uuid-var-1');

      expect(movimientoRepo.find).toHaveBeenCalledWith({
        where: { variante: { id: 'uuid-var-1' } },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
