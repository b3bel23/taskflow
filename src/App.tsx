import { Header } from './components/Header/Header';
import { PersistenceNotice } from './components/PersistenceNotice/PersistenceNotice';
import { WeekView } from './components/WeekView/WeekView';
import { TaskProvider, useTaskContext } from './state/TaskContext';

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

function App() {
  return (
    <TaskProvider>
      <AppShell />
    </TaskProvider>
  );
}

export default App;
