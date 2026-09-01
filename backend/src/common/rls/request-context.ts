import { AsyncLocalStorage } from 'async_hooks';
import { EntityManager } from 'typeorm';

export interface RlsContext {
  manager: EntityManager;
}

export const rlsStorage = new AsyncLocalStorage<RlsContext>();

/**
 * Devuelve el EntityManager transaccional del request actual (con el
 * contexto de RLS ya seteado vía SET LOCAL), o undefined si no hay uno
 * activo — por ejemplo en tests unitarios, donde los servicios deben
 * caer de vuelta al repositorio inyectado normalmente.
 */
export function getRlsManager(): EntityManager | undefined {
  return rlsStorage.getStore()?.manager;
}
