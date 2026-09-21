import type { KeyboardCoordinateGetter } from '@dnd-kit/core';

// Arraste por teclado entre colunas de dia (AD-6, UX-DR13: "equivalente
// completo por teclado"). Existe porque o `sortableKeyboardCoordinates` de
// `@dnd-kit/sortable`, usado antes, NÃO funciona aqui: ele só calcula um
// destino quando o item arrastado também é um item "sortable" registrado
// (`droppableContainers.get(active.id)`), e os Cards são só `useDraggable`.
// Resultado, comprovado em navegador real (E2E): o arraste ativava, mas as
// setas nunca moviam o Card — ele era solto no mesmo dia. Esta versão usa só
// a geometria das colunas, então funciona em qualquer disposição do layout
// (7 colunas, 4 no tablet, 1 empilhada no celular).

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Candidate<Id> {
  id: Id;
  rect: RectLike;
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const center = (rect: RectLike) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

// Escolhe a coluna vizinha na direção pedida: a mais próxima ao longo do eixo
// da seta que esteja de fato "além" da atual, penalizando o desvio no eixo
// cruzado (para "direita" preferir a coluna da MESMA linha, não a da linha de
// baixo). Sem coluna nessa direção → `null` (o Card fica onde está; não há
// "dar a volta" para o outro lado).
export function pickTargetColumn<Id>(direction: Direction, current: RectLike, candidates: Candidate<Id>[]): Id | null {
  const from = center(current);
  let best: Id | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const to = center(candidate.rect);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const along = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy;
    if (along <= 1) {
      continue;
    }
    const across = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = candidate.id;
    }
  }
  return best;
}

// `coordinateGetter` do `KeyboardSensor`: devolve a posição (canto superior
// esquerdo) que o Card arrastado deve ocupar — centralizado na coluna alvo,
// o que faz a detecção de colisão (`closestCenter`) resolver exatamente essa
// coluna como destino.
export const weekKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const direction = KEY_TO_DIRECTION[event.code];
  const { active, collisionRect, droppableRects, droppableContainers, over } = context;
  if (!direction || !active || !collisionRect) {
    return undefined;
  }
  event.preventDefault();

  const columns = droppableContainers
    .getEnabled()
    .flatMap((container) => {
      const rect = droppableRects.get(container.id);
      return rect ? [{ id: container.id, rect }] : [];
    });

  // Coluna atual: a que a colisão já resolveu (`over`); se ainda não houver,
  // a que contém o centro do Card.
  const cardCenter = center(collisionRect);
  const currentId =
    over?.id ??
    columns.find(
      ({ rect }) =>
        cardCenter.x >= rect.left &&
        cardCenter.x <= rect.left + rect.width &&
        cardCenter.y >= rect.top &&
        cardCenter.y <= rect.top + rect.height,
    )?.id;
  const current = columns.find((column) => column.id === currentId);
  if (!current) {
    return undefined;
  }

  const targetId = pickTargetColumn(
    direction,
    current.rect,
    columns.filter((column) => column.id !== currentId),
  );
  const target = columns.find((column) => column.id === targetId);
  if (!target) {
    return undefined;
  }

  return {
    x: target.rect.left + (target.rect.width - collisionRect.width) / 2,
    y: target.rect.top + (target.rect.height - collisionRect.height) / 2,
  };
};
