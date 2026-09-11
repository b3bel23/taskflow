import { Header } from './components/Header/Header';
import { PersistenceNotice } from './components/PersistenceNotice/PersistenceNotice';
import { WeekView } from './components/WeekView/WeekView';
import { TaskProvider, useTaskContext } from './state/TaskContext';
import { ThemeProvider } from './state/ThemeContext';

// `TaskProvider` precisa envolver qualquer árvore que leia `useTaskContext` —
// `AppShell` existe só para poder chamar o hook dentro do Provider.
function AppShell() {
  const { state } = useTaskContext();

  return (
    <>
      <Header />
      <PersistenceNotice loadError={state.loadError} />
      <WeekView />
    </>
  );
}

// `ThemeProvider` fica fora de `TaskProvider` — tema e tarefas são domínios
// de persistência/estado independentes (AD-2, AD-5), nenhum dos dois precisa
// do outro para inicializar.
function App() {
  return (
    <ThemeProvider>
      <TaskProvider>
        <AppShell />
      </TaskProvider>
    </ThemeProvider>
  );
}

export default App;
