import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/**
 * Aplica a cualquier campo de texto libre que un usuario final escriba y
 * que después se muestre en el panel admin (notas, descripciones) — ver
 * ARCHITECTURE.md sección 5. Elimina cualquier tag HTML/script antes de
 * que el valor llegue al service, así que ni siquiera hace falta que
 * quien renderice el dato en el frontend recuerde escaparlo.
 *
 * Corre en la fase de transformación del ValidationPipe (`transform:
 * true` está seteado globalmente en main.ts), antes de las validaciones
 * de class-validator — así un intento de inyectar `<script>` nunca
 * llega a guardarse, incluso si el resto de la validación del campo
 * pasaría igual (es texto libre, no hay mucho más que validar en forma).
 */
export function SanitizedText(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  });
}
