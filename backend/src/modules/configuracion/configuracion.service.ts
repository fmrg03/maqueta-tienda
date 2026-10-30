import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './entities/configuracion.entity';

export const CLAVE_DESCUENTO_DIVISAS = 'descuento_divisas_pct';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion) private readonly repo: Repository<Configuracion>,
    private readonly config: ConfigService,
  ) {}

  /**
   * % de descuento por pagar en divisas (efectivo en divisas o Zelle).
   * Si el admin nunca lo fijó, vale DESCUENTO_DIVISAS_PCT del entorno (solo
   * como valor inicial) y, sin eso, 0.
   */
  async descuentoDivisasPct(): Promise<number> {
    const fila = await this.repo.findOne({ where: { clave: CLAVE_DESCUENTO_DIVISAS } });
    if (fila) return Number(fila.valor);
    const inicial = Number(this.config.get('DESCUENTO_DIVISAS_PCT') ?? 0);
    return Number.isFinite(inicial) && inicial >= 0 && inicial <= 100 ? inicial : 0;
  }

  async fijarDescuentoDivisas(porcentaje: number, usuarioId?: string): Promise<number> {
    await this.repo.save({ clave: CLAVE_DESCUENTO_DIVISAS, valor: porcentaje, usuarioId: usuarioId ?? null });
    return porcentaje;
  }
}
