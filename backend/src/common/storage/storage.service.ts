import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

export type TipoImagen = 'jpg' | 'png' | 'webp';

/** Detecta el tipo REAL por los primeros bytes (no confía en el nombre ni en el mime del cliente). */
export function detectarImagen(buf: Buffer): TipoImagen | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

/**
 * Almacenamiento de imágenes. Hoy: carpeta local (UPLOADS_DIR), servida en /uploads.
 * Devuelve una ruta relativa ("/uploads/<id>.webp"); el frontend la completa con la URL
 * de la API. Para pasar a Cloudflare R2 / S3 solo hay que cambiar `guardarImagen`
 * para que suba el archivo y devuelva la URL absoluta — el resto no cambia.
 */
@Injectable()
export class StorageService {
  readonly directorio = resolve(process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'));

  async guardarImagen(buf: Buffer): Promise<{ url: string }> {
    const tipo = detectarImagen(buf);
    if (!tipo) {
      throw new BadRequestException('El archivo no es una imagen válida. Usa JPG, PNG o WebP.');
    }
    await fs.mkdir(this.directorio, { recursive: true });
    const nombre = `${randomUUID()}.${tipo}`;
    await fs.writeFile(join(this.directorio, nombre), buf, { flag: 'wx' });
    return { url: `/uploads/${nombre}` };
  }
}
