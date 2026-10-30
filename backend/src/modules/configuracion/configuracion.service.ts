import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './entities/configuracion.entity';
import { METODOS_DESCUENTO_POR_DEFECTO, MetodoPago } from '../carrito/entities/solicitud-carrito.entity';

export const CLAVE_DESCUENTO_DIVISAS = 'descuento_divisas_pct';
export const CLAVE_DESCUENTO_METODOS = 'descuento_metodos';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion) private readonly repo: Repository<Configuracion>,
    private readonly config: ConfigService,
  ) {}

  /**
   * % de descuento global (aplica a los métodos de pago que elija el admin).
   * Si el admin nunca lo fijó, vale DESCUENTO_DIVISAS_PCT del entorno (solo
   * como valor inicial) y, sin eso, 0.
   */
  async descuentoDivisasPct(): Promise<number> {
    const fila = await this.repo.findOne({ where: { clave: CLAVE_DESCUENTO_DIVISAS } });
    if (fila) return Number(fila.valor);
    const inicial = Number(this.config.get('DESCUENTO_DIVISAS_PCT') ?? 0);
    return Number.isFinite(inicial) && inicial >= 0 && inicial <= 100 ? inicial : 0;
  }

  /**
   * Métodos de pago a los que aplica el descuento global. Sin elección del
   * admin valen los de siempre (efectivo en divisas y Zelle). Una lista vacía
   * guardada significa "no aplica a ninguno".
   */
  async descuentoMetodos(): Promise<MetodoPago[]> {
    const fila = await this.repo.findOne({ where: { clave: CLAVE_DESCUENTO_METODOS } });
    if (fila && Array.isArray(fila.valor)) {
      const validos = Object.values(MetodoPago) as string[];
      return (fila.valor as string[]).filter((m) => validos.includes(m)) as MetodoPago[];
    }
    return [...METODOS_DESCUENTO_POR_DEFECTO];
  }

  async fijarDescuentoMetodos(metodos: MetodoPago[], usuarioId?: string): Promise<MetodoPago[]> {
    const unicos = [...new Set(metodos)];
    await this.repo.save({ clave: CLAVE_DESCUENTO_METODOS, valor: unicos as any, usuarioId: usuarioId ?? null });
    return unicos;
  }

  async fijarDescuentoDivisas(porcentaje: number, usuarioId?: string): Promise<number> {
    await this.repo.save({ clave: CLAVE_DESCUENTO_DIVISAS, valor: porcentaje, usuarioId: usuarioId ?? null });
    return porcentaje;
  }
}
