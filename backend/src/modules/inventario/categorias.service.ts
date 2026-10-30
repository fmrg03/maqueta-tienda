import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './entities/categoria.entity';
import { CategoriaDto } from './dto/categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly repo: Repository<Categoria>,
  ) {}

  async crear(dto: CategoriaDto): Promise<Categoria> {
    const nombre = dto.nombre.trim();
    await this.validarNombreLibre(nombre);
    return this.repo.save(this.repo.create({ nombre }));
  }

  async renombrar(id: string, dto: CategoriaDto): Promise<Categoria> {
    const categoria = await this.repo.findOne({ where: { id } });
    if (!categoria) throw new NotFoundException(`Categoría ${id} no encontrada`);
    const nombre = dto.nombre.trim();
    if (nombre.toLowerCase() !== categoria.nombre.toLowerCase()) {
      await this.validarNombreLibre(nombre);
    }
    categoria.nombre = nombre;
    return this.repo.save(categoria);
  }

  // Sin distinguir mayúsculas: "Pinturas" y "pinturas" serían la misma categoría.
  private async validarNombreLibre(nombre: string): Promise<void> {
    const existente = await this.repo
      .createQueryBuilder('c')
      .where('LOWER(c.nombre) = LOWER(:nombre)', { nombre })
      .getOne();
    if (existente) {
      throw new ConflictException(`Ya existe la categoría "${existente.nombre}"`);
    }
  }
}
