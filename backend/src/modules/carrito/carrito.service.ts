import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SolicitudCarrito,
  ItemSolicitudCarrito,
} from './entities/solicitud-carrito.entity';
import { Material } from '../inventario/entities/material.entity';
import { VarianteMaterial } from '../inventario/entities/variante-material.entity';
import { Combo } from '../inventario/entities/combo.entity';
import { CreateSolicitudCarritoDto } from './dto/create-solicitud-carrito.dto';
import { ActualizarEstadoCarritoDto } from './dto/actualizar-estado-carrito.dto';
import { NotificacionesService } from '../../common/notificaciones/notificaciones.service';

@Injectable()
export class CarritoService {
  constructor(
    @InjectRepository(SolicitudCarrito)
    private readonly solicitudRepository: Repository<SolicitudCarrito>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(VarianteMaterial)
    private readonly varianteRepository: Repository<VarianteMaterial>,
    @InjectRepository(Combo)
    private readonly comboRepository: Repository<Combo>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async crearSolicitud(dto: CreateSolicitudCarritoDto): Promise<SolicitudCarrito> {
    const items: ItemSolicitudCarrito[] = [];

    for (const itemDto of dto.items) {
      const referencias = [
        itemDto.materialId,
        itemDto.varianteId,
        itemDto.comboId,
      ].filter(Boolean);

      if (referencias.length !== 1) {
        throw new BadRequestException(
          'Cada item del carrito debe referenciar exactamente uno de: materialId, varianteId o comboId',
        );
      }

      const item = new ItemSolicitudCarrito();
      item.cantidad = itemDto.cantidad;

      if (itemDto.materialId) {
        item.material = await this.buscarOFallar(
          this.materialRepository,
          itemDto.materialId,
          'Material',
        );
      } else if (itemDto.varianteId) {
        item.variante = await this.buscarOFallar(
          this.varianteRepository,
          itemDto.varianteId,
          'Variante',
        );
      } else if (itemDto.comboId) {
        item.combo = await this.buscarOFallar(
          this.comboRepository,
          itemDto.comboId,
          'Combo',
        );
      }

      items.push(item);
    }

    const solicitud = this.solicitudRepository.create({
      clienteNombre: dto.clienteNombre,
      clienteTelefono: dto.clienteTelefono,
      clienteEmail: dto.clienteEmail,
      canalEnvio: dto.canalEnvio,
      items,
    });

    const guardada = await this.solicitudRepository.save(solicitud);
    await this.notificacionesService.notificarNuevaSolicitudCarrito(guardada.id);

    return guardada;
  }

  async findAll(estado?: string): Promise<SolicitudCarrito[]> {
    return this.solicitudRepository.find({
      where: estado ? ({ estado } as any) : {},
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SolicitudCarrito> {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud de carrito ${id} no encontrada`);
    }
    return solicitud;
  }

  async actualizarEstado(
    id: string,
    dto: ActualizarEstadoCarritoDto,
  ): Promise<SolicitudCarrito> {
    const solicitud = await this.findOne(id);
    solicitud.estado = dto.estado;
    if (dto.notas) {
      solicitud.notas = dto.notas;
    }
    return this.solicitudRepository.save(solicitud);
  }

  private async buscarOFallar<T extends { id: string }>(
    repo: Repository<T>,
    id: string,
    nombreEntidad: string,
  ): Promise<T> {
    const entidad = await repo.findOne({ where: { id } as any });
    if (!entidad) {
      throw new NotFoundException(`${nombreEntidad} ${id} no encontrado`);
    }
    return entidad;
  }
}
