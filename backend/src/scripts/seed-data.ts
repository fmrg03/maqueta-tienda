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

    // --- Material (sin precio propio) + variantes con precio propio ---
    const materialRepo = dataSource.getRepository(Material);
    let material = await materialRepo.findOne({ where: { sku: 'CEM-001' } });
    if (!material) {
      material = await materialRepo.save(
        materialRepo.create({
          sku: 'CEM-001',
          nombre: 'Cemento Portland Gris',
          descripcion: 'Bolsa de cemento gris, uso general',
          categoria: categorias[0],
          activo: true,
        }),
      );
      console.log('✅ Material creado: Cemento Portland Gris');
    }

    const varianteRepo = dataSource.getRepository(VarianteMaterial);

    // Dos presentaciones con precio y costo propios — ni el costo del
    // proveedor ni el precio de venta son iguales entre ellas.
    let variante25kg = await varianteRepo.findOne({
      where: { skuVariante: 'CEM-001-25KG' },
    });
    if (!variante25kg) {
      variante25kg = await varianteRepo.save(
        varianteRepo.create({
          material,
          skuVariante: 'CEM-001-25KG',
          atributos: { presentacion: '25kg' },
          stock: 100,
          precioVenta: 8,
          precioCosto: 5,
        }),
      );
      console.log('✅ Variante creada: CEM-001-25KG (stock: 100, venta: $8, costo: $5)');
    }

    let variante50kg = await varianteRepo.findOne({
      where: { skuVariante: 'CEM-001-50KG' },
    });
    if (!variante50kg) {
      variante50kg = await varianteRepo.save(
        varianteRepo.create({
          material,
          skuVariante: 'CEM-001-50KG',
          atributos: { presentacion: '50kg' },
          stock: 40,
          precioVenta: 15,
          precioCosto: 9.5,
        }),
      );
      console.log('✅ Variante creada: CEM-001-50KG (stock: 40, venta: $15, costo: $9.50)');
    }


    // --- Catálogo ampliado: 5 productos nuevos por categoría ---
    // (2+ de cada categoría con 2 o 3 presentaciones). Idempotente por SKU.
    interface VarianteSeed {
      sku: string;
      atributos: Record<string, string>;
      stock: number;
      venta: number;
      costo: number;
    }
    interface ProductoSeed {
      sku: string;
      nombre: string;
      descripcion: string;
      categoria: number; // índice en `categorias`
      variantes: VarianteSeed[];
    }

    const productos: ProductoSeed[] = [
      // -- Cemento y Concreto --
      { sku: 'CEM-002', nombre: 'Cemento Blanco', categoria: 0,
        descripcion: 'Cemento blanco para acabados, juntas y pastas decorativas',
        variantes: [
          { sku: 'CEM-002-1KG', atributos: { presentacion: '1kg' }, stock: 60, venta: 2.5, costo: 1.6 },
          { sku: 'CEM-002-25KG', atributos: { presentacion: '25kg' }, stock: 25, venta: 28, costo: 19 },
        ] },
      { sku: 'MOR-001', nombre: 'Mortero Pega Block', categoria: 0,
        descripcion: 'Mortero premezclado para pegar bloques y ladrillos',
        variantes: [
          { sku: 'MOR-001-25KG', atributos: { presentacion: '25kg' }, stock: 80, venta: 6.5, costo: 4.2 },
        ] },
      { sku: 'ARE-001', nombre: 'Arena Lavada', categoria: 0,
        descripcion: 'Arena lavada para repello, mezclas y concreto',
        variantes: [
          { sku: 'ARE-001-S25', atributos: { presentacion: 'Saco 25kg' }, stock: 150, venta: 2, costo: 1.1 },
          { sku: 'ARE-001-S40', atributos: { presentacion: 'Saco 40kg' }, stock: 90, venta: 3, costo: 1.7 },
          { sku: 'ARE-001-M3', atributos: { presentacion: '1 m³' }, stock: 0, venta: 22, costo: 14 },
        ] },
      { sku: 'ADI-001', nombre: 'Aditivo Impermeabilizante', categoria: 0,
        descripcion: 'Aditivo líquido para impermeabilizar morteros y concreto',
        variantes: [
          { sku: 'ADI-001-1L', atributos: { presentacion: '1 litro' }, stock: 45, venta: 7, costo: 4.5 },
          { sku: 'ADI-001-4L', atributos: { presentacion: '4 litros' }, stock: 20, venta: 24, costo: 16 },
        ] },
      { sku: 'CAL-001', nombre: 'Cal Hidratada', categoria: 0,
        descripcion: 'Cal hidratada en saco para mezclas y pintura',
        variantes: [
          { sku: 'CAL-001-20KG', atributos: { presentacion: '20kg' }, stock: 55, venta: 5, costo: 3.2 },
        ] },

      // -- Tuberías --
      { sku: 'TUB-001', nombre: 'Tubo PVC Presión', categoria: 1,
        descripcion: 'Tubo de PVC para agua a presión, largo de 6 metros',
        variantes: [
          { sku: 'TUB-001-12', atributos: { diametro: '1/2"' }, stock: 70, venta: 4.5, costo: 2.9 },
          { sku: 'TUB-001-34', atributos: { diametro: '3/4"' }, stock: 50, venta: 6.8, costo: 4.5 },
          { sku: 'TUB-001-1', atributos: { diametro: '1"' }, stock: 0, venta: 9.9, costo: 6.6 },
        ] },
      { sku: 'TUB-002', nombre: 'Tubo PVC Sanitario', categoria: 1,
        descripcion: 'Tubo de PVC para aguas negras y desagües',
        variantes: [
          { sku: 'TUB-002-3M', atributos: { diametro: '4"', largo: '3m' }, stock: 35, venta: 11, costo: 7.5 },
          { sku: 'TUB-002-6M', atributos: { diametro: '4"', largo: '6m' }, stock: 28, venta: 20, costo: 13.8 },
        ] },
      { sku: 'COD-001', nombre: 'Codo PVC 90°', categoria: 1,
        descripcion: 'Codo de PVC de 90 grados para tubería a presión',
        variantes: [
          { sku: 'COD-001-12', atributos: { diametro: '1/2"' }, stock: 200, venta: 0.6, costo: 0.3 },
          { sku: 'COD-001-34', atributos: { diametro: '3/4"' }, stock: 180, venta: 0.9, costo: 0.5 },
        ] },
      { sku: 'LLA-001', nombre: 'Llave de Paso Esfera', categoria: 1,
        descripcion: 'Llave de paso tipo esfera de media vuelta, rosca 1/2"',
        variantes: [
          { sku: 'LLA-001-12', atributos: { diametro: '1/2"' }, stock: 40, venta: 5.5, costo: 3.4 },
        ] },
      { sku: 'TEF-001', nombre: 'Cinta Teflón', categoria: 1,
        descripcion: 'Cinta selladora de roscas para plomería',
        variantes: [
          { sku: 'TEF-001-12M', atributos: { presentacion: 'Rollo 12m' }, stock: 120, venta: 0.8, costo: 0.4 },
        ] },

      // -- Herramientas --
      { sku: 'HER-001', nombre: 'Martillo de Uña', categoria: 2,
        descripcion: 'Martillo de acero forjado con mango antideslizante',
        variantes: [
          { sku: 'HER-001-16', atributos: { peso: '16 oz' }, stock: 30, venta: 9, costo: 5.8 },
        ] },
      { sku: 'HER-002', nombre: 'Pala Cuadrada', categoria: 2,
        descripcion: 'Pala de punta cuadrada con mango de madera',
        variantes: [
          { sku: 'HER-002-STD', atributos: { modelo: 'Estándar' }, stock: 22, venta: 12, costo: 7.9 },
        ] },
      { sku: 'HER-003', nombre: 'Cinta Métrica', categoria: 2,
        descripcion: 'Cinta métrica con carcasa resistente y freno de cinta',
        variantes: [
          { sku: 'HER-003-5M', atributos: { largo: '5 m' }, stock: 60, venta: 3.5, costo: 2 },
          { sku: 'HER-003-8M', atributos: { largo: '8 m' }, stock: 45, venta: 5, costo: 3 },
          { sku: 'HER-003-10M', atributos: { largo: '10 m' }, stock: 25, venta: 6.8, costo: 4.2 },
        ] },
      { sku: 'HER-004', nombre: 'Nivel de Burbuja', categoria: 2,
        descripcion: 'Nivel de aluminio con tres burbujas',
        variantes: [
          { sku: 'HER-004-30', atributos: { largo: '30 cm' }, stock: 33, venta: 6, costo: 3.7 },
          { sku: 'HER-004-60', atributos: { largo: '60 cm' }, stock: 18, venta: 10.5, costo: 6.9 },
        ] },
      { sku: 'HER-005', nombre: 'Carretilla Reforzada', categoria: 2,
        descripcion: 'Carretilla con tolva metálica y neumático macizo',
        variantes: [
          { sku: 'HER-005-STD', atributos: { capacidad: '90 L' }, stock: 12, venta: 58, costo: 39 },
        ] },
    ];

    let productosCreados = 0;
    for (const p of productos) {
      let m = await materialRepo.findOne({ where: { sku: p.sku } });
      if (!m) {
        m = await materialRepo.save(
          materialRepo.create({
            sku: p.sku,
            nombre: p.nombre,
            descripcion: p.descripcion,
            categoria: categorias[p.categoria],
            activo: true,
          }),
        );
        productosCreados++;
      }
      for (const v of p.variantes) {
        const existe = await varianteRepo.findOne({ where: { skuVariante: v.sku } });
        if (!existe) {
          await varianteRepo.save(
            varianteRepo.create({
              material: m,
              skuVariante: v.sku,
              atributos: v.atributos,
              stock: v.stock,
              precioVenta: v.venta,
              precioCosto: v.costo,
            }),
          );
        }
      }
    }
    console.log(`✅ Catálogo ampliado: ${productosCreados} productos nuevos (${productos.length} en total en el seed)`);

    const materialProveedorRepo = dataSource.getRepository(MaterialProveedor);
    const asociacionExistente = await materialProveedorRepo.findOne({
      where: { variante: { id: variante25kg.id }, proveedor: { id: proveedor.id } },
    });
    if (!asociacionExistente) {
      await materialProveedorRepo.save(
        materialProveedorRepo.create({
          variante: variante25kg,
          proveedor,
          precioCostoProveedor: 4.5,
          tiempoEntregaDias: 3,
        }),
      );
      console.log('✅ Variante 25kg vinculada al proveedor');
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

    // Franjas de ejemplo para los próximos 5 días. Horas en UTC; Venezuela
    // es UTC-4, así que 13/14/15/19/20 UTC = 9/10/11 AM y 3/4 PM allá.
    const disponibilidadRepo = dataSource.getRepository(DisponibilidadAsesor);
    let franjasCreadas = 0;
    for (let dia = 1; dia <= 5; dia++) {
      for (const hora of [13, 14, 15, 19, 20]) {
        const fecha = new Date();
        fecha.setUTCDate(fecha.getUTCDate() + dia);
        fecha.setUTCHours(hora, 0, 0, 0);

        const existente = await disponibilidadRepo.findOne({
          where: { asesor: { id: asesor.id }, fechaHora: fecha },
        });
        if (!existente) {
          await disponibilidadRepo.save(
            disponibilidadRepo.create({ asesor, fechaHora: fecha, disponible: true }),
          );
          franjasCreadas++;
        }
      }
    }
    if (franjasCreadas > 0) {
      console.log(`✅ ${franjasCreadas} franjas de disponibilidad creadas (próximos 5 días)`);
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
