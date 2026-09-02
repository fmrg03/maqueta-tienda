import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige un bug encontrado probando la app real (no solo con SQL
 * manual): el INSERT público de SolicitudAsesoria (POST
 * /asesorias/solicitud, sin sesión) fallaba con "new row violates
 * row-level security policy" — no por el INSERT en sí (la política
 * asesoria_insert_publico ya lo permite con WITH CHECK true), sino
 * porque TypeORM siempre agrega RETURNING para leer columnas generadas,
 * y Postgres exige que la fila insertada también pase una política de
 * SELECT para poder devolverla. Mismo patrón que 'service_auth' en
 * usuarios (ver AddRowLevelSecurity y UsuariosService.create).
 */
/**
 * Corrige un bug encontrado probando la app real (no solo con SQL
 * manual): el INSERT público de SolicitudAsesoria (POST
 * /asesorias/solicitud, sin sesión) fallaba con "new row violates
 * row-level security policy" — no por el INSERT en sí (la política
 * asesoria_insert_publico ya lo permite con WITH CHECK true), sino
 * porque TypeORM siempre agrega RETURNING para leer columnas generadas,
 * y Postgres exige que la fila insertada también pase una política de
 * SELECT para poder devolverla. Mismo patrón que 'service_auth' en
 * usuarios (ver AddRowLevelSecurity y UsuariosService.create).
 *
 * SolicitudCarrito tiene el mismo problema por la misma razón (insert
 * público sin sesión) — se corrige acá también, antes de que llegara a
 * fallar en producción.
 */
export class FixAsesoriaInsertReturning1788300000000
  implements MigrationInterface
{
  name = 'FixAsesoriaInsertReturning1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE POLICY asesoria_select_service_auth ON "solicitudes_asesoria"
      FOR SELECT
      USING (current_setting('app.rol', true) = 'service_auth')
    `);
    await queryRunner.query(`
      CREATE POLICY carrito_select_service_auth ON "solicitudes_carrito"
      FOR SELECT
      USING (current_setting('app.rol', true) = 'service_auth')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS carrito_select_service_auth ON "solicitudes_carrito"`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS asesoria_select_service_auth ON "solicitudes_asesoria"`,
    );
  }
}
