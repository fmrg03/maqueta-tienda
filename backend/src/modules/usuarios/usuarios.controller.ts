import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from './entities/usuario.entity';

@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(RolUsuario.ADMIN)
  async create(@Body() dto: CreateUsuarioDto): Promise<UsuarioResponseDto> {
    const usuario = await this.usuariosService.create(dto);
    return new UsuarioResponseDto(usuario);
  }

  @Get()
  @Roles(RolUsuario.ADMIN)
  async findAll(): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usuariosService.findAll();
    return usuarios.map((u) => new UsuarioResponseDto(u));
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UsuarioResponseDto> {
    const usuario = await this.usuariosService.findOne(id);
    return new UsuarioResponseDto(usuario);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    const usuario = await this.usuariosService.update(id, dto);
    return new UsuarioResponseDto(usuario);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  async desactivar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usuariosService.desactivar(id);
  }
}
