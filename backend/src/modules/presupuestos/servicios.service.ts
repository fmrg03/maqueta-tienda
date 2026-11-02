import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Servicio } from './entities/servicio.entity';
import { CreateServicioDto, UpdateServicioDto } from './dto/servicio.dto';
import { getRlsManager } from '../../common/rls/request-context';

/** Lista interna de servicios con su precio base (demolición, pegado de cerámica…). */
@Injectable()
export class ServiciosService {
  constructor(
    @InjectRepository(Servicio) private readonly repoInyectado: Repository<Servicio>,
    private readonly dataSource: DataSource,
  ) {}

  private get manager(): EntityManager {
    return getRlsManager() ?? this.dataSource.manager;
  }

  private get repo(): Repository<Servicio> {
    return getRlsManager()?.getRepository(Servicio) ?? this.repoInyectado;
  }

  listar(estado: 'activos' | 'inactivos' | 'todos' = 'activos'): Promise<Servicio[]> {
    const where = estado === 'todos' ? {} : { activo: estado === 'activos' };
    return this.repo.find({ where, order: { nombre: 'ASC' } });
  }

  async obtener(id: string): Promise<Servicio> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException(`Servicio ${id} no encontrado`);
    return s;
  }

  crear(dto: CreateServicioDto): Promise<Servicio> {
    return this.repo.save(this.repo.create(dto));
  }

  async actualizar(id: string, dto: UpdateServicioDto): Promise<Servicio> {
    const s = await this.obtener(id);
    Object.assign(s, dto);
    return this.repo.save(s);
  }

  async desactivar(id: string): Promise<void> {
    const s = await this.obtener(id);
    s.activo = false;
    await this.repo.save(s);
  }
}
