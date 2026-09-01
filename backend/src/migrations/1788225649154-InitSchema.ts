import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1788225649154 implements MigrationInterface {
    name = 'InitSchema1788225649154'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."usuarios_rol_enum" AS ENUM('admin', 'ventas', 'asesor', 'cliente')`);
        await queryRunner.query(`CREATE TABLE "usuarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "email" character varying(150) NOT NULL, "passwordHash" character varying(255) NOT NULL, "rol" "public"."usuarios_rol_enum" NOT NULL DEFAULT 'cliente', "telefono" character varying(30), "activo" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_446adfc18b35418aac32ae0b7b" ON "usuarios" ("email") `);
        await queryRunner.query(`CREATE TABLE "proveedores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "contacto" character varying(200), "condicionesPago" character varying(200), "activo" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1dcf121f19f362fb1b4c0a493a9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categorias" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(100) NOT NULL, CONSTRAINT "UQ_ccdf6cd1a34ea90a7233325063d" UNIQUE ("nombre"), CONSTRAINT "PK_3886a26251605c571c6b4f861fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "materiales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sku" character varying(50) NOT NULL, "nombre" character varying(200) NOT NULL, "descripcion" text, "precioCosto" numeric(12,2) NOT NULL, "precioVenta" numeric(12,2) NOT NULL, "imagenUrl" character varying(500), "activo" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "categoriaId" uuid, CONSTRAINT "PK_bdb2febb21ca2abcdd52ec12559" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c793fde0d5790ea929d6bffce8" ON "materiales" ("sku") `);
        await queryRunner.query(`CREATE TABLE "variantes_material" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "atributos" jsonb NOT NULL DEFAULT '{}', "skuVariante" character varying(60) NOT NULL, "stock" integer NOT NULL DEFAULT '0', "precioVentaOverride" numeric(12,2), "materialId" uuid, CONSTRAINT "PK_beecf54fe017a7b66404dd4a5e3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b11ede5f2162b798dd2e8a47d6" ON "variantes_material" ("skuVariante") `);
        await queryRunner.query(`CREATE TYPE "public"."movimientos_inventario_tipo_enum" AS ENUM('entrada', 'salida')`);
        await queryRunner.query(`CREATE TABLE "movimientos_inventario" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo" "public"."movimientos_inventario_tipo_enum" NOT NULL, "cantidad" integer NOT NULL, "motivo" character varying(300), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "varianteId" uuid, "usuarioId" uuid, CONSTRAINT "PK_812f6e4f95b017981363c4b9ff9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "material_proveedor" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "precioCostoProveedor" numeric(12,2) NOT NULL, "tiempoEntregaDias" integer NOT NULL DEFAULT '0', "materialId" uuid, "proveedorId" uuid, CONSTRAINT "PK_888f6f8dafb026fdb4f5f8555e5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "combos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(200) NOT NULL, "descripcion" text, "precioCombo" numeric(12,2) NOT NULL, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5b4bab633aee439e2bade42cc3c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "combo_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cantidad" integer NOT NULL, "comboId" uuid, "materialId" uuid, "varianteId" uuid, CONSTRAINT "PK_f633e0564e3422d489c5cebe2e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."solicitudes_carrito_estado_enum" AS ENUM('nueva', 'contactado', 'cerrada')`);
        await queryRunner.query(`CREATE TYPE "public"."solicitudes_carrito_canalenvio_enum" AS ENUM('whatsapp', 'email', 'formulario')`);
        await queryRunner.query(`CREATE TABLE "solicitudes_carrito" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clienteNombre" character varying(150) NOT NULL, "clienteTelefono" character varying(30) NOT NULL, "clienteEmail" character varying(150), "estado" "public"."solicitudes_carrito_estado_enum" NOT NULL DEFAULT 'nueva', "canalEnvio" "public"."solicitudes_carrito_canalenvio_enum" NOT NULL DEFAULT 'whatsapp', "notas" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1beb8c02038664c50a44908a3d6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "items_solicitud_carrito" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cantidad" integer NOT NULL, "solicitudId" uuid, "materialId" uuid, "varianteId" uuid, "comboId" uuid, CONSTRAINT "PK_2c80ecab36e0fbe0b644c393aa5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "asesores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "especialidad" character varying(150), "activo" boolean NOT NULL DEFAULT true, "usuarioId" uuid, CONSTRAINT "PK_f669d4a766f7bc473168af1e79c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "disponibilidad_asesor" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fechaHora" TIMESTAMP WITH TIME ZONE NOT NULL, "disponible" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "asesorId" uuid, CONSTRAINT "uq_asesor_fecha_hora" UNIQUE ("asesorId", "fechaHora"), CONSTRAINT "PK_c85741097f636de6970d9f63e68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."solicitudes_asesoria_estado_enum" AS ENUM('pendiente', 'llamada_realizada', 'visita_pactada', 'no_procede', 'cancelada')`);
        await queryRunner.query(`CREATE TABLE "solicitudes_asesoria" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clienteNombre" character varying(150) NOT NULL, "clienteTelefono" character varying(30) NOT NULL, "clienteEmail" character varying(150), "fechaHoraLlamada" TIMESTAMP WITH TIME ZONE NOT NULL, "estado" "public"."solicitudes_asesoria_estado_enum" NOT NULL DEFAULT 'pendiente', "notasLlamada" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "asesorId" uuid, CONSTRAINT "PK_c93b9e1e8c03a012735a9aa4824" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "materiales" ADD CONSTRAINT "FK_7012970c3aa654bf7089841c7e1" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "variantes_material" ADD CONSTRAINT "FK_f79ae563364754bf417f4e3676e" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "FK_df3d388e3dae2ee638da225410f" FOREIGN KEY ("varianteId") REFERENCES "variantes_material"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "FK_cb6886f6f3ab00b6f2abb362d2f" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "material_proveedor" ADD CONSTRAINT "FK_e2546042777b4b9fb086a91815a" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "material_proveedor" ADD CONSTRAINT "FK_492576bd41f2e138797e31da939" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "combo_items" ADD CONSTRAINT "FK_3b4ce71c9b99bd8b26ce0618408" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "combo_items" ADD CONSTRAINT "FK_fce4f4cdc97d955c175b1df5cc2" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "combo_items" ADD CONSTRAINT "FK_1c845bf14f5c56a5798990ee735" FOREIGN KEY ("varianteId") REFERENCES "variantes_material"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items_solicitud_carrito" ADD CONSTRAINT "FK_2c9e2fa0c95f2a8b580d6a206bc" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_carrito"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items_solicitud_carrito" ADD CONSTRAINT "FK_32a7b4e2c318afbd425a01cfe6a" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items_solicitud_carrito" ADD CONSTRAINT "FK_e52d542785ffb068ddc4209caa7" FOREIGN KEY ("varianteId") REFERENCES "variantes_material"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "items_solicitud_carrito" ADD CONSTRAINT "FK_f2f278c5ee2a8ccad11294781e0" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asesores" ADD CONSTRAINT "FK_f762e08a4c7d318ff73dc870127" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disponibilidad_asesor" ADD CONSTRAINT "FK_437d2ad9f6dc6324f32b0833686" FOREIGN KEY ("asesorId") REFERENCES "asesores"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "solicitudes_asesoria" ADD CONSTRAINT "FK_16de6aeb3733c680cb7cd1e42d2" FOREIGN KEY ("asesorId") REFERENCES "asesores"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "solicitudes_asesoria" DROP CONSTRAINT "FK_16de6aeb3733c680cb7cd1e42d2"`);
        await queryRunner.query(`ALTER TABLE "disponibilidad_asesor" DROP CONSTRAINT "FK_437d2ad9f6dc6324f32b0833686"`);
        await queryRunner.query(`ALTER TABLE "asesores" DROP CONSTRAINT "FK_f762e08a4c7d318ff73dc870127"`);
        await queryRunner.query(`ALTER TABLE "items_solicitud_carrito" DROP CONSTRAINT "FK_f2f278c5ee2a8ccad11294781e0"`);
        await queryRunner.query(`ALTER TABLE "items_solicitud_carrito" DROP CONSTRAINT "FK_e52d542785ffb068ddc4209caa7"`);
        await queryRunner.query(`ALTER TABLE "items_solicitud_carrito" DROP CONSTRAINT "FK_32a7b4e2c318afbd425a01cfe6a"`);
        await queryRunner.query(`ALTER TABLE "items_solicitud_carrito" DROP CONSTRAINT "FK_2c9e2fa0c95f2a8b580d6a206bc"`);
        await queryRunner.query(`ALTER TABLE "combo_items" DROP CONSTRAINT "FK_1c845bf14f5c56a5798990ee735"`);
        await queryRunner.query(`ALTER TABLE "combo_items" DROP CONSTRAINT "FK_fce4f4cdc97d955c175b1df5cc2"`);
        await queryRunner.query(`ALTER TABLE "combo_items" DROP CONSTRAINT "FK_3b4ce71c9b99bd8b26ce0618408"`);
        await queryRunner.query(`ALTER TABLE "material_proveedor" DROP CONSTRAINT "FK_492576bd41f2e138797e31da939"`);
        await queryRunner.query(`ALTER TABLE "material_proveedor" DROP CONSTRAINT "FK_e2546042777b4b9fb086a91815a"`);
        await queryRunner.query(`ALTER TABLE "movimientos_inventario" DROP CONSTRAINT "FK_cb6886f6f3ab00b6f2abb362d2f"`);
        await queryRunner.query(`ALTER TABLE "movimientos_inventario" DROP CONSTRAINT "FK_df3d388e3dae2ee638da225410f"`);
        await queryRunner.query(`ALTER TABLE "variantes_material" DROP CONSTRAINT "FK_f79ae563364754bf417f4e3676e"`);
        await queryRunner.query(`ALTER TABLE "materiales" DROP CONSTRAINT "FK_7012970c3aa654bf7089841c7e1"`);
        await queryRunner.query(`DROP TABLE "solicitudes_asesoria"`);
        await queryRunner.query(`DROP TYPE "public"."solicitudes_asesoria_estado_enum"`);
        await queryRunner.query(`DROP TABLE "disponibilidad_asesor"`);
        await queryRunner.query(`DROP TABLE "asesores"`);
        await queryRunner.query(`DROP TABLE "items_solicitud_carrito"`);
        await queryRunner.query(`DROP TABLE "solicitudes_carrito"`);
        await queryRunner.query(`DROP TYPE "public"."solicitudes_carrito_canalenvio_enum"`);
        await queryRunner.query(`DROP TYPE "public"."solicitudes_carrito_estado_enum"`);
        await queryRunner.query(`DROP TABLE "combo_items"`);
        await queryRunner.query(`DROP TABLE "combos"`);
        await queryRunner.query(`DROP TABLE "material_proveedor"`);
        await queryRunner.query(`DROP TABLE "movimientos_inventario"`);
        await queryRunner.query(`DROP TYPE "public"."movimientos_inventario_tipo_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b11ede5f2162b798dd2e8a47d6"`);
        await queryRunner.query(`DROP TABLE "variantes_material"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c793fde0d5790ea929d6bffce8"`);
        await queryRunner.query(`DROP TABLE "materiales"`);
        await queryRunner.query(`DROP TABLE "categorias"`);
        await queryRunner.query(`DROP TABLE "proveedores"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_446adfc18b35418aac32ae0b7b"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
        await queryRunner.query(`DROP TYPE "public"."usuarios_rol_enum"`);
    }

}
