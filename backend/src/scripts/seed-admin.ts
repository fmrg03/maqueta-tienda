import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import dataSource from '../data-source';
import { RolUsuario, Usuario } from '../modules/usuarios/entities/usuario.entity';

config();

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Crea la cuenta admin fundacional (protegido = true), directamente por
 * fuera de la API — no existe otro admin todavía que pueda crearla vía
 * POST /usuarios, así que este script es la única puerta de entrada.
 *
 * IMPORTANTE: corré este script con las mismas credenciales privilegiadas
 * que usás para las migraciones (DATABASE_URL apuntando al superusuario),
 * NO con el rol `app_backend` de runtime. Insertar un usuario con
 * rol='admin' choca con las políticas de RLS (nadie puede insertarse
 * como admin sin que exista ya una sesión admin activa — el mismo
 * problema de huevo y gallina que resolvimos para el login, pero aquí
 * no hay una excepción tipo 'service_auth' para esto a propósito: crear
 * el admin fundacional es una operación administrativa fuera de la app
 * en ejecución, no algo que un endpoint deba poder hacer.
 *
 * Uso:
 *   SEED_ADMIN_EMAIL=admin@empresa.com SEED_ADMIN_NOMBRE="Nombre Apellido" \
 *     npm run seed:admin
 *
 * Si no se pasa SEED_ADMIN_PASSWORD, se genera una contraseña aleatoria
 * fuerte y se imprime UNA sola vez en la consola — no queda guardada en
 * ningún archivo. Guardala en un gestor de contraseñas de inmediato.
 */
async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const nombre = process.env.SEED_ADMIN_NOMBRE ?? 'Administrador';
  const passwordProvista = process.env.SEED_ADMIN_PASSWORD;

  if (!email) {
    console.error('Falta SEED_ADMIN_EMAIL. Uso:');
    console.error(
      '  SEED_ADMIN_EMAIL=admin@empresa.com SEED_ADMIN_NOMBRE="Nombre" npm run seed:admin',
    );
    process.exit(1);
  }

  const password = passwordProvista ?? crypto.randomBytes(18).toString('base64url');

  await dataSource.initialize();

  try {
    const repo = dataSource.getRepository(Usuario);

    const existente = await repo.findOne({ where: { email } });
    if (existente) {
      console.error(`Ya existe un usuario con email ${email}. Abortando.`);
      process.exit(1);
    }

    const yaHayProtegido = await repo.findOne({ where: { protegido: true } });
    if (yaHayProtegido) {
      console.error(
        `Ya existe una cuenta protegida (${yaHayProtegido.email}). ` +
          'Este script solo crea la primera. Para agregar más admins, usá POST /usuarios.',
      );
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const admin = repo.create({
      nombre,
      email,
      passwordHash,
      rol: RolUsuario.ADMIN,
      activo: true,
      protegido: true,
    });

    await repo.save(admin);

    console.log('✅ Cuenta admin fundacional creada.');
    console.log(`   Email: ${email}`);
    if (!passwordProvista) {
      console.log(`   Password (guardala ahora, no se vuelve a mostrar): ${password}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((error) => {
  console.error('Error creando la cuenta admin:', error);
  process.exit(1);
});
