import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { firstValueFrom, from, Observable } from 'rxjs';
import { rlsStorage } from './request-context';

interface UsuarioAutenticado {
  id: string;
  rol: string;
}

/**
 * Envuelve cada request HTTP en una transacción de Postgres y, si hay un
 * usuario autenticado (poblado por JwtAuthGuard antes de que corran los
 * interceptors), setea `app.rol` y `app.usuario_id` como variables de
 * sesión locales a esa transacción — el contexto que leen las políticas
 * de RLS creadas en la migración AddRowLevelSecurity.
 *
 * Usa `set_config(..., true)` en vez de `SET LOCAL app.x = '<valor>'`
 * con interpolación de string: set_config acepta el valor como parámetro
 * bindeado, evitando cualquier riesgo de inyección SQL a través del rol
 * o del id del usuario.
 *
 * Los servicios que tocan tablas con RLS (UsuariosService, CarritoService,
 * AsesoriasService) obtienen su repositorio vía `getRlsManager()` cuando
 * hay un contexto activo, y caen de vuelta al repositorio inyectado por
 * constructor cuando no (tests unitarios, scripts fuera de un request).
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const usuario: UsuarioAutenticado | undefined = request.user;

    return from(this.ejecutarConContextoRls(usuario, next));
  }

  private async ejecutarConContextoRls(
    usuario: UsuarioAutenticado | undefined,
    next: CallHandler,
  ): Promise<unknown> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (usuario) {
        await queryRunner.query(`SELECT set_config('app.rol', $1, true)`, [
          usuario.rol,
        ]);
        await queryRunner.query(
          `SELECT set_config('app.usuario_id', $1, true)`,
          [usuario.id],
        );
      }

      const resultado = await rlsStorage.run(
        { manager: queryRunner.manager },
        () => firstValueFrom(next.handle()),
      );

      await queryRunner.commitTransaction();
      return resultado;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
