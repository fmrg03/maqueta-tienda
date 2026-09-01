import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProtegidoAUsuarios1788293392554 implements MigrationInterface {
    name = 'AddProtegidoAUsuarios1788293392554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuarios" ADD "protegido" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "protegido"`);
    }

}
