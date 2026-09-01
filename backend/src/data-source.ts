import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// DataSource usado exclusivamente por el CLI de TypeORM
// (migration:generate, migration:run, migration:revert).
// La app en runtime usa su propia configuración en app.module.ts.
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
