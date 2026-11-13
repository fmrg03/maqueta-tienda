import { MigrationInterface, QueryRunner } from 'typeorm';
import { ROLES_SISTEMA } from '../modules/roles/permisos';

/**
 * Roles y permisos configurables.
 *  - Tabla `roles` (clave, nombre, permisos[]). `admin` y `cliente` son de sistema.
 *  - `usuarios.rol` pasa de enum a varchar con FK a `roles.clave`.
 *  - Las políticas de RLS dejan de depender de nombres de rol: usan
 *    `app_permiso('x')`, que lee `app.permisos` (lo setea el RlsInterceptor).
 *    `admin` siempre pasa.
 */
export class RolesPermisos1789400000000 implements MigrationInterface {
  name = 'RolesPermisos1789400000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clave" varchar(40) NOT NULL,
        "nombre" varchar(80) NOT NULL,
        "descripcion" varchar(255),
        "permisos" text[] NOT NULL DEFAULT '{}',
        "sistema" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_clave" UNIQUE ("clave")
      )
    `);
    await q.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "roles" TO app_backend`);

    await q.query(
      `INSERT INTO "roles" ("clave","nombre","descripcion","permisos","sistema") VALUES
        ('admin','Administrador','Acceso total. Único que administra usuarios, roles y permisos','{}',true),
        ('cliente','Cliente','Cuenta de cliente (sin acceso al panel)','{}',true)`,
    );
    for (const r of ROLES_SISTEMA) {
      await q.query(
        `INSERT INTO "roles" ("clave","nombre","descripcion","permisos","sistema") VALUES ($1,$2,$3,$4,true)`,
        [r.clave, r.nombre, r.descripcion, r.permisos],
      );
    }

    // Las políticas que dependen del tipo de columna se recrean abajo.
    await q.query(`DROP POLICY IF EXISTS usuarios_select_propio_o_admin ON "usuarios"`);
    await q.query(`DROP POLICY IF EXISTS usuarios_insert_publico_cliente ON "usuarios"`);
    await q.query(`ALTER TABLE "usuarios" ALTER COLUMN "rol" DROP DEFAULT`);
    await q.query(`ALTER TABLE "usuarios" ALTER COLUMN "rol" TYPE varchar(40) USING "rol"::text`);
    await q.query(`ALTER TABLE "usuarios" ALTER COLUMN "rol" SET DEFAULT 'cliente'`);
    await q.query(`DROP TYPE IF EXISTS "public"."usuarios_rol_enum"`);
    await q.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "FK_usuarios_rol" FOREIGN KEY ("rol") REFERENCES "roles"("clave") ON UPDATE CASCADE ON DELETE RESTRICT`,
    );
    await q.query(`
      CREATE POLICY usuarios_select_propio_o_admin ON "usuarios" FOR SELECT
      USING (id = NULLIF(current_setting('app.usuario_id', true), '')::uuid OR current_setting('app.rol', true) = 'admin')
    `);
    await q.query(`
      CREATE POLICY usuarios_insert_publico_cliente ON "usuarios" FOR INSERT
      WITH CHECK (rol = 'cliente' OR current_setting('app.rol', true) IN ('admin','service_auth'))
    `);

    await q.query(`
      CREATE OR REPLACE FUNCTION app_permiso(p text) RETURNS boolean
      LANGUAGE sql STABLE AS $$
        SELECT current_setting('app.rol', true) = 'admin'
          OR position(',' || p || ',' IN ',' || coalesce(current_setting('app.permisos', true), '') || ',') > 0
      $$
    `);
    await q.query(`GRANT EXECUTE ON FUNCTION app_permiso(text) TO app_backend`);

    // --- Carrito ---
    await q.query(`DROP POLICY IF EXISTS carrito_select_ventas_admin ON "solicitudes_carrito"`);
    await q.query(`DROP POLICY IF EXISTS carrito_update_ventas_admin ON "solicitudes_carrito"`);
    await q.query(`CREATE POLICY carrito_select_permiso ON "solicitudes_carrito" FOR SELECT
      USING (app_permiso('solicitudes.ver') OR app_permiso('reportes.ver'))`);
    await q.query(`CREATE POLICY carrito_update_permiso ON "solicitudes_carrito" FOR UPDATE
      USING (app_permiso('solicitudes.gestionar')) WITH CHECK (app_permiso('solicitudes.gestionar'))`);
    await q.query(`DROP POLICY IF EXISTS eventos_carrito_ventas_admin ON "eventos_solicitud_carrito"`);
    await q.query(`CREATE POLICY eventos_carrito_permiso ON "eventos_solicitud_carrito" FOR ALL
      USING (app_permiso('solicitudes.ver') OR app_permiso('solicitudes.gestionar'))
      WITH CHECK (app_permiso('solicitudes.gestionar'))`);

    // --- Asesorías: admin/todas, o el asesor dueño ---
    const propia = `"asesorId" IN (SELECT id FROM "asesores" WHERE "usuarioId" = NULLIF(current_setting('app.usuario_id', true), '')::uuid)`;
    await q.query(`DROP POLICY IF EXISTS asesoria_select_admin_o_asesor_propio ON "solicitudes_asesoria"`);
    await q.query(`DROP POLICY IF EXISTS asesoria_update_admin_o_asesor_propio ON "solicitudes_asesoria"`);
    await q.query(`CREATE POLICY asesoria_select_permiso ON "solicitudes_asesoria" FOR SELECT
      USING (app_permiso('asesorias.todas') OR (app_permiso('asesorias.propias') AND ${propia}))`);
    await q.query(`CREATE POLICY asesoria_update_permiso ON "solicitudes_asesoria" FOR UPDATE
      USING (app_permiso('asesorias.todas') OR (app_permiso('asesorias.propias') AND ${propia}))
      WITH CHECK (app_permiso('asesorias.todas') OR (app_permiso('asesorias.propias') AND ${propia}))`);

    // --- Presupuestos y servicios ---
    for (const t of ['presupuestos', 'presupuesto_items']) {
      await q.query(`DROP POLICY IF EXISTS ${t}_personal ON "${t}"`);
      await q.query(`CREATE POLICY ${t}_personal ON "${t}" FOR ALL
        USING (app_permiso('presupuestos.ver') OR app_permiso('presupuestos.gestionar'))
        WITH CHECK (app_permiso('presupuestos.gestionar') OR app_permiso('presupuestos.convertir'))`);
    }
    await q.query(`DROP POLICY IF EXISTS servicios_lectura_personal ON "servicios"`);
    await q.query(`DROP POLICY IF EXISTS servicios_escritura_admin ON "servicios"`);
    await q.query(`CREATE POLICY servicios_lectura_permiso ON "servicios" FOR SELECT
      USING (app_permiso('servicios.ver') OR app_permiso('servicios.gestionar')
             OR app_permiso('presupuestos.ver') OR app_permiso('presupuestos.gestionar'))`);
    await q.query(`CREATE POLICY servicios_escritura_permiso ON "servicios" FOR ALL
      USING (app_permiso('servicios.gestionar')) WITH CHECK (app_permiso('servicios.gestionar'))`);
  }

  public async down(): Promise<void> {
    throw new Error('Migración irreversible: restaurar desde respaldo.');
  }
}
