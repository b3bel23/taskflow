// Registro module-scope (id da tarefa -> nó DOM da alça de arraste atual) —
// Story 4.2, boundary "Foco": cruzar grupo desmonta a alça no `DayColumn`/
// zona de origem e remonta uma alça NOVA (nó DOM diferente) na zona de
// destino, possivelmente uma instância de `DayColumn` totalmente diferente
// (outro dia). Um `ref` local a um único `DayColumn` não sobrevive a essa
// travessia; este registro (único para toda a árvore, já que só existe uma
// `WeekView` montada por vez neste app single-page) é o que permite
// `WeekView.handleDragEnd`/o efeito pós-render reencontrar a alça remontada
// da MESMA tarefa depois do próximo render, para devolver o foco a ela —
// mesmo padrão de efeito pós-render de `DayColumn.tsx` (retro Epic 2, achado
// 1): decide o foco só depois que o React já commitou o próximo render.
//
// Desmontagem (`element === null`, disparada pelo próprio `ref` callback do
// @dnd-kit quando o nó antigo sai da árvore) não apaga a entrada: no
// cruzamento de grupo, o React desmonta a alça antiga e monta a nova dentro
// do MESMO commit — apagar no desmonte arriscaria uma corrida (o cleanup da
// alça antiga rodando depois do registro da alça nova, apagando a entrada
// certa). Uma entrada "presa" para uma tarefa excluída de vez (nunca mais
// remontada) fica inerte — nunca lida de novo, já que `resolveWeekDragChange`
// só devolve ids de tarefas que ainda existem em `state.tasks`.
const dragHandles = new Map<string, HTMLElement>();

export function registerDragHandle(taskId: string, element: Element | null): void {
  if (element instanceof HTMLElement) {
    dragHandles.set(taskId, element);
  }
}

export function getDragHandle(taskId: string): HTMLElement | null {
  return dragHandles.get(taskId) ?? null;
}

// Revisão da Story 4.2 (blind-hunter/edge-case-hunter): diferente de um
// cruzamento de grupo (a alça é desmontada E remontada no mesmo commit — ver
// comentário acima sobre não apagar no desmonte), uma tarefa EXCLUÍDA nunca
// remonta — sem isto, cada exclusão deixaria uma entrada presa para sempre
// (nó DOM desconectado retido indefinidamente). Chamada por
// `useTaskActions.deleteTask` só após sucesso confirmado (AD-4).
export function unregisterDragHandle(taskId: string): void {
  dragHandles.delete(taskId);
}

// Só verdadeiro quando a alça registrada da tarefa é de fato o elemento com
// foco no instante da checagem — usado por `WeekView` para decidir se um
// cruzamento de grupo começou com o foco na própria alça (arraste por
// teclado) antes de agendar a restauração de foco pós-render.
export function isDragHandleFocused(taskId: string): boolean {
  const handle = dragHandles.get(taskId);
  return handle != null && handle === document.activeElement;
}

// Esvazia o registro inteiro. Existe para os TESTES (retro Epic 4, item 17):
// o `Map` acima é module-scope, então dentro de um mesmo arquivo de teste
// as entradas de um teste sobreviviam ao próximo — com ids reaproveitados
// (`'a'`, `'t1'`), um nó DOM desmontado de um teste anterior podia ser lido
// como se fosse o do teste atual. `src/test/setup.ts` chama isto em todo
// `afterEach`. Entre ARQUIVOS de teste não há vazamento (o Vitest isola o
// registro de módulos por arquivo). Nada em código de produção chama isto.
export function clearDragHandles(): void {
  dragHandles.clear();
}
