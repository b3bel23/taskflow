import { describe, expect, it } from 'vitest';
import { pickTargetColumn, weekKeyboardCoordinates, type Candidate, type RectLike } from './keyboardCoordinates';

// Layouts reais do app, como retângulos: 7 colunas numa linha (desktop), 4+3
// (tablet, duas linhas) e 1 coluna empilhada (celular).
const col = (left: number, top: number, width = 150, height = 300): RectLike => ({ left, top, width, height });

const desktop: Candidate<string>[] = Array.from({ length: 7 }, (_, i) => ({ id: `d${i}`, rect: col(i * 170, 0) }));
const tablet: Candidate<string>[] = Array.from({ length: 7 }, (_, i) => ({
  id: `t${i}`,
  rect: col((i % 4) * 190, Math.floor(i / 4) * 320, 180),
}));
const phone: Candidate<string>[] = Array.from({ length: 7 }, (_, i) => ({
  id: `p${i}`,
  rect: col(0, i * 200, 340, 180 + (i % 3) * 40),
}));

const others = <Id>(all: Candidate<Id>[], id: Id) => all.filter((c) => c.id !== id);
const rectOf = <Id>(all: Candidate<Id>[], id: Id) => all.find((c) => c.id === id)!.rect;

describe('pickTargetColumn', () => {
  describe('desktop: 7 colunas na mesma linha', () => {
    it('direita e esquerda vão para a coluna vizinha', () => {
      expect(pickTargetColumn('right', rectOf(desktop, 'd2'), others(desktop, 'd2'))).toBe('d3');
      expect(pickTargetColumn('left', rectOf(desktop, 'd2'), others(desktop, 'd2'))).toBe('d1');
    });

    it('nas pontas não dá a volta: continua sem destino', () => {
      expect(pickTargetColumn('left', rectOf(desktop, 'd0'), others(desktop, 'd0'))).toBeNull();
      expect(pickTargetColumn('right', rectOf(desktop, 'd6'), others(desktop, 'd6'))).toBeNull();
    });

    it('cima e baixo não têm para onde ir numa linha só', () => {
      expect(pickTargetColumn('down', rectOf(desktop, 'd3'), others(desktop, 'd3'))).toBeNull();
      expect(pickTargetColumn('up', rectOf(desktop, 'd3'), others(desktop, 'd3'))).toBeNull();
    });
  });

  describe('tablet: 4 colunas + 3 na segunda linha', () => {
    it('direita fica na MESMA linha (não pula para a de baixo)', () => {
      expect(pickTargetColumn('right', rectOf(tablet, 't0'), others(tablet, 't0'))).toBe('t1');
      expect(pickTargetColumn('right', rectOf(tablet, 't4'), others(tablet, 't4'))).toBe('t5');
    });

    it('baixo desce para a coluna logo abaixo, e cima sobe de volta', () => {
      expect(pickTargetColumn('down', rectOf(tablet, 't1'), others(tablet, 't1'))).toBe('t5');
      expect(pickTargetColumn('up', rectOf(tablet, 't5'), others(tablet, 't5'))).toBe('t1');
    });

    it('no fim da primeira linha, direita não cai na segunda linha', () => {
      expect(pickTargetColumn('right', rectOf(tablet, 't3'), others(tablet, 't3'))).toBeNull();
    });

    it('baixo de uma coluna sem vizinha exata embaixo escolhe a mais próxima', () => {
      // t3 (última da 1ª linha) não tem coluna embaixo na 2ª (só 3 nela): vai para t6.
      expect(pickTargetColumn('down', rectOf(tablet, 't3'), others(tablet, 't3'))).toBe('t6');
    });
  });

  describe('celular: 1 coluna empilhada', () => {
    it('baixo e cima navegam entre os dias em ordem', () => {
      expect(pickTargetColumn('down', rectOf(phone, 'p0'), others(phone, 'p0'))).toBe('p1');
      expect(pickTargetColumn('down', rectOf(phone, 'p3'), others(phone, 'p3'))).toBe('p4');
      expect(pickTargetColumn('up', rectOf(phone, 'p3'), others(phone, 'p3'))).toBe('p2');
    });

    it('esquerda e direita não fazem nada (não há coluna ao lado)', () => {
      expect(pickTargetColumn('right', rectOf(phone, 'p2'), others(phone, 'p2'))).toBeNull();
      expect(pickTargetColumn('left', rectOf(phone, 'p2'), others(phone, 'p2'))).toBeNull();
    });
  });

  it('sem candidatas: null', () => {
    expect(pickTargetColumn('right', col(0, 0), [])).toBeNull();
  });
});

// O `coordinateGetter` completo, com um contexto mínimo do @dnd-kit.
describe('weekKeyboardCoordinates', () => {
  type Args = Parameters<typeof weekKeyboardCoordinates>[1];

  function run(key: string, options: { over?: string | null; card?: RectLike } = {}) {
    const rects = new Map(desktop.map((c) => [c.id, c.rect]));
    const containers = {
      getEnabled: () => desktop.map((c) => ({ id: c.id })),
    };
    const event = new KeyboardEvent('keydown', { code: key, cancelable: true });
    const card = options.card ?? { left: 175, top: 20, width: 140, height: 80 };
    const context = {
      active: { id: 'a' },
      collisionRect: card,
      droppableRects: rects,
      droppableContainers: containers,
      over: options.over === null ? null : { id: options.over ?? 'd1' },
    };
    const result = weekKeyboardCoordinates(event, {
      active: 'a',
      currentCoordinates: { x: card.left, y: card.top },
      context,
    } as unknown as Args);
    return { result, event };
  }

  it('seta para a direita: devolve a posição do Card centralizado na coluna seguinte', () => {
    const { result, event } = run('ArrowRight', { over: 'd1' });

    // d2 = left 340, width 150 → centro 415; Card 140 de largura → x = 345.
    // Verticalmente: coluna 300 de altura, Card 80 → y = 110.
    expect(result).toEqual({ x: 345, y: 110 });
    expect(event.defaultPrevented).toBe(true);
  });

  it('seta para a esquerda vai para a coluna anterior', () => {
    expect(run('ArrowLeft', { over: 'd1' }).result).toEqual({ x: 5, y: 110 });
  });

  it('na ponta, sem destino: devolve undefined (o Card não sai do lugar)', () => {
    expect(run('ArrowLeft', { over: 'd0' }).result).toBeUndefined();
  });

  it('tecla que não é seta: ignora e não bloqueia o evento', () => {
    const { result, event } = run('KeyA');
    expect(result).toBeUndefined();
    expect(event.defaultPrevented).toBe(false);
  });

  it('sem `over` ainda, descobre a coluna atual pela posição do Card', () => {
    // Card com centro dentro de d1 (left 170..320).
    expect(run('ArrowRight', { over: null, card: { left: 175, top: 20, width: 140, height: 80 } }).result).toEqual({
      x: 345,
      y: 110,
    });
  });
});
