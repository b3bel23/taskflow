import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sem `test.globals` habilitado (preferimos imports explícitos de 'vitest'
// nos arquivos de teste), então o auto-cleanup do Testing Library não é
// detectado automaticamente — registramos aqui, uma vez, para todos os
// arquivos de teste.
afterEach(() => {
  cleanup();
});
