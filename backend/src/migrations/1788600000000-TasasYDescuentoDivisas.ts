import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - tasas_cambio: historial de la tasa BCV (una fila por cambio de valor).
 * - configuracion: ajustes globales editables desde el panel (clave/valor).
 * - solicitudes_carrito: al cerrar se congelan la tasa usada, el descuento por
 *   divisas aplicado y el monto cobrado en bolívares.
 * - método de pago 'efectivo_divisas' (el 'efectivo' existente pasa a leerse
 *   como efectivo en bolívares).
 */
export class TasasYDescuentoDivisas1788600000000 implements MigrationInterface {
  name = 'TasasYDescuentoDivisas1788600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "solicitudes_carrito_metodopago_enum" ADD VALUE IF NOT EXISTS 'efectivo_divisas'`);

    await q.query(`
      CREATE TABLE "tasas_cambio" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "fuente" varchar(20) NOT NULL,
        "valor" numeric(14,4) NOT NULL CHECK ("valor" > 0),
        "fechaFuente" timestamptz,
        "verificadaAt" timestamptz NOT NULL DEFAULT now(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "usuarioId" uuid REFERENCES "usuarios"(id) ON DELETE SET NULL
      )
    `);
    await q.query(`CREATE INDEX "IDX_tasas_cambio_created" ON "tasas_cambio" ("createdAt" DESC)`);

    await q.query(`
      CREATE TABLE "configuracion" (
        "clave" varchar(60) PRIMARY KEY,
        "valor" jsonb NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "usuarioId" uuid REFERENCES "usuarios"(id) ON DELETE SET NULL
      )
    `);

    await q.query(`
      ALTER TABLE "solicitudes_carrito"
        ADD COLUMN "descuentoPct" numeric(5,2),
        ADD COLUMN "descuentoMonto" numeric(12,2),
        ADD COLUMN "tasaBcv" numeric(14,4),
        ADD COLUMN "montoCobradoBs" numeric(16,2)
    `);

    await q.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "tasas_cambio", "configuracion" TO app_backend`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "solicitudes_carrito"
        DROP COLUMN "montoCobradoBs", DROP COLUMN "tasaBcv",
        DROP COLUMN "descuentoMonto", DROP COLUMN "descuentoPct"
    `);
    await q.query(`DROP TABLE IF EXISTS "configuracion"`);
    await q.query(`DROP TABLE IF EXISTS "tasas_cambio"`);
    // El valor añadido al enum de método de pago no se puede quitar sin recrearlo.
  }
}
