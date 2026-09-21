import { afterEach, describe, expect, it, vi } from 'vitest';
import { newTaskId } from './newTaskId';

const realRandomUUID = crypto.randomUUID.bind(crypto);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newTaskId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('com crypto.randomUUID (contexto seguro): usa-o', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-2222-4333-8444-555555555555' });

    expect(newTaskId()).toBe('11111111-2222-4333-8444-555555555555');
  });

  it('sem randomUUID (http fora de localhost): cai em getRandomValues e ainda devolve um UUID v4', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.forEach((_, i) => {
          bytes[i] = (i * 37 + 11) % 256;
        });
        return bytes;
      },
    });

    expect(newTaskId()).toMatch(UUID_V4);
  });

  it('sem nenhuma API de crypto: cai em Math.random e ainda devolve um UUID v4', () => {
    vi.stubGlobal('crypto', undefined);

    expect(newTaskId()).toMatch(UUID_V4);
  });

  it('ids sucessivos nunca se repetem, em qualquer um dos caminhos', () => {
    for (const stub of [{ randomUUID: () => realRandomUUID() }, {}, undefined]) {
      vi.stubGlobal('crypto', stub);
      const ids = new Set(Array.from({ length: 500 }, () => newTaskId()));
      expect(ids.size).toBe(500);
      vi.unstubAllGlobals();
    }
  });
});
