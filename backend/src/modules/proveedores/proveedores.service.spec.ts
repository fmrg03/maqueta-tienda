import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProveedoresService } from './proveedores.service';
import { Proveedor } from './entities/proveedor.entity';

type MockRepository = Partial<Record<keyof Repository<Proveedor>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('ProveedoresService', () => {
  let service: ProveedoresService;
  let repository: MockRepository;

  const proveedorBase: Proveedor = {
    id: 'uuid-prov-1',
    nombre: 'Cementos del Centro',
    contacto: '0212-1234567',
    condicionesPago: '30 días',
    activo: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresService,
        {
          provide: getRepositoryToken(Proveedor),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ProveedoresService>(ProveedoresService);
    repository = module.get(getRepositoryToken(Proveedor));
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crea y persiste un proveedor', async () => {
      repository.create!.mockReturnValue(proveedorBase);
      repository.save!.mockResolvedValue(proveedorBase);

      const resultado = await service.create({ nombre: 'Cementos del Centro' });

      expect(repository.create).toHaveBeenCalledWith({
        nombre: 'Cementos del Centro',
      });
      expect(resultado).toEqual(proveedorBase);
    });
  });

  describe('findAll', () => {
    it('retorna solo proveedores activos', async () => {
      repository.find!.mockResolvedValue([proveedorBase]);

      const resultado = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: { activo: true },
      });
      expect(resultado).toEqual([proveedorBase]);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si no existe', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('desactivar', () => {
    it('marca activo = false', async () => {
      repository.findOne!.mockResolvedValue({ ...proveedorBase });
      repository.save!.mockImplementation((p) => Promise.resolve(p));

      await service.desactivar('uuid-prov-1');

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ activo: false }),
      );
    });
  });
});
