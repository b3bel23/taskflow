import { afterEach, describe, expect, it } from 'vitest';
import { clearDragHandles, getDragHandle, isDragHandleFocused, registerDragHandle } from './dragHandleRegistry';

// Story 4.2 (Epic 4), boundary "Foco": este registro é o que permite
// `WeekView` reencontrar, depois de um cruzamento de grupo (a alça antiga
// desmonta, uma alça nova remonta em outra zona/`DayColumn`), o nó DOM atual
// da alça de uma tarefa pelo `id` dela — testado diretamente aqui, sem
// precisar simular um gesto físico de arraste (inviável sob jsdom, mesma
// limitação conhecida do resto da suíte).
describe('dragHandleRegistry', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('getDragHandle: null para uma tarefa nunca registrada', () => {
    expect(getDragHandle('nunca-registrada')).toBeNull();
  });

  it('registerDragHandle + getDragHandle: devolve o mesmo nó DOM registrado', () => {
    const handle = document.createElement('span');

    registerDragHandle('t1', handle);

    expect(getDragHandle('t1')).toBe(handle);
  });

  it('registerDragHandle(id, null): não apaga um registro anterior (evita corrida entre desmonte antigo e remonte novo no mesmo commit)', () => {
    const handle = document.createElement('span');
    registerDragHandle('t1', handle);

    registerDragHandle('t1', null);

    expect(getDragHandle('t1')).toBe(handle);
  });

  it('registerDragHandle: um id novo sobrescreve o nó DOM anterior do mesmo id (alça remontada após cruzar grupo)', () => {
    const oldHandle = document.createElement('span');
    const newHandle = document.createElement('span');
    registerDragHandle('t1', oldHandle);

    registerDragHandle('t1', newHandle);

    expect(getDragHandle('t1')).toBe(newHandle);
  });

  describe('isDragHandleFocused', () => {
    it('true quando a alça registrada é o elemento com foco', () => {
      const handle = document.createElement('span');
      handle.tabIndex = 0;
      document.body.appendChild(handle);
      handle.focus();
      registerDragHandle('t1', handle);

      expect(isDragHandleFocused('t1')).toBe(true);
    });

    it('false quando a alça registrada existe mas não tem foco', () => {
      const handle = document.createElement('span');
      document.body.appendChild(handle);
      registerDragHandle('t1', handle);

      expect(isDragHandleFocused('t1')).toBe(false);
    });

    it('false para uma tarefa nunca registrada', () => {
      expect(isDragHandleFocused('nunca-registrada')).toBe(false);
    });
  });
});

// Retro Epic 4, item 17: o registro é module-scope; `src/test/setup.ts` o
// esvazia após cada teste. Os dois testes abaixo formam um par DEPENDENTE DA
// ORDEM de propósito — o primeiro registra um id, o segundo (mesmo arquivo,
// mesmo módulo) exige que ele já não exista. Se o `afterEach` do setup
// deixar de limpar o registro, o segundo falha.
describe('isolamento do registro entre testes (setup global)', () => {
  it('1/2 — registra um id e o deixa "esquecido" no registro', () => {
    registerDragHandle('id-reaproveitado', document.createElement('span'));

    expect(getDragHandle('id-reaproveitado')).not.toBeNull();
  });

  it('2/2 — o id do teste anterior NÃO vazou para este', () => {
    expect(getDragHandle('id-reaproveitado')).toBeNull();
  });
});

describe('clearDragHandles', () => {
  it('remove todas as entradas de uma vez', () => {
    registerDragHandle('a', document.createElement('span'));
    registerDragHandle('b', document.createElement('span'));

    clearDragHandles();

    expect(getDragHandle('a')).toBeNull();
    expect(getDragHandle('b')).toBeNull();
  });
});
