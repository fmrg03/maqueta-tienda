import { Module } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';
import { CatalogoController } from './catalogo.controller';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [InventarioModule], // reutiliza las entidades ya registradas ahí
  controllers: [CatalogoController],
  providers: [CatalogoService],
})
export class CatalogoModule {}
