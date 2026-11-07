import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Precio interno en divisas (efectivo USD / Zelle / Binance). Es solo para uso
 * del personal: nunca sale en el catálogo público. Las líneas de pedido y de
 * presupuesto guardan una copia (`precioDivisasUnitario`) para poder mostrar al
 * cliente cuánto le saldría en divisas frente al dólar BCV.
 */
export class PrecioDivisas1789200000000 implements MigrationInterface {
  name = 'PrecioDivisas1789200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "variantes_material" ADD "precioDivisas" numeric(12,2)`);
    await q.query(`ALTER TABLE "variantes_material" ADD CONSTRAINT "CHK_variante_precio_divisas" CHECK ("precioDivisas" IS NULL OR "precioDivisas" >= 0)`);
    await q.query(`ALTER TABLE "combos" ADD "precioDivisas" numeric(12,2)`);
    await q.query(`ALTER TABLE "combos" ADD CONSTRAINT "CHK_combo_precio_divisas" CHECK ("precioDivisas" IS NULL OR "precioDivisas" >= 0)`);
    await q.query(`ALTER TABLE "items_solicitud_carrito" ADD "precioDivisasUnitario" numeric(12,2)`);
    await q.query(`ALTER TABLE "presupuesto_items" ADD "precioDivisasUnitario" numeric(12,2)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "presupuesto_items" DROP COLUMN "precioDivisasUnitario"`);
    await q.query(`ALTER TABLE "items_solicitud_carrito" DROP COLUMN "precioDivisasUnitario"`);
    await q.query(`ALTER TABLE "combos" DROP CONSTRAINT "CHK_combo_precio_divisas"`);
    await q.query(`ALTER TABLE "combos" DROP COLUMN "precioDivisas"`);
    await q.query(`ALTER TABLE "variantes_material" DROP CONSTRAINT "CHK_variante_precio_divisas"`);
    await q.query(`ALTER TABLE "variantes_material" DROP COLUMN "precioDivisas"`);
  }
}
