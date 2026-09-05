import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige un error de diseño real, señalado por el usuario del negocio:
 * dos presentaciones del mismo material (ej. cemento 25kg vs 50kg) casi
 * nunca cuestan lo mismo — ni al comprarlo del proveedor ni al venderlo.
 * El precio es un atributo de la presentación específica (VarianteMaterial),
 * no del "producto en general" (Material). Mismo razonamiento aplica al
 * costo del proveedor (MaterialProveedor).
 *
 * Esta migración:
 * 1. Mueve precioVenta/precioCosto de `materiales` a `variantes_material`
 *    (antes solo existía `precioVentaOverride`, opcional, como si fuera
 *    la excepción — ahora es la norma, campo requerido).
 * 2. Mueve `material_proveedor` de referenciar Material a referenciar
 *    VarianteMaterial directamente.
 * 3. `combo_items` ya no acepta un Material genérico — cada item de
 *    combo siempre debe apuntar a una variante específica (la tienda
 *    arma el combo y necesita saber exactamente qué presentación y a
 *    qué costo/stock está empaquetando).
 *
 * Nota sobre el backfill: como el proyecto está en etapa de desarrollo
 * (sin datos reales de producción todavía), el backfill de
 * material_proveedor/combo_items que referenciaban Material usa una
 * heurística simple (la primera variante del material) en vez de una
 * migración de datos más elaborada — aceptable acá, NO sería aceptable
 * en una migración corriendo contra datos reales de producción.
 */
export class MoverPrecioAVariante1788400000000 implements MigrationInterface {
  name = 'MoverPrecioAVariante1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. Precio: de materiales a variantes_material ---
    await queryRunner.query(
      `ALTER TABLE "variantes_material" ADD COLUMN "precioVenta" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "variantes_material" ADD COLUMN "precioCosto" numeric(12,2)`,
    );
    await queryRunner.query(`
      UPDATE "variantes_material" vm
      SET "precioVenta" = COALESCE(vm."precioVentaOverride", m."precioVenta"),
          "precioCosto" = m."precioCosto"
      FROM "materiales" m
      WHERE vm."materialId" = m.id
    `);
    await queryRunner.query(
      `ALTER TABLE "variantes_material" ALTER COLUMN "precioVenta" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "variantes_material" ALTER COLUMN "precioCosto" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "variantes_material" DROP COLUMN "precioVentaOverride"`,
    );
    await queryRunner.query(`ALTER TABLE "materiales" DROP COLUMN "precioCosto"`);
    await queryRunner.query(`ALTER TABLE "materiales" DROP COLUMN "precioVenta"`);

    // --- 2. material_proveedor: de Material a VarianteMaterial ---
    await queryRunner.query(
      `ALTER TABLE "material_proveedor" ADD COLUMN "varianteId" uuid`,
    );
    await queryRunner.query(`
      UPDATE "material_proveedor" mp
      SET "varianteId" = (
        SELECT vm.id FROM "variantes_material" vm
        WHERE vm."materialId" = mp."materialId"
        ORDER BY vm.id LIMIT 1
      )
    `);
    // Si algún material no tenía ninguna variante creada todavía, no hay
    // a qué variante asociar el costo del proveedor — se descarta esa
    // fila huérfana (solo posible con datos de desarrollo).
    await queryRunner.query(
      `DELETE FROM "material_proveedor" WHERE "varianteId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_proveedor" ALTER COLUMN "varianteId" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "material_proveedor"
      ADD CONSTRAINT "FK_material_proveedor_variante"
      FOREIGN KEY ("varianteId") REFERENCES "variantes_material"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `ALTER TABLE "material_proveedor" DROP CONSTRAINT "FK_e2546042777b4b9fb086a91815a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_proveedor" DROP COLUMN "materialId"`,
    );

    // --- 3. combo_items: varianteId pasa a ser obligatorio, se quita materialId ---
    await queryRunner.query(`
      UPDATE "combo_items" ci
      SET "varianteId" = (
        SELECT vm.id FROM "variantes_material" vm
        WHERE vm."materialId" = ci."materialId"
        ORDER BY vm.id LIMIT 1
      )
      WHERE ci."varianteId" IS NULL AND ci."materialId" IS NOT NULL
    `);
    await queryRunner.query(
      `DELETE FROM "combo_items" WHERE "varianteId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "combo_items" ALTER COLUMN "varianteId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "combo_items" DROP CONSTRAINT "FK_fce4f4cdc97d955c175b1df5cc2"`,
    );
    await queryRunner.query(`ALTER TABLE "combo_items" DROP COLUMN "materialId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- 3. combo_items: revertir a materialId opcional ---
    await queryRunner.query(
      `ALTER TABLE "combo_items" ADD COLUMN "materialId" uuid`,
    );
    await queryRunner.query(`
      ALTER TABLE "combo_items"
      ADD CONSTRAINT "FK_fce4f4cdc97d955c175b1df5cc2"
      FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `ALTER TABLE "combo_items" ALTER COLUMN "varianteId" DROP NOT NULL`,
    );

    // --- 2. material_proveedor: revertir a materialId ---
    await queryRunner.query(
      `ALTER TABLE "material_proveedor" ADD COLUMN "materialId" uuid`,
    );
    await queryRunner.query(`
      UPDATE "material_proveedor" mp
      SET "materialId" = (
        SELECT vm."materialId" FROM "variantes_material" vm WHERE vm.id = mp."varianteId"
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "material_proveedor"
      ADD CONSTRAINT "FK_e2546042777b4b9fb086a91815a"
      FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `ALTER TABLE "material_proveedor" DROP CONSTRAINT "FK_material_proveedor_variante"`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_proveedor" ALTER COLUMN "varianteId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "material_proveedor" DROP COLUMN "varianteId"`,
    );

    // --- 1. Precio: revertir a materiales, restaurar precioVentaOverride ---
    await queryRunner.query(
      `ALTER TABLE "materiales" ADD COLUMN "precioVenta" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "materiales" ADD COLUMN "precioCosto" numeric(12,2)`,
    );
    await queryRunner.query(`
      UPDATE "materiales" m
      SET "precioVenta" = COALESCE(
            (SELECT vm."precioVenta" FROM "variantes_material" vm WHERE vm."materialId" = m.id ORDER BY vm.id LIMIT 1),
            0
          ),
          "precioCosto" = COALESCE(
            (SELECT vm."precioCosto" FROM "variantes_material" vm WHERE vm."materialId" = m.id ORDER BY vm.id LIMIT 1),
            0
          )
    `);
    await queryRunner.query(
      `ALTER TABLE "materiales" ALTER COLUMN "precioVenta" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "materiales" ALTER COLUMN "precioCosto" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "variantes_material" ADD COLUMN "precioVentaOverride" numeric(12,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "variantes_material" DROP COLUMN "precioVenta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "variantes_material" DROP COLUMN "precioCosto"`,
    );
  }
}
