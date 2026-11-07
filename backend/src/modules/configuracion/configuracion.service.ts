import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './entities/configuracion.entity';

export const CLAVE_RESERVA_DIAS = 'reserva_dias';
export const RESERVA_DIAS_POR_DEFECTO = 7;

@Injectable()
export class ConfiguracionService {
  constructor(@InjectRepository(Configuracion) private readonly repo: Repository<Configuracion>) {}

  /** Días que dura una reserva (desde el primer abono) antes de avisar que venció. */
  async reservaDias(): Promise<number> {
    const fila = await this.repo.findOne({ where: { clave: CLAVE_RESERVA_DIAS } });
    const n = fila ? Number(fila.valor) : RESERVA_DIAS_POR_DEFECTO;
    return Number.isInteger(n) && n > 0 ? n : RESERVA_DIAS_POR_DEFECTO;
  }

  async fijarReservaDias(dias: number, usuarioId?: string): Promise<number> {
    await this.repo.save({ clave: CLAVE_RESERVA_DIAS, valor: dias, usuarioId: usuarioId ?? null });
    return dias;
  }
}
