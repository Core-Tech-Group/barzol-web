import { describe, expect, it } from 'vitest';
import {
  comparacionSegura,
  resolverNivelAcceso,
} from '../../../src/shared/lib/diagnostico/acceso';

describe('SPEC-903 · resolverNivelAcceso', () => {
  it.each([
    ['[TEST-401] sin configurar, sin presentar', undefined, null, 'reducido'],
    ['[TEST-402] sin configurar, presentando algo', undefined, 'loquesea', 'reducido'],
    ['[TEST-403] configurado y coincide', 's3cr3t0', 's3cr3t0', 'completo'],
    ['[TEST-404] configurado, cabecera ausente', 's3cr3t0', null, 'oculto'],
    ['[TEST-405] configurado, valor distinto', 's3cr3t0', 'otro', 'oculto'],
    ['[TEST-406] configurado, solo el prefijo', 's3cr3t0', 's3c', 'oculto'],
    ['[TEST-407] configurado, con espacios alrededor', 's3cr3t0', ' s3cr3t0 ', 'oculto'],
    ['[TEST-408] token configurado vacío', '', null, 'reducido'],
    ['[TEST-409] token configurado solo con espacios', '   ', null, 'reducido'],
  ])('%s (REQ-942..946)', (_caso, tokenConfigurado, tokenPresentado, esperado) => {
    // Act
    const nivel = resolverNivelAcceso({ tokenConfigurado, tokenPresentado });

    // Assert
    expect(nivel).toBe(esperado);
  });

  it('[INV-2] nunca concede acceso completo sin token configurado', () => {
    // Un secreto mal cargado suele quedar vacío, no ausente. Si alguna de estas
    // entradas devolviera 'completo', bastaría con no configurar nada para
    // verlo todo — que es justo el estado que esta SPEC viene a cerrar.
    const sinConfigurar = [undefined, '', '   '];
    const presentados = [null, '', 'loquesea', 's3cr3t0'];

    for (const tokenConfigurado of sinConfigurar) {
      for (const tokenPresentado of presentados) {
        expect(resolverNivelAcceso({ tokenConfigurado, tokenPresentado })).not.toBe('completo');
      }
    }
  });
});

describe('SPEC-903 · comparacionSegura', () => {
  it.each([
    ['[TEST-410] iguales', 'abc', 'abc', true],
    ['[TEST-411] distintas, misma longitud', 'abc', 'abd', false],
    ['[TEST-412] longitudes distintas', 'abc', 'abcd', false],
    ['[TEST-413] ambas vacías', '', '', true],
  ])('%s (REQ-945, INV-3)', (_caso, a, b, esperado) => {
    expect(comparacionSegura(a, b)).toBe(esperado);
  });

  it('[TEST-414] la diferencia pesa igual al principio que al final (REQ-945)', () => {
    // No se miden tiempos: en un runner compartido eso produce tests que fallan
    // al azar, y un test que falla al azar se acaba borrando. Lo que se
    // comprueba es que ninguna posición recibe trato especial.
    expect(comparacionSegura('aaaa', 'baaa')).toBe(false);
    expect(comparacionSegura('aaaa', 'aaab')).toBe(false);
    expect(comparacionSegura('aaaa', 'aaaa')).toBe(true);
  });
});
