import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { getRlsManager } from '../../common/rls/request-context';
import { Rol } from './entities/rol.entity';
import { ActualizarRolDto, CrearRolDto } from './dto/rol.dto';
import { CLAVES_PERMISOS, expandirPermisos, ROL_ADMIN, ROL_CLIENTE, todosLosPermisos } from './permisos';

const TTL_MS = 30_000;

/**
 * Resuelve los permisos efectivos de un rol (con caché corta, invalidada al
 * editar roles) y administra los roles. La gestión de roles la protege el
 * controller con `@Roles('admin')`: no es un permiso delegable.
 */
@Injectable()
export class RolesService {
  private cache = new Map<string, { permisos: string[]; hasta: number }>();

  constructor(
    @InjectRepository(Rol) private readonly repo: Repository<Rol>,
    private readonly dataSource: DataSource,
  ) {}

  /** Permisos efectivos (admin = todos). Rol desconocido o cliente = ninguno. */
  async permisosDeRol(clave: string | undefined): Promise<string[]> {
    if (!clave) return [];
    if (clave === ROL_ADMIN) return todosLosPermisos();
    const hit = this.cache.get(clave);
    if (hit && hit.hasta > Date.now()) return hit.permisos;
    const rol = await this.repo.findOne({ where: { clave } });
    const permisos = rol ? expandirPermisos(rol.permisos) : [];
    this.cache.set(clave, { permisos, hasta: Date.now() + TTL_MS });
    return permisos;
  }

  /** `usuarios` tiene RLS: hay que consultar dentro de la transacción del request (admin). */
  private consultar(sql: string, params: unknown[] = []) {
    return (getRlsManager() ?? this.dataSource.manager).query(sql, params);
  }

  async resumenDeRol(clave: string) {
    const rol = await this.repo.findOne({ where: { clave } });
    return { rolNombre: rol?.nombre ?? clave, permisos: await this.permisosDeRol(clave) };
  }

  async listar() {
    const roles = await this.repo.find({ order: { sistema: 'DESC', nombre: 'ASC' } });
    const conteos: { rol: string; n: string }[] = await this.consultar(
      `SELECT rol, COUNT(*)::text AS n FROM usuarios GROUP BY rol`,
    );
    const mapa = new Map(conteos.map((c) => [c.rol, Number(c.n)]));
    return roles
      .filter((r) => r.clave !== ROL_CLIENTE)
      .map((r) => ({
        ...r,
        permisos: r.clave === ROL_ADMIN ? todosLosPermisos() : r.permisos,
        usuarios: mapa.get(r.clave) ?? 0,
      }));
  }

  /** Claves de roles asignables a usuarios del panel. */
  async clavesAsignables(): Promise<string[]> {
    return (await this.repo.find()).map((r) => r.clave).filter((c) => c !== ROL_CLIENTE);
  }

  private validarPermisos(permisos: string[]): string[] {
    const invalidos = permisos.filter((p) => !CLAVES_PERMISOS.has(p));
    if (invalidos.length) throw new BadRequestException(`Permisos desconocidos: ${invalidos.join(', ')}`);
    return [...new Set(permisos)].sort();
  }

  async crear(dto: CrearRolDto) {
    if ([ROL_ADMIN, ROL_CLIENTE].includes(dto.clave)) {
      throw new ConflictException('Esa clave está reservada');
    }
    if (await this.repo.findOne({ where: { clave: dto.clave } })) {
      throw new ConflictException('Ya existe un rol con esa clave');
    }
    const rol = await this.repo.save(
      this.repo.create({
        clave: dto.clave,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        permisos: this.validarPermisos(dto.permisos),
        sistema: false,
      }),
    );
    return rol;
  }

  async actualizar(id: string, dto: ActualizarRolDto) {
    const rol = await this.repo.findOne({ where: { id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.clave === ROL_ADMIN || rol.clave === ROL_CLIENTE) {
      throw new BadRequestException('Este rol no se puede modificar');
    }
    if (dto.nombre !== undefined) rol.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined) rol.descripcion = dto.descripcion.trim() || null;
    if (dto.permisos !== undefined) rol.permisos = this.validarPermisos(dto.permisos);
    const guardado = await this.repo.save(rol);
    this.cache.delete(rol.clave);
    return guardado;
  }

  async eliminar(id: string) {
    const rol = await this.repo.findOne({ where: { id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.sistema) throw new BadRequestException('Los roles de sistema no se pueden eliminar');
    const [{ n }] = await this.consultar(`SELECT COUNT(*)::int AS n FROM usuarios WHERE rol = $1`, [rol.clave]);
    if (n > 0) throw new ConflictException(`Hay ${n} usuario(s) con este rol; reasígnalos antes de eliminarlo`);
    await this.repo.remove(rol);
    this.cache.delete(rol.clave);
    return { ok: true };
  }

}
