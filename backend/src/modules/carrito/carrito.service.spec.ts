import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CarritoService } from './carrito.service';
import {
  SolicitudCarrito,
  EstadoSolicitudCarrito,
} from './entities/solicitud-carrito.entity';
import { Material } from '../inventario/entities/material.entity';
import { VarianteMaterial } from '../inventario/entities/variante-material.entity';
import { Combo } from '../inventario/entities/combo.entity';
import { NotificacionesService } from '../../common/notificaciones/notificaciones.service';
import { rlsStorage } from '../../common/rls/request-context';

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

describe('CarritoService', () => {
  let service: CarritoService;
  let solicitudRepo: ReturnType<typeof createMockRepository>;
  let materialRepo: ReturnType<typeof createMockRepository>;
  let varianteRepo: ReturnType<typeof createMockRepository>;
  let comboRepo: ReturnType<typeof createMockRepository>;
  let notificaciones: { notificarNuevaSolicitudCarrito: jest.Mock };

  const dtoBase = {
    clienteNombre: 'María Gómez',
    clienteTelefono: '+584121234567',
    items: [{ materialId: 'mat-1', cantidad: 2 }],
  };

  beforeEach(async () => {
    notificaciones = { notificarNuevaSolicitudCarrito: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarritoService,
        { provide: getRepositoryToken(SolicitudCarrito), useValue: createMockRepository() },
        { provide: getRepositoryToken(Material), useValue: createMockRepository() },
        { provide: getRepositoryToken(VarianteMaterial), useValue: createMockRepository() },
        { provide: getRepositoryToken(Combo), useValue: createMockRepository() },
        { provide: NotificacionesService, useValue: notificaciones },
      ],
    }).compile();

    service = module.get<CarritoService>(CarritoService);
    solicitudRepo = module.get(getRepositoryToken(SolicitudCarrito));
    materialRepo = module.get(getRepositoryToken(Material));
    varianteRepo = module.get(getRepositoryToken(VarianteMaterial));
    comboRepo = module.get(getRepositoryToken(Combo));
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('crearSolicitud', () => {
    it('crea la solicitud y dispara la notificación', async () => {
      materialRepo.findOne.mockResolvedValue({ id: 'mat-1' });
      solicitudRepo.create.mockReturnValue({ id: 'sol-1', items: [] });
      solicitudRepo.save.mockResolvedValue({ id: 'sol-1', items: [] });

      const resultado = await service.crearSolicitud(dtoBase as any);

      expect(resultado.id).toBe('sol-1');
      expect(notificaciones.notificarNuevaSolicitudCarrito).toHaveBeenCalledWith(
        'sol-1',
      );
    });

    it('lanza BadRequestException si un item no referencia exactamente una entidad', async () => {
      const dtoInvalido = {
        ...dtoBase,
        items: [{ materialId: 'mat-1', varianteId: 'var-1', cantidad: 1 }],
      };

      await expect(service.crearSolicitud(dtoInvalido as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(solicitudRepo.save).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el material referenciado no existe', async () => {
      materialRepo.findOne.mockResolvedValue(null);

      await expect(service.crearSolicitud(dtoBase as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('acepta items por variante o por combo', async () => {
      varianteRepo.findOne.mockResolvedValue({ id: 'var-1' });
      comboRepo.findOne.mockResolvedValue({ id: 'combo-1' });
      solicitudRepo.create.mockReturnValue({ id: 'sol-2', items: [] });
      solicitudRepo.save.mockResolvedValue({ id: 'sol-2', items: [] });

      const dto = {
        ...dtoBase,
        items: [
          { varianteId: 'var-1', cantidad: 1 },
          { comboId: 'combo-1', cantidad: 1 },
        ],
      };

      const resultado = await service.crearSolicitud(dto as any);

      expect(resultado.id).toBe('sol-2');
    });

    it('setea app.rol=service_auth antes de insertar cuando hay contexto RLS activo (necesario para el RETURNING)', async () => {
      materialRepo.findOne.mockResolvedValue({ id: 'mat-1' });
      solicitudRepo.create.mockReturnValue({ id: 'sol-3', items: [] });
      solicitudRepo.save.mockResolvedValue({ id: 'sol-3', items: [] });

      const managerFalso = {
        query: jest.fn().mockResolvedValue(undefined),
        getRepository: jest.fn().mockReturnValue(solicitudRepo),
      };

      await rlsStorage.run({ manager: managerFalso as any }, () =>
        service.crearSolicitud(dtoBase as any),
      );

      expect(managerFalso.query).toHaveBeenCalledWith(
        `SELECT set_config('app.rol', 'service_auth', true)`,
      );
    });
  });

  describe('actualizarEstado', () => {
    it('actualiza el estado de la solicitud', async () => {
      solicitudRepo.findOne.mockResolvedValue({
        id: 'sol-1',
        estado: EstadoSolicitudCarrito.NUEVA,
      });
      solicitudRepo.save.mockImplementation((s) => Promise.resolve(s));

      const resultado = await service.actualizarEstado('sol-1', {
        estado: EstadoSolicitudCarrito.CONTACTADO,
      });

      expect(resultado.estado).toBe(EstadoSolicitudCarrito.CONTACTADO);
    });

    it('lanza NotFoundException si la solicitud no existe', async () => {
      solicitudRepo.findOne.mockResolvedValue(null);

      await expect(
        service.actualizarEstado('no-existe', {
          estado: EstadoSolicitudCarrito.CERRADA,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
