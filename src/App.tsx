import { useRoute } from './lib/router';
import { HomePage } from './pages/HomePage';
import { CreatePage } from './pages/CreatePage';
import { TournamentPage } from './pages/TournamentPage';

export default function App() {
  const route = useRoute();

  if (route.name === 'create') return <CreatePage />;
  if (route.name === 'tournament') return <TournamentPage id={route.id} />;
  return <HomePage />;
}
