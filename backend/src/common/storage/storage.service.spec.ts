import { BadRequestException } from '@nestjs/common';
import { mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { detectarImagen, StorageService } from './storage.service';

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);

describe('StorageService', () => {
  it('detecta el tipo real por los bytes', () => {
    expect(detectarImagen(JPG)).toBe('jpg');
    expect(detectarImagen(PNG)).toBe('png');
    expect(detectarImagen(WEBP)).toBe('webp');
    expect(detectarImagen(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectarImagen(Buffer.from('GIF89a....'))).toBeNull();
  });

  it('guarda con nombre aleatorio y devuelve ruta relativa; rechaza lo que no es imagen', async () => {
    process.env.UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'up-'));
    const s = new StorageService();
    const { url } = await s.guardarImagen(WEBP);
    expect(url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.webp$/);
    expect(existsSync(join(s.directorio, url.replace('/uploads/', '')))).toBe(true);
    await expect(s.guardarImagen(Buffer.from('<svg onload=alert(1)>'))).rejects.toThrow(BadRequestException);
    delete process.env.UPLOADS_DIR;
  });
});
