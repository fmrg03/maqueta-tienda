import { Injectable, Logger } from '@nestjs/common';

/**
 * Punto de integración con la cola BullMQ + API de WhatsApp definida en
 * ARCHITECTURE.md (sección Infraestructura). Por ahora solo loguea; el
 * wiring real a Redis/BullMQ y al proveedor de WhatsApp se hace en la
 * fase de infraestructura, sin cambiar esta interfaz pública.
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  async notificarNuevaSolicitudCarrito(solicitudId: string): Promise<void> {
    this.logger.log(`Encolar notificación de nueva SolicitudCarrito ${solicitudId}`);
  }

  async notificarNuevaSolicitudAsesoria(solicitudId: string): Promise<void> {
    this.logger.log(`Encolar notificación de nueva SolicitudAsesoria ${solicitudId}`);
  }
}
