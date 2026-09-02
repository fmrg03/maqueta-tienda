import { config } from 'dotenv';
import dataSource from '../data-source';
import { Categoria } from '../modules/inventario/entities/categoria.entity';
import { Material } from '../modules/inventario/entities/material.entity';
import { VarianteMaterial } from '../modules/inventario/entities/variante-material.entity';
import { Proveedor } from '../modules/proveedores/entities/proveedor.entity';
import { MaterialProveedor } from '../modules/inventario/entities/material-proveedor.entity';
import { Usuario, RolUsuario } from '../modules/usuarios/entities/usuario.entity';
import { Asesor, DisponibilidadAsesor } from '../modules/asesorias/entities/asesoria.entity';
import * as bcrypt from 'bcrypt';

config();

/**
 * Datos de ejemplo para desarrollo local — NO para producción. A
 * diferencia de seed-admin.ts, este script no crea nada 'protegido' y
 * puede correrse las veces que haga falta (es idempotente: si ya existe
 * el dato por nombre/sku/email, lo salta en vez de duplicarlo).
 *
 * Requiere las mismas credenciales privilegiadas que seed-admin.ts, ya
 * que crea un usuario con rol='asesor' (choca con RLS igual que el admin
 * fundacional, por la misma razón documentada ahí).
 *
 * Uso: npm run seed:data
 */
async function seedData(): Promise<void> {
  await dataSource.initialize();

  try {
    // --- Categorías ---
    const categoriaRepo = dataSource.getRepository(Categoria);
    const nombresCategorias = ['Cemento y Concreto', 'Tuberías', 'Herramientas'];
    const categorias: Categoria[] = [];
    for (const nombre of nombresCategorias) {
      let categoria = await categoriaRepo.findOne({ where: { nombre } });
      if (!categoria) {
        categoria = await categoriaRepo.save(categoriaRepo.create({ nombre }));
        console.log(`✅ Categoría creada: ${nombre}`);
      }
      categorias.push(categoria);
    }

    // --- Proveedor ---
    const proveedorRepo = dataSource.getRepository(Proveedor);
    let proveedor = await proveedorRepo.findOne({
      where: { nombre: 'Distribuidora Central C.A.' },
    });
    if (!proveedor) {
      proveedor = await proveedorRepo.save(
        proveedorRepo.create({
          nombre: 'Distribuidora Central C.A.',
          contacto: '+58 212-1234567',
          condicionesPago: '30 días',
        }),
      );
      console.log('✅ Proveedor creado: Distribuidora Central C.A.');
    }

    // --- Material + variante ---
    const materialRepo = dataSource.getRepository(Material);
    let material = await materialRepo.findOne({ where: { sku: 'CEM-001' } });
    if (!material) {
      material = await materialRepo.save(
        materialRepo.create({
          sku: 'CEM-001',
          nombre: 'Cemento Portland Gris',
          descripcion: 'Bolsa de 25kg, uso general',
          categoria: categorias[0],
          precioCosto: 5,
          precioVenta: 8,
          activo: true,
        }),
      );
      console.log('✅ Material creado: Cemento Portland Gris');
    }

    const varianteRepo = dataSource.getRepository(VarianteMaterial);
    let variante = await varianteRepo.findOne({
      where: { skuVariante: 'CEM-001-25KG' },
    });
    if (!variante) {
      variante = await varianteRepo.save(
        varianteRepo.create({
          material,
          skuVariante: 'CEM-001-25KG',
          atributos: { presentacion: '25kg' },
          stock: 100,
        }),
      );
      console.log('✅ Variante creada: CEM-001-25KG (stock inicial: 100)');
    }

    const materialProveedorRepo = dataSource.getRepository(MaterialProveedor);
    const asociacionExistente = await materialProveedorRepo.findOne({
      where: { material: { id: material.id }, proveedor: { id: proveedor.id } },
    });
    if (!asociacionExistente) {
      await materialProveedorRepo.save(
        materialProveedorRepo.create({
          material,
          proveedor,
          precioCostoProveedor: 4.5,
          tiempoEntregaDias: 3,
        }),
      );
      console.log('✅ Material vinculado al proveedor');
    }

    // --- Usuario asesor + Asesor + disponibilidad de ejemplo ---
    const usuarioRepo = dataSource.getRepository(Usuario);
    let usuarioAsesor = await usuarioRepo.findOne({
      where: { email: 'asesor-demo@empresa.com' },
    });
    if (!usuarioAsesor) {
      const passwordHash = await bcrypt.hash('cambiar-esta-password', 12);
      usuarioAsesor = await usuarioRepo.save(
        usuarioRepo.create({
          nombre: 'Asesor Demo',
          email: 'asesor-demo@empresa.com',
          passwordHash,
          rol: RolUsuario.ASESOR,
          activo: true,
          protegido: false,
        }),
      );
      console.log('✅ Usuario asesor creado: asesor-demo@empresa.com / cambiar-esta-password');
    }

    const asesorRepo = dataSource.getRepository(Asesor);
    let asesor = await asesorRepo.findOne({
      where: { usuario: { id: usuarioAsesor.id } },
    });
    if (!asesor) {
      asesor = await asesorRepo.save(
        asesorRepo.create({
          usuario: usuarioAsesor,
          especialidad: 'Remodelación y construcción general',
        }),
      );
      console.log('✅ Asesor creado');
    }

    const disponibilidadRepo = dataSource.getRepository(DisponibilidadAsesor);
    const mañana = new Date();
    mañana.setUTCDate(mañana.getUTCDate() + 1);
    mañana.setUTCHours(14, 0, 0, 0); // 14:00 UTC = 10:00 AM Venezuela (UTC-4)

    const disponibilidadExistente = await disponibilidadRepo.findOne({
      where: { asesor: { id: asesor.id }, fechaHora: mañana },
    });
    if (!disponibilidadExistente) {
      await disponibilidadRepo.save(
        disponibilidadRepo.create({ asesor, fechaHora: mañana, disponible: true }),
      );
      console.log(`✅ Franja de disponibilidad creada: ${mañana.toISOString()}`);
    }

    console.log('\n🌱 Seed de datos completo.');
  } finally {
    await dataSource.destroy();
  }
}

seedData().catch((error) => {
  console.error('Error en el seed de datos:', error);
  process.exit(1);
});
