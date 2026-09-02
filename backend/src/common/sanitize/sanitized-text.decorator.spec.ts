import { plainToInstance } from 'class-transformer';
import { SanitizedText } from './sanitized-text.decorator';

class DtoDePrueba {
  @SanitizedText()
  notas: string;
}

describe('SanitizedText', () => {
  it('elimina tags de script', () => {
    const instancia = plainToInstance(DtoDePrueba, {
      notas: 'Hola <script>alert("xss")</script> mundo',
    });

    expect(instancia.notas).toBe('Hola  mundo');
  });

  it('elimina cualquier tag HTML, no solo script', () => {
    const instancia = plainToInstance(DtoDePrueba, {
      notas: '<b>importante</b>: llamar antes de las 5pm',
    });

    expect(instancia.notas).toBe('importante: llamar antes de las 5pm');
  });

  it('deja texto plano sin cambios', () => {
    const instancia = plainToInstance(DtoDePrueba, {
      notas: 'Cliente interesado en remodelación de cocina',
    });

    expect(instancia.notas).toBe('Cliente interesado en remodelación de cocina');
  });

  it('no rompe si el valor no es string', () => {
    const instancia = plainToInstance(DtoDePrueba, { notas: undefined });

    expect(instancia.notas).toBeUndefined();
  });
});
