import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categoria } from './entities/categoria.entity';
import { Material } from './entities/material.entity';
import { VarianteMaterial } from './entities/variante-material.entity';
import { Combo, ComboItem } from './entities/combo.entity';
import { MaterialProveedor } from './entities/material-proveedor.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { MaterialesService } from './materiales.service';
import { MaterialesController } from './materiales.controller';
import { InventarioService } from './inventario.service';
import { InventarioController } from './inventario.controller';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { CombosService } from './combos.service';
import { CombosController } from './combos.controller';
import { MaterialProveedorService } from './material-proveedor.service';
import { MaterialProveedorController } from './material-proveedor.controller';
import { ProveedoresModule } from '../proveedores/proveedores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Categoria,
      Material,
      VarianteMaterial,
      Combo,
      ComboItem,
      MaterialProveedor,
      MovimientoInventario,
    ]),
    ProveedoresModule,
  ],
  controllers: [
    MaterialesController,
    InventarioController,
    ReportesController,
    CombosController,
    MaterialProveedorController,
  ],
  providers: [
    MaterialesService,
    InventarioService,
    ReportesService,
    CombosService,
    MaterialProveedorService,
  ],
  exports: [TypeOrmModule, MaterialesService, InventarioService],
})
export class InventarioModule {}
