import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Costo de mano de obra por pedido (lo pagado a trabajadores) y si el descuento
 * por divisas incluyó los servicios. Así los servicios se reportan aparte de la
 * ganancia de productos: ingreso, pago a trabajadores y resultado.
 */
export class CostoServicios1789100000000 implements MigrationInterface {
  name = 'CostoServicios1789100000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "solicitudes_carrito" ADD "costoServicios" numeric(12,2)`);
    await q.query(`ALTER TABLE "solicitudes_carrito" ADD CONSTRAINT "CHK_carrito_costo_servicios" CHECK ("costoServicios" IS NULL OR "costoServicios" >= 0)`);
    await q.query(`ALTER TABLE "solicitudes_carrito" ADD "descuentoIncluyeServicios" boolean`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "solicitudes_carrito" DROP COLUMN "descuentoIncluyeServicios"`);
    await q.query(`ALTER TABLE "solicitudes_carrito" DROP CONSTRAINT "CHK_carrito_costo_servicios"`);
    await q.query(`ALTER TABLE "solicitudes_carrito" DROP COLUMN "costoServicios"`);
  }
}
