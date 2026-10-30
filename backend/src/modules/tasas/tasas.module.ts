import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasaCambio } from './entities/tasa-cambio.entity';
import { TasasService } from './tasas.service';
import { TasasController } from './tasas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TasaCambio])],
  controllers: [TasasController],
  providers: [TasasService],
  exports: [TasasService],
})
export class TasasModule {}
