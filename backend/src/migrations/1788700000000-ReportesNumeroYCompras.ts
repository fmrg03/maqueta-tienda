import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - solicitudes_carrito.numero: número de pedido legible (correlativo), con
 *   las solicitudes existentes numeradas por fecha de creación.
 * - movimientos_inventario.proveedorId: a quién se le compró una entrada
 *   (el costo pagado por unidad se guarda en precioCostoUnitario).
 */
export class ReportesNumeroYCompras1788700000000 implements MigrationInterface {
  name = 'ReportesNumeroYCompras1788700000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SEQUENCE IF NOT EXISTS "solicitudes_carrito_numero_seq"`);
    await q.query(`ALTER TABLE "solicitudes_carrito" ADD COLUMN IF NOT EXISTS "numero" integer`);
    await q.query(`
      UPDATE "solicitudes_carrito" s SET "numero" = t.rn
        FROM (SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS rn FROM "solicitudes_carrito") t
       WHERE s.id = t.id AND s."numero" IS NULL
    `);
    await q.query(`SELECT setval('solicitudes_carrito_numero_seq', COALESCE((SELECT max("numero") FROM "solicitudes_carrito"), 0) + 1, false)`);
    await q.query(`ALTER TABLE "solicitudes_carrito" ALTER COLUMN "numero" SET DEFAULT nextval('solicitudes_carrito_numero_seq')`);
    await q.query(`ALTER TABLE "solicitudes_carrito" ALTER COLUMN "numero" SET NOT NULL`);
    await q.query(`ALTER SEQUENCE "solicitudes_carrito_numero_seq" OWNED BY "solicitudes_carrito"."numero"`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_solicitudes_carrito_numero" ON "solicitudes_carrito" ("numero")`);
    await q.query(`GRANT USAGE, SELECT ON SEQUENCE "solicitudes_carrito_numero_seq" TO app_backend`);

    await q.query(`ALTER TABLE "movimientos_inventario" ADD COLUMN IF NOT EXISTS "proveedorId" uuid REFERENCES "proveedores"(id) ON DELETE SET NULL`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_movimientos_proveedor" ON "movimientos_inventario" ("proveedorId")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_movimientos_proveedor"`);
    await q.query(`ALTER TABLE "movimientos_inventario" DROP COLUMN IF EXISTS "proveedorId"`);
    await q.query(`DROP INDEX IF EXISTS "UQ_solicitudes_carrito_numero"`);
    await q.query(`ALTER TABLE "solicitudes_carrito" DROP COLUMN IF EXISTS "numero"`);
    await q.query(`DROP SEQUENCE IF EXISTS "solicitudes_carrito_numero_seq"`);
  }
}
