import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Rol])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
