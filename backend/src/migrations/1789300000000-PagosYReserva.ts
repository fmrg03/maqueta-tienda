import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pagos por solicitud (combinados y por abonos) y reserva de mercancía.
 * - `pagos_solicitud`: cada cobro con su método. `monto` es el dinero recibido
 *   (USD) y `abona` cuánto de la deuda cubre (en dólares BCV): pagando en divisas
 *   a precio de divisas, un monto menor cubre la misma deuda.
 * - Estado `reservada`: ya hay abonos, el stock queda apartado (no se descuenta
 *   hasta cobrar todo). `reservaVenceAt` es solo un aviso para el personal.
 */
export class PagosYReserva1789300000000 implements MigrationInterface {
  name = 'PagosYReserva1789300000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "solicitudes_carrito_estado_enum" ADD VALUE IF NOT EXISTS 'reservada'`);
    await q.query(`
      CREATE TABLE "pagos_solicitud" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "solicitudId" uuid NOT NULL,
        "metodo" character varying(30) NOT NULL,
        "monto" numeric(12,2) NOT NULL,
        "abona" numeric(12,2) NOT NULL,
        "tasaBcv" numeric(14,4),
        "montoBs" numeric(16,2),
        "referencia" character varying(100),
        "usuarioId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pagos_solicitud" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pagos_solicitud_solicitud" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_carrito"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pagos_solicitud_usuario" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_pagos_solicitud_monto" CHECK ("monto" > 0),
        CONSTRAINT "CHK_pagos_solicitud_abona" CHECK ("abona" > 0)
      )
    `);
    await q.query(`CREATE INDEX "IDX_pagos_solicitud_solicitud" ON "pagos_solicitud" ("solicitudId", "createdAt")`);
    await q.query(`CREATE INDEX "IDX_pagos_solicitud_fecha" ON "pagos_solicitud" ("createdAt")`);
    await q.query(`ALTER TABLE "solicitudes_carrito" ADD "reservaVenceAt" TIMESTAMP WITH TIME ZONE`);
    await q.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "pagos_solicitud" TO app_backend`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "solicitudes_carrito" DROP COLUMN "reservaVenceAt"`);
    await q.query(`DROP TABLE "pagos_solicitud"`);
    // El valor 'reservada' del enum no se puede quitar sin recrear el tipo; se deja.
  }
}
