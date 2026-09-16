import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sem `test.globals` habilitado (preferimos imports explícitos de 'vitest'
// nos arquivos de teste), então o auto-cleanup do Testing Library não é
// detectado automaticamente — registramos aqui, uma vez, para todos os
// arquivos de teste.
afterEach(() => {
  cleanup();
});

// Story 4.1 (Epic 4, AD-6): `@dnd-kit` referencia `ResizeObserver` do
// browser ao registrar Draggable/Droppable — jsdom não implementa essa API.
// Migração Epic 4 retro item 11 (`@dnd-kit/core`+`@dnd-kit/sortable`, no
// lugar do par `@dnd-kit/react`+`@dnd-kit/dom` pre-1.0): a lib nova já trata
// `ResizeObserver` ausente com um guard interno (não lança) — o stub aqui
// deixou de ser estritamente necessário, mas continua inofensivo mantê-lo
// (defesa contra qualquer outro uso futuro, mesmo espírito de sempre: jsdom
// não tem layout real, isto nunca observa nada de verdade).
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
