import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sem `test.globals` habilitado (preferimos imports explícitos de 'vitest'
// nos arquivos de teste), então o auto-cleanup do Testing Library não é
// detectado automaticamente — registramos aqui, uma vez, para todos os
// arquivos de teste.
afterEach(() => {
  cleanup();
});

// Story 4.1 (Epic 4, AD-6): `@dnd-kit/dom` referencia `ResizeObserver` do
// browser incondicionalmente ao registrar qualquer Draggable/Droppable
// (mesmo sem nenhum arraste em andamento) — jsdom não implementa essa API.
// Sem este stub, só *renderizar* uma coluna com Cards arrastáveis já
// lançaria `ReferenceError: ResizeObserver is not defined` em todo teste
// desta suíte, inclusive os que nada têm a ver com arraste. Não observamos
// nada de verdade (jsdom não tem layout real) — só evita o erro.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
