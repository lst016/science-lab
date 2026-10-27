import { useRoute } from './state/route';
import { Library } from './ui/Library';
import { Reader } from './ui/Reader';

export function App() {
  const route = useRoute();
  if (route.name === 'book') return <Reader bookId={route.bookId} expId={route.expId} />;
  return <Library edition={route.edition ?? 'pep'} />;
}
