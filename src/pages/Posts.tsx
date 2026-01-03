import { useLocation } from 'react-router-dom';
import AnonymousFeed from '@/components/feed/AnonymousFeed';

export default function Posts() {
  const location = useLocation();
  const initialSort = (location.state as { initialSort?: 'hot' | 'new' | 'top' })?.initialSort;

  return (
    <div className="min-h-screen -mx-4 -mt-4">
      <AnonymousFeed initialSort={initialSort} />
    </div>
  );
}
