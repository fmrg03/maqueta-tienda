import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Módulo de presupuestos (panel): cotizaciones con productos del catálogo,
 * combos y servicios (propios o de una lista guardada).
 * - servicios: lista interna de servicios con precio base (admin la edita).
 * - presupuestos / presupuesto_items: cada línea guarda una copia (descripción,
 *   unidad, precio) para que cambiar el catálogo no altere presupuestos hechos.
 * - RLS: admin, ventas y asesor ven y editan presupuestos; el enlace público
 *   del PDF usa el contexto 'service_auth' (solo lectura, por token).
 */
export class Presupuestos1788900000000 implements MigrationInterface {
  name = 'Presupuestos1788900000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "servicios" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre" varchar(150) NOT NULL,
        "descripcion" varchar(300),
        "unidad" varchar(30) NOT NULL DEFAULT 'unidad',
        "precioBase" numeric(12,2) NOT NULL CHECK ("precioBase" >= 0),
        "activo" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await q.query(`CREATE SEQUENCE IF NOT EXISTS "presupuestos_numero_seq"`);
    await q.query(`
      CREATE TABLE "presupuestos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "numero" integer NOT NULL DEFAULT nextval('presupuestos_numero_seq'),
        "tokenPublico" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clienteNombre" varchar(150) NOT NULL,
        "clienteTelefono" varchar(30),
        "clienteEmail" varchar(150),
        "obra" varchar(200),
        "notas" text,
        "validezDias" integer NOT NULL DEFAULT 15 CHECK ("validezDias" BETWEEN 1 AND 365),
        "descuentoPct" numeric(5,2) NOT NULL DEFAULT 0 CHECK ("descuentoPct" BETWEEN 0 AND 100),
        "estado" varchar(20) NOT NULL DEFAULT 'borrador'
          CHECK ("estado" IN ('borrador','enviado','aprobado','rechazado','convertido')),
        "solicitudId" uuid REFERENCES "solicitudes_carrito"(id) ON DELETE SET NULL,
        "creadoPorId" uuid REFERENCES "usuarios"(id) ON DELETE SET NULL,
        "creadoPorNombre" varchar(150),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(`ALTER SEQUENCE "presupuestos_numero_seq" OWNED BY "presupuestos"."numero"`);
    await q.query(`CREATE UNIQUE INDEX "UQ_presupuestos_numero" ON "presupuestos" ("numero")`);
    await q.query(`CREATE UNIQUE INDEX "UQ_presupuestos_token" ON "presupuestos" ("tokenPublico")`);
    await q.query(`CREATE INDEX "IDX_presupuestos_estado" ON "presupuestos" ("estado", "createdAt" DESC)`);

    await q.query(`
      CREATE TABLE "presupuesto_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "presupuestoId" uuid NOT NULL REFERENCES "presupuestos"(id) ON DELETE CASCADE,
        "orden" integer NOT NULL DEFAULT 0,
        "tipo" varchar(10) NOT NULL CHECK ("tipo" IN ('producto','combo','servicio')),
        "varianteId" uuid REFERENCES "variantes_material"(id) ON DELETE SET NULL,
        "comboId" uuid REFERENCES "combos"(id) ON DELETE SET NULL,
        "servicioId" uuid REFERENCES "servicios"(id) ON DELETE SET NULL,
        "descripcion" varchar(300) NOT NULL,
        "unidad" varchar(30) NOT NULL DEFAULT 'unidad',
        "cantidad" numeric(12,2) NOT NULL CHECK ("cantidad" > 0),
        "precioUnitario" numeric(12,2) NOT NULL CHECK ("precioUnitario" >= 0)
      )
    `);
    await q.query(`CREATE INDEX "IDX_presupuesto_items_presupuesto" ON "presupuesto_items" ("presupuestoId", "orden")`);

    // --- RLS ---
    for (const t of ['presupuestos', 'presupuesto_items', 'servicios']) {
      await q.query(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`);
      await q.query(`ALTER TABLE "${t}" FORCE ROW LEVEL SECURITY`);
    }
    const personal = `current_setting('app.rol', true) IN ('admin', 'ventas', 'asesor')`;
    for (const t of ['presupuestos', 'presupuesto_items']) {
      await q.query(`CREATE POLICY ${t}_personal ON "${t}" FOR ALL USING (${personal}) WITH CHECK (${personal})`);
      await q.query(`CREATE POLICY ${t}_publico_lectura ON "${t}" FOR SELECT USING (current_setting('app.rol', true) = 'service_auth')`);
    }
    await q.query(`CREATE POLICY servicios_lectura_personal ON "servicios" FOR SELECT USING (${personal})`);
    await q.query(`CREATE POLICY servicios_escritura_admin ON "servicios" FOR ALL USING (current_setting('app.rol', true) = 'admin') WITH CHECK (current_setting('app.rol', true) = 'admin')`);

    await q.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "servicios", "presupuestos", "presupuesto_items" TO app_backend`);
    await q.query(`GRANT USAGE, SELECT ON SEQUENCE "presupuestos_numero_seq" TO app_backend`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "presupuesto_items"`);
    await q.query(`DROP TABLE IF EXISTS "presupuestos"`);
    await q.query(`DROP SEQUENCE IF EXISTS "presupuestos_numero_seq"`);
    await q.query(`DROP TABLE IF EXISTS "servicios"`);
  }
}
