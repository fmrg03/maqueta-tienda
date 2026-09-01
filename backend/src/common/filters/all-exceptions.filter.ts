import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Formato de error único para toda la API — el frontend siempre recibe
 * la misma forma, sin importar si el error viene de un ValidationPipe,
 * una excepción de negocio (NotFoundException, ConflictException, etc.)
 * o un error no controlado de la base de datos.
 *
 * {
 *   "statusCode": 404,
 *   "error": "Not Found",
 *   "message": "Material abc no encontrado",
 *   "path": "/api/v1/materiales/abc",
 *   "timestamp": "2026-09-01T12:00:00.000Z"
 * }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } = this.resolverExcepcion(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Errores 5xx sí se loguean completos server-side (con stack) —
      // pero el cliente nunca ve detalles internos (ver resolverExcepcion).
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private resolverExcepcion(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // El ValidationPipe de Nest lanza BadRequestException con un objeto
      // { message: string[], error: 'Bad Request', statusCode: 400 } —
      // lo aprovechamos tal cual para no perder el detalle por campo.
      if (typeof response === 'object' && response !== null) {
        const objetoRespuesta = response as Record<string, unknown>;
        return {
          statusCode: status,
          error:
            (objetoRespuesta.error as string) ??
            HttpStatus[status] ??
            'Error',
          message: (objetoRespuesta.message as string | string[]) ?? exception.message,
        };
      }

      return { statusCode: status, error: HttpStatus[status] ?? 'Error', message: exception.message };
    }

    // Errores de TypeORM/Postgres no controlados (constraint violado, RLS,
    // etc.) — nunca se expone el mensaje crudo de la DB al cliente, solo
    // se loguea server-side; el cliente recibe un 500 genérico.
    if (exception instanceof QueryFailedError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Ocurrió un error procesando la solicitud',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Ocurrió un error inesperado',
    };
  }
}
