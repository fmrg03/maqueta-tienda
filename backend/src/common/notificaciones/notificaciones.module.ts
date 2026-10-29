import { Module } from '@nestjs/common';
import { CallMeBotService } from './callmebot.service';
import { EmailService } from './email.service';
import { NotificacionesService } from './notificaciones.service';

@Module({
  providers: [EmailService, CallMeBotService, NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
