import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RLS solo tiene efecto real si la conexión de la app NO es superusuario
 * (un superusuario de Postgres siempre bypassea RLS, sin excepción). Por
 * eso este migration primero crea un rol de aplicación dedicado
 * (`app_backend`) sin ese privilegio, y documenta que DATABASE_URL en
 * producción debe usar ese rol — no `postgres` — o las políticas de abajo
 * no se aplican nunca.
 *
 * Contexto de sesión esperado por las políticas (seteado por
 * RlsContextInterceptor en cada request autenticado, vía SET LOCAL):
 *   app.usuario_id  -> uuid del usuario autenticado
 *   app.rol     -> rol del usuario autenticado (admin/ventas/asesor/cliente)
 * Si no están seteadas (ej. conexión directa fuera de la app), las
 * políticas son restrictivas por defecto — no exponen filas.
 */
export class AddRowLevelSecurity1788230000000 implements MigrationInterface {
  name = 'AddRowLevelSecurity1788230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Rol de aplicación (no superusuario, no bypassea RLS) ---
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_backend') THEN
          CREATE ROLE app_backend LOGIN PASSWORD 'cambiar-en-produccion' NOBYPASSRLS;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO app_backend`);
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_backend`,
    );
    await queryRunner.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_backend`,
    );

    // --- usuarios: cada quien ve su propia fila; admin ve todas ---
    await queryRunner.query(`ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "usuarios" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY usuarios_select_propio_o_admin ON "usuarios"
      FOR SELECT
      USING (
        current_setting('app.rol', true) = 'admin'
        OR id = NULLIF(current_setting('app.usuario_id', true), '')::uuid
      )
    `);
    // Excepción acotada: el lookup de login (buscar por email ANTES de que
    // exista sesión) necesita leer la tabla sin que haya un usuario
    // autenticado todavía. Solo UsuariosService.findByEmailConPassword
    // setea este valor especial, y solo para esa consulta puntual — no es
    // alcanzable desde ningún input de usuario ni endpoint expuesto.
    await queryRunner.query(`
      CREATE POLICY usuarios_select_login ON "usuarios"
      FOR SELECT
      USING (current_setting('app.rol', true) = 'service_auth')
    `);
    await queryRunner.query(`
      CREATE POLICY usuarios_write_admin ON "usuarios"
      FOR ALL
      USING (current_setting('app.rol', true) = 'admin')
      WITH CHECK (current_setting('app.rol', true) = 'admin')
    `);
    // El auto-registro público (POST /auth/register) crea usuarios sin
    // sesión previa, así que necesita su propia política de INSERT. Se
    // restringe a rol='cliente' — AuthService.register fuerza ese rol
    // sin importar lo que venga en el DTO (ver auth.service.ts), así
    // que esta política es una segunda capa de defensa, no la única.
    await queryRunner.query(`
      CREATE POLICY usuarios_insert_publico_cliente ON "usuarios"
      FOR INSERT
      WITH CHECK (rol = 'cliente')
    `);

    // --- solicitudes_carrito: solo ventas/admin (ver ARCHITECTURE.md sección 5) ---
    await queryRunner.query(
      `ALTER TABLE "solicitudes_carrito" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_carrito" FORCE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`
      CREATE POLICY carrito_select_ventas_admin ON "solicitudes_carrito"
      FOR SELECT
      USING (current_setting('app.rol', true) IN ('admin', 'ventas'))
    `);
    // INSERT queda abierto: la creación es un endpoint público sin sesión
    // autenticada (POST /carrito/solicitud), no hay un usuario que filtrar.
    await queryRunner.query(`
      CREATE POLICY carrito_insert_publico ON "solicitudes_carrito"
      FOR INSERT
      WITH CHECK (true)
    `);
    await queryRunner.query(`
      CREATE POLICY carrito_update_ventas_admin ON "solicitudes_carrito"
      FOR UPDATE
      USING (current_setting('app.rol', true) IN ('admin', 'ventas'))
      WITH CHECK (current_setting('app.rol', true) IN ('admin', 'ventas'))
    `);

    // --- solicitudes_asesoria: admin ve todas; asesor solo las suyas ---
    await queryRunner.query(
      `ALTER TABLE "solicitudes_asesoria" ENABLE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_asesoria" FORCE ROW LEVEL SECURITY`,
    );
    await queryRunner.query(`
      CREATE POLICY asesoria_select_admin_o_asesor_propio ON "solicitudes_asesoria"
      FOR SELECT
      USING (
        current_setting('app.rol', true) = 'admin'
        OR "asesorId" IN (
          SELECT id FROM "asesores"
          WHERE "usuarioId" = NULLIF(current_setting('app.usuario_id', true), '')::uuid
        )
      )
    `);
    await queryRunner.query(`
      CREATE POLICY asesoria_insert_publico ON "solicitudes_asesoria"
      FOR INSERT
      WITH CHECK (true)
    `);
    await queryRunner.query(`
      CREATE POLICY asesoria_update_admin_o_asesor_propio ON "solicitudes_asesoria"
      FOR UPDATE
      USING (
        current_setting('app.rol', true) = 'admin'
        OR "asesorId" IN (
          SELECT id FROM "asesores"
          WHERE "usuarioId" = NULLIF(current_setting('app.usuario_id', true), '')::uuid
        )
      )
      WITH CHECK (
        current_setting('app.rol', true) = 'admin'
        OR "asesorId" IN (
          SELECT id FROM "asesores"
          WHERE "usuarioId" = NULLIF(current_setting('app.usuario_id', true), '')::uuid
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS asesoria_update_admin_o_asesor_propio ON "solicitudes_asesoria"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS asesoria_insert_publico ON "solicitudes_asesoria"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS asesoria_select_admin_o_asesor_propio ON "solicitudes_asesoria"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_asesoria" DISABLE ROW LEVEL SECURITY`,
    );

    await queryRunner.query(
      `DROP POLICY IF EXISTS carrito_update_ventas_admin ON "solicitudes_carrito"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS carrito_insert_publico ON "solicitudes_carrito"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS carrito_select_ventas_admin ON "solicitudes_carrito"`,
    );
    await queryRunner.query(
      `ALTER TABLE "solicitudes_carrito" DISABLE ROW LEVEL SECURITY`,
    );

    await queryRunner.query(`DROP POLICY IF EXISTS usuarios_write_admin ON "usuarios"`);
    await queryRunner.query(
      `DROP POLICY IF EXISTS usuarios_insert_publico_cliente ON "usuarios"`,
    );
    await queryRunner.query(`DROP POLICY IF EXISTS usuarios_select_login ON "usuarios"`);
    await queryRunner.query(
      `DROP POLICY IF EXISTS usuarios_select_propio_o_admin ON "usuarios"`,
    );
    await queryRunner.query(`ALTER TABLE "usuarios" DISABLE ROW LEVEL SECURITY`);

    // El rol app_backend no se elimina en down(): podría estar en uso por
    // la conexión activa de la app. Se documenta como limpieza manual.
  }
}
