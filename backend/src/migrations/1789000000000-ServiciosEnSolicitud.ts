import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Servicios (mano de obra) dentro de la solicitud de carrito, para poder
 * cobrarlos y contarlos como ingreso. No tocan el inventario: viven en su
 * propia tabla. `montoServicios` es la parte de lo cobrado que corresponde a
 * servicios, congelada al cerrar la venta (el resto es de productos).
 */
export class ServiciosEnSolicitud1789000000000 implements MigrationInterface {
  name = 'ServiciosEnSolicitud1789000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "servicios_solicitud" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "solicitudId" uuid NOT NULL,
        "servicioId" uuid,
        "descripcion" character varying(300) NOT NULL,
        "unidad" character varying(30) NOT NULL DEFAULT 'unidad',
        "cantidad" numeric(12,2) NOT NULL,
        "precioUnitario" numeric(12,2) NOT NULL,
        "orden" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_servicios_solicitud" PRIMARY KEY ("id"),
        CONSTRAINT "FK_servicios_solicitud_solicitud" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_carrito"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_servicios_solicitud_servicio" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_servicios_solicitud_cantidad" CHECK ("cantidad" > 0),
        CONSTRAINT "CHK_servicios_solicitud_precio" CHECK ("precioUnitario" >= 0)
      )
    `);
    await q.query(`CREATE INDEX "IDX_servicios_solicitud_solicitud" ON "servicios_solicitud" ("solicitudId", "orden")`);
    await q.query(`ALTER TABLE "solicitudes_carrito" ADD "montoServicios" numeric(12,2)`);
    await q.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "servicios_solicitud" TO app_backend`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "solicitudes_carrito" DROP COLUMN "montoServicios"`);
    await q.query(`DROP TABLE "servicios_solicitud"`);
  }
}
