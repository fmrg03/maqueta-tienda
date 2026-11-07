import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '../usuarios/entities/usuario.entity';
import { ImportacionService } from './importacion.service';
import { ImportarProductosDto } from './dto/importar-productos.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@ApiTags('Inventario')
@ApiBearerAuth('access-token')
@Controller('api/v1/inventario/importacion')
export class ImportacionController {
  constructor(private readonly importacion: ImportacionService) {}

  @Get('plantilla')
  async plantilla(@Res() res: Response) {
    const buffer = await this.importacion.plantilla();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"');
    res.send(buffer);
  }

  // Lee el Excel y devuelve las filas validadas; no guarda nada.
  @Post('excel')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async excel(@UploadedFile() archivo?: { buffer: Buffer }, @Query('proveedorId') proveedorId?: string) {
    if (!archivo?.buffer) throw new BadRequestException('Falta el archivo.');
    return this.importacion.leerExcel(archivo.buffer, proveedorId || undefined);
  }

  // Valida filas escritas en la tabla de la pantalla.
  @Post('validar')
  validar(@Body() dto: ImportarProductosDto) {
    return this.importacion.validar(dto.filas, dto.proveedorId);
  }

  @Post()
  importar(@Body() dto: ImportarProductosDto, @Req() request: any) {
    return this.importacion.importar(dto, request.user?.id);
  }
}
