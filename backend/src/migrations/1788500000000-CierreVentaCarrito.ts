import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Flujo de venta del carrito: edición del pedido por el asesor, cierre con
 * pago verificado (descuenta stock + registra el ingreso), pendiente por
 * stock, cancelación/anulación e historial.
 *
 * - Precios congelados en el movimiento de inventario (reporte confiable).
 * - Items con precio pactado editable.
 */
export class CierreVentaCarrito1788500000000 implements MigrationInterface {
  name = 'CierreVentaCarrito1788500000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "solicitudes_carrito_estado_enum" ADD VALUE IF NOT EXISTS 'pago_en_verificacion'`);
    await q.query(`ALTER TYPE "solicitudes_carrito_estado_enum" ADD VALUE IF NOT EXISTS 'pendiente_stock'`);
    await q.query(`ALTER TYPE "solicitudes_carrito_estado_enum" ADD VALUE IF NOT EXISTS 'cancelada'`);

    await q.query(`CREATE TYPE "solicitudes_carrito_metodopago_enum" AS ENUM ('efectivo','pago_movil','transferencia','zelle','otro')`);
    await q.query(`
      ALTER TABLE "solicitudes_carrito"
        ADD COLUMN "totalFinal" numeric(12,2),
        ADD COLUMN "modificadaDesdeEnvio" boolean NOT NULL DEFAULT false,
        ADD COLUMN "metodoPago" "solicitudes_carrito_metodopago_enum",
        ADD COLUMN "referenciaPago" varchar(100),
        ADD COLUMN "montoCobrado" numeric(12,2),
        ADD COLUMN "montoReembolsado" numeric(12,2),
        ADD COLUMN "motivoCancelacion" varchar(300),
        ADD COLUMN "faltantes" jsonb,
        ADD COLUMN "cerradaAt" timestamptz
    `);

    await q.query(`ALTER TABLE "items_solicitud_carrito" ADD COLUMN "precioUnitario" numeric(12,2)`);
    await q.query(`
      UPDATE "items_solicitud_carrito" i
      SET "precioUnitario" = COALESCE(
        (SELECT v."precioVenta" FROM "variantes_material" v WHERE v.id = i."varianteId"),
        (SELECT c."precioCombo" FROM "combos" c WHERE c.id = i."comboId")
      )
    `);

    await q.query(`
      ALTER TABLE "movimientos_inventario"
        ADD COLUMN "precioVentaUnitario" numeric(14,4),
        ADD COLUMN "precioCostoUnitario" numeric(14,4),
        ADD COLUMN "solicitudId" uuid REFERENCES "solicitudes_carrito"(id) ON DELETE SET NULL
    `);
    await q.query(`CREATE INDEX "IDX_movimientos_solicitud" ON "movimientos_inventario" ("solicitudId")`);

    await q.query(`
      CREATE TABLE "eventos_solicitud_carrito" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "solicitudId" uuid NOT NULL REFERENCES "solicitudes_carrito"(id) ON DELETE CASCADE,
        "usuarioId" uuid REFERENCES "usuarios"(id) ON DELETE SET NULL,
        "tipo" varchar(40) NOT NULL,
        "detalle" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "IDX_eventos_carrito_solicitud" ON "eventos_solicitud_carrito" ("solicitudId")`);
    await q.query(`ALTER TABLE "eventos_solicitud_carrito" ENABLE ROW LEVEL SECURITY`);
    await q.query(`ALTER TABLE "eventos_solicitud_carrito" FORCE ROW LEVEL SECURITY`);
    await q.query(`
      CREATE POLICY eventos_carrito_ventas_admin ON "eventos_solicitud_carrito"
      FOR ALL
      USING (current_setting('app.rol', true) IN ('admin', 'ventas'))
      WITH CHECK (current_setting('app.rol', true) IN ('admin', 'ventas'))
    `);
    await q.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "eventos_solicitud_carrito" TO app_backend`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "eventos_solicitud_carrito"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_movimientos_solicitud"`);
    await q.query(`
      ALTER TABLE "movimientos_inventario"
        DROP COLUMN "solicitudId", DROP COLUMN "precioCostoUnitario", DROP COLUMN "precioVentaUnitario"
    `);
    await q.query(`ALTER TABLE "items_solicitud_carrito" DROP COLUMN "precioUnitario"`);
    await q.query(`
      ALTER TABLE "solicitudes_carrito"
        DROP COLUMN "cerradaAt", DROP COLUMN "faltantes", DROP COLUMN "motivoCancelacion",
        DROP COLUMN "montoReembolsado", DROP COLUMN "montoCobrado", DROP COLUMN "referenciaPago",
        DROP COLUMN "metodoPago", DROP COLUMN "modificadaDesdeEnvio", DROP COLUMN "totalFinal"
    `);
    await q.query(`DROP TYPE "solicitudes_carrito_metodopago_enum"`);
    // Los valores añadidos al enum de estado no se pueden quitar en Postgres sin recrearlo.
  }
}
