import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { RlsInterceptor } from './rls.interceptor';
import { getRlsManager } from './request-context';

describe('RlsInterceptor', () => {
  let interceptor: RlsInterceptor;
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    query: jest.Mock;
    manager: object;
  };
  let dataSource: { createQueryRunner: jest.Mock };

  const buildContext = (user?: { id: string; rol: string }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
      manager: {},
    };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };

    interceptor = new RlsInterceptor(dataSource as any);
  });

  it('abre y commitea una transacción para una request exitosa', async () => {
    const next: CallHandler = { handle: () => of('resultado') };

    const resultado = await interceptor.intercept(buildContext(), next).toPromise();

    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
    expect(resultado).toBe('resultado');
  });

  it('setea app.rol y app.usuario_id vía set_config cuando hay usuario autenticado', async () => {
    const next: CallHandler = { handle: () => of('ok') };
    const usuario = { id: 'user-1', rol: 'asesor' };

    await interceptor.intercept(buildContext(usuario), next).toPromise();

    expect(queryRunner.query).toHaveBeenCalledWith(
      `SELECT set_config('app.rol', $1, true)`,
      ['asesor'],
    );
    expect(queryRunner.query).toHaveBeenCalledWith(
      `SELECT set_config('app.usuario_id', $1, true)`,
      ['user-1'],
    );
  });

  it('no setea variables de sesión cuando el endpoint es público (sin usuario)', async () => {
    const next: CallHandler = { handle: () => of('ok') };

    await interceptor.intercept(buildContext(undefined), next).toPromise();

    expect(queryRunner.query).not.toHaveBeenCalled();
  });

  it('hace rollback y libera la conexión si el handler lanza un error', async () => {
    const error = new Error('algo falló');
    const next: CallHandler = { handle: () => throwError(() => error) };

    await expect(
      interceptor.intercept(buildContext(), next).toPromise(),
    ).rejects.toThrow('algo falló');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('expone el manager transaccional a getRlsManager() durante el handler', async () => {
    let managerDentroDelHandler: unknown;
    const next: CallHandler = {
      handle: () => {
        managerDentroDelHandler = getRlsManager();
        return of('ok');
      },
    };

    await interceptor.intercept(buildContext(), next).toPromise();

    expect(managerDentroDelHandler).toBe(queryRunner.manager);
    // Fuera del handler, no debe quedar contexto activo (aislamiento entre requests).
    expect(getRlsManager()).toBeUndefined();
  });
});
