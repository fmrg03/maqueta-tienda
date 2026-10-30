import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ConsultaUsuariosDto } from './dto/consulta-usuarios.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from './entities/usuario.entity';

@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Usuarios')
@ApiBearerAuth('access-token')
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
  async findAll(@Query() consulta: ConsultaUsuariosDto): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usuariosService.findAll(consulta);
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
    @Req() request: any,
  ): Promise<UsuarioResponseDto> {
    const usuario = await this.usuariosService.update(id, dto, request.user?.id);
    return new UsuarioResponseDto(usuario);
  }

  @Post(':id/restablecer-password')
  @Roles(RolUsuario.ADMIN)
  restablecerPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestablecerPasswordDto,
    @Req() request: any,
  ): Promise<{ passwordTemporal?: string }> {
    return this.usuariosService.restablecerPassword(id, request.user?.id, dto.password);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  async desactivar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usuariosService.desactivar(id);
  }
}
