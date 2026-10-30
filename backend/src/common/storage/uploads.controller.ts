import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolUsuario } from '../../modules/usuarios/entities/usuario.entity';
import { StorageService } from './storage.service';

export const MAX_BYTES_IMAGEN = 3 * 1024 * 1024;

@ApiTags('Uploads')
@Controller('api/v1/uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  // El panel ya reduce la foto antes de enviarla (~200 KB); 3 MB es solo un tope de seguridad.
  @Post('imagenes')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: MAX_BYTES_IMAGEN, files: 1 } }))
  async subir(@UploadedFile() archivo?: { buffer: Buffer }) {
    if (!archivo?.buffer) throw new BadRequestException('Falta el archivo de la imagen.');
    return this.storage.guardarImagen(archivo.buffer);
  }
}
