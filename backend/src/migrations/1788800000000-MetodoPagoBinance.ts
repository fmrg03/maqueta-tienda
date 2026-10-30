import { MigrationInterface, QueryRunner } from 'typeorm';

/** Agrega Binance como método de pago al cerrar ventas. */
export class MetodoPagoBinance1788800000000 implements MigrationInterface {
  name = 'MetodoPagoBinance1788800000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "solicitudes_carrito_metodopago_enum" ADD VALUE IF NOT EXISTS 'binance'`);
  }

  public async down(): Promise<void> {
    // Un valor de enum no se puede quitar sin recrear el tipo; se deja.
  }
}
