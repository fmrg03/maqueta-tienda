import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AsesoriasService } from './asesorias.service';
import {
  Asesor,
  DisponibilidadAsesor,
  EstadoSolicitudAsesoria,
  SolicitudAsesoria,
} from './entities/asesoria.entity';
import { NotificacionesService } from '../../common/notificaciones/notificaciones.service';

const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
});

describe('AsesoriasService', () => {
  let service: AsesoriasService;
  let solicitudRepo: ReturnType<typeof createMockRepository>;
  let dataSource: { transaction: jest.Mock };
  let notificaciones: { notificarNuevaSolicitudAsesoria: jest.Mock };

  const dtoBase = {
    clienteNombre: 'Carlos Ruiz',
    clienteTelefono: '+584121234567',
    asesorId: 'asesor-1',
    fechaHoraLlamada: '2026-09-15T14:00:00Z',
  };

  beforeEach(async () => {
    dataSource = { transaction: jest.fn() };
    notificaciones = { notificarNuevaSolicitudAsesoria: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsesoriasService,
        { provide: getRepositoryToken(SolicitudAsesoria), useValue: createMockRepository() },
        { provide: getRepositoryToken(Asesor), useValue: createMockRepository() },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificacionesService, useValue: notificaciones },
      ],
    }).compile();

    service = module.get<AsesoriasService>(AsesoriasService);
    solicitudRepo = module.get(getRepositoryToken(SolicitudAsesoria));
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('crearSolicitud', () => {
    // Simula dataSource.transaction ejecutando el callback con un manager
    // falso, igual patrón que usamos en inventario.service.spec.ts.
    const mockManager = (
      asesorEncontrado: any,
      franjaEncontrada: Partial<DisponibilidadAsesor> | null,
    ) => {
      const franjaQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(franjaEncontrada),
      };

      const asesorManagerRepo = {
        findOne: jest.fn().mockResolvedValue(asesorEncontrado),
      };
      const franjaManagerRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(franjaQueryBuilder),
        save: jest.fn().mockImplementation((f) => Promise.resolve(f)),
      };
      const solicitudManagerRepo = {
        create: jest.fn().mockImplementation((data) => data),
        save: jest.fn().mockImplementation((s) => Promise.resolve({ id: 'sol-1', ...s })),
      };

      return {
        getRepository: jest.fn((entity) => {
          if (entity === Asesor) return asesorManagerRepo;
          if (entity === DisponibilidadAsesor) return franjaManagerRepo;
          if (entity === SolicitudAsesoria) return solicitudManagerRepo;
          return {};
        }),
        query: jest.fn().mockResolvedValue(undefined),
        franjaManagerRepo,
        solicitudManagerRepo,
      };
    };

    it('reserva la franja, crea la solicitud y notifica', async () => {
      const manager = mockManager(
        { id: 'asesor-1' },
        { id: 'disp-1', disponible: true },
      );
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const resultado = await service.crearSolicitud(dtoBase as any);

      expect(manager.franjaManagerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ disponible: false }),
      );
      expect(resultado.id).toBe('sol-1');
      expect(notificaciones.notificarNuevaSolicitudAsesoria).toHaveBeenCalledWith(
        'sol-1',
      );
    });

    it('lanza NotFoundException si el asesor no existe', async () => {
      const manager = mockManager(null, null);
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(service.crearSolicitud(dtoBase as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza NotFoundException si la franja no existe', async () => {
      const manager = mockManager({ id: 'asesor-1' }, null);
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(service.crearSolicitud(dtoBase as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ConflictException si la franja ya fue reservada (doble booking)', async () => {
      const manager = mockManager(
        { id: 'asesor-1' },
        { id: 'disp-1', disponible: false },
      );
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(service.crearSolicitud(dtoBase as any)).rejects.toThrow(
        ConflictException,
      );
      expect(manager.franjaManagerRepo.save).not.toHaveBeenCalled();
    });

    it('usa lock pesimista al leer la franja dentro de la transacción', async () => {
      const manager = mockManager(
        { id: 'asesor-1' },
        { id: 'disp-1', disponible: true },
      );
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await service.crearSolicitud(dtoBase as any);

      const queryBuilder = manager.franjaManagerRepo.createQueryBuilder();
      expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('setea app.rol=service_auth antes de insertar (necesario para el RETURNING con RLS)', async () => {
      const manager = mockManager(
        { id: 'asesor-1' },
        { id: 'disp-1', disponible: true },
      );
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await service.crearSolicitud(dtoBase as any);

      expect(manager.query).toHaveBeenCalledWith(
        `SELECT set_config('app.rol', 'service_auth', true)`,
      );
    });
  });

  describe('transiciones de estado', () => {
    it('registrarLlamada solo permite avanzar desde PENDIENTE', async () => {
      solicitudRepo.findOne.mockResolvedValue({
        id: 'sol-1',
        estado: EstadoSolicitudAsesoria.VISITA_PACTADA,
      });

      await expect(
        service.registrarLlamada('sol-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('registrarLlamada avanza el estado y guarda notas', async () => {
      solicitudRepo.findOne.mockResolvedValue({
        id: 'sol-1',
        estado: EstadoSolicitudAsesoria.PENDIENTE,
      });
      solicitudRepo.save.mockImplementation((s) => Promise.resolve(s));

      const resultado = await service.registrarLlamada('sol-1', {
        notasLlamada: 'Cliente interesado en remodelación de cocina',
      });

      expect(resultado.estado).toBe(EstadoSolicitudAsesoria.LLAMADA_REALIZADA);
      expect(resultado.notasLlamada).toBe(
        'Cliente interesado en remodelación de cocina',
      );
    });

    it('marcarVisitaPactada solo permite avanzar desde LLAMADA_REALIZADA', async () => {
      solicitudRepo.findOne.mockResolvedValue({
        id: 'sol-1',
        estado: EstadoSolicitudAsesoria.PENDIENTE,
      });

      await expect(service.marcarVisitaPactada('sol-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancelar funciona sin importar el estado actual', async () => {
      solicitudRepo.findOne.mockResolvedValue({
        id: 'sol-1',
        estado: EstadoSolicitudAsesoria.PENDIENTE,
      });
      solicitudRepo.save.mockImplementation((s) => Promise.resolve(s));

      const resultado = await service.cancelar('sol-1');

      expect(resultado.estado).toBe(EstadoSolicitudAsesoria.CANCELADA);
    });
  });
});
