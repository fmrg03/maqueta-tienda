import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuenteTasa, TasaCambio } from './entities/tasa-cambio.entity';

export interface TasaVigente {
  valor: number;
  fuente: FuenteTasa;
  /** Cuándo la fuente actualizó el valor (o cuándo se fijó a mano). */
  fecha: string;
  /** true si no se pudo confirmar contra la fuente en más de 24 h. */
  desactualizada: boolean;
}

const HORA = 3_600_000;

/**
 * Tasa oficial BCV (Bs por USD).
 *
 * - Fuente configurable: TASA_BCV_URL (por defecto DolarAPI Venezuela, que
 *   responde `{ promedio, fechaActualizacion }`).
 * - Se refresca de forma perezosa (al consultarla, como máximo cada
 *   TASA_BCV_TTL_MIN minutos, 60 por defecto) y se guarda solo cuando el
 *   valor CAMBIA: la tabla es el historial que necesita contabilidad.
 * - Si la fuente falla se sigue usando la última tasa guardada.
 * - Un valor manual (admin) manda durante 24 h; luego vuelve la fuente.
 */
@Injectable()
export class TasasService {
  private readonly logger = new Logger(TasasService.name);
  private refrescando: Promise<void> | null = null;

  constructor(
    @InjectRepository(TasaCambio) private readonly repo: Repository<TasaCambio>,
    private readonly config: ConfigService,
  ) {}

  private get url(): string {
    return this.config.get<string>('TASA_BCV_URL') || 'https://ve.dolarapi.com/v1/dolares/oficial';
  }

  private get ttlMs(): number {
    const min = Number(this.config.get('TASA_BCV_TTL_MIN') ?? 60);
    return (Number.isFinite(min) && min > 0 ? min : 60) * 60_000;
  }

  private async ultima(): Promise<TasaCambio | null> {
    return this.repo.findOne({ where: {}, order: { createdAt: 'DESC' } });
  }

  private aVigente(t: TasaCambio): TasaVigente {
    return {
      valor: Number(t.valor),
      fuente: t.fuente,
      fecha: (t.fechaFuente ?? t.createdAt).toISOString(),
      desactualizada: Date.now() - new Date(t.verificadaAt).getTime() > 24 * HORA,
    };
  }

  /** Tasa a usar ahora; null si nunca se ha podido obtener ninguna. */
  async vigente(): Promise<TasaVigente | null> {
    let ultima = await this.ultima();
    if (this.requiereRefresco(ultima)) {
      await this.refrescar();
      ultima = await this.ultima();
    }
    return ultima ? this.aVigente(ultima) : null;
  }

  private requiereRefresco(ultima: TasaCambio | null): boolean {
    if (!ultima) return true;
    const edad = Date.now() - new Date(ultima.verificadaAt).getTime();
    if (ultima.fuente === 'manual') return edad > 24 * HORA;
    return edad > this.ttlMs;
  }

  /** Consulta la fuente y guarda si cambió. Nunca lanza. */
  async refrescar(): Promise<void> {
    if (!this.refrescando) {
      this.refrescando = this.consultarYGuardar().finally(() => {
        this.refrescando = null;
      });
    }
    return this.refrescando;
  }

  private async consultarYGuardar(): Promise<void> {
    try {
      const r = await fetch(this.url, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { promedio?: unknown; venta?: unknown; fechaActualizacion?: string };
      const valor = Number(data.promedio ?? data.venta);
      if (!Number.isFinite(valor) || valor <= 0) throw new Error('respuesta sin tasa válida');

      const fechaFuente = data.fechaActualizacion ? new Date(data.fechaActualizacion) : null;
      const ultima = await this.ultima();
      if (ultima && ultima.fuente === 'bcv' && Math.abs(Number(ultima.valor) - valor) < 0.00005) {
        await this.repo.update({ id: ultima.id }, { verificadaAt: new Date() });
        return;
      }
      await this.repo.save(
        this.repo.create({
          fuente: 'bcv',
          valor,
          fechaFuente: fechaFuente && !Number.isNaN(fechaFuente.getTime()) ? fechaFuente : null,
        }),
      );
      this.logger.log(`Tasa BCV actualizada: ${valor}`);
    } catch (error) {
      this.logger.warn(`No se pudo consultar la tasa BCV (${this.url}): ${String(error)}`);
    }
  }

  async fijarManual(valor: number, usuarioId?: string): Promise<TasaVigente> {
    const t = await this.repo.save(this.repo.create({ fuente: 'manual', valor, usuarioId: usuarioId ?? null }));
    return this.aVigente(t);
  }

  async historial(limite = 30): Promise<TasaCambio[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: limite });
  }
}
