import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { method: string; url: string };
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = { method: 'GET', url: '/api/v1/materiales/123' };

    host = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('formatea una NotFoundException con statusCode 404', () => {
    filter.catch(new NotFoundException('Material 123 no encontrado'), host);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: 'Material 123 no encontrado',
        path: '/api/v1/materiales/123',
      }),
    );
  });

  it('formatea una ConflictException con statusCode 409', () => {
    filter.catch(new ConflictException('Ya existe ese SKU'), host);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, message: 'Ya existe ese SKU' }),
    );
  });

  it('preserva el array de mensajes de un ValidationPipe (BadRequestException)', () => {
    const excepcionValidacion = new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: ['nombre must be a string', 'precioVenta must be a number'],
    });

    filter.catch(excepcionValidacion, host);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['nombre must be a string', 'precioVenta must be a number'],
      }),
    );
  });

  it('nunca expone el mensaje crudo de un QueryFailedError al cliente', () => {
    const errorDb = new QueryFailedError(
      'INSERT INTO usuarios ...',
      [],
      new Error('new row violates row-level security policy for table "usuarios"'),
    );

    filter.catch(errorDb, host);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const cuerpoEnviado = mockResponse.json.mock.calls[0][0];
    expect(cuerpoEnviado.message).not.toContain('row-level security');
    expect(cuerpoEnviado.message).not.toContain('INSERT INTO');
  });

  it('respeta el statusCode de errores 4xx crudos de middleware (ej. PayloadTooLargeError)', () => {
    const errorPayloadGrande = new Error('request entity too large') as Error & {
      status: number;
    };
    errorPayloadGrande.status = 413;

    filter.catch(errorPayloadGrande, host);

    expect(mockResponse.status).toHaveBeenCalledWith(413);
    const cuerpoEnviado = mockResponse.json.mock.calls[0][0];
    expect(cuerpoEnviado.message).toBe('request entity too large');
  });

  it('devuelve 500 genérico para cualquier error no controlado', () => {
    filter.catch(new Error('algo inesperado en runtime'), host);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const cuerpoEnviado = mockResponse.json.mock.calls[0][0];
    expect(cuerpoEnviado.message).not.toContain('algo inesperado en runtime');
    expect(cuerpoEnviado.error).toBe('Internal Server Error');
  });

  it('siempre incluye path y timestamp', () => {
    filter.catch(new NotFoundException('x'), host);

    const cuerpoEnviado = mockResponse.json.mock.calls[0][0];
    expect(cuerpoEnviado.path).toBe('/api/v1/materiales/123');
    expect(typeof cuerpoEnviado.timestamp).toBe('string');
    expect(new Date(cuerpoEnviado.timestamp).toString()).not.toBe('Invalid Date');
  });
});
