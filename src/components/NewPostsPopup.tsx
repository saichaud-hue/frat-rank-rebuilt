import { Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NewPostsPopupProps {
  count: number;
  onClear: () => void;
}

export default function NewPostsPopup({ count, onClear }: NewPostsPopupProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  if (count < 3) return null;
  
  const handleClick = () => {
    onClear();
    // If already on Activity, just scroll to top
    if (location.pathname === '/Activity') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/Activity');
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className="fixed bottom-[calc(68px+max(env(safe-area-inset-bottom),8px))] left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 z-50 hover:scale-105 active:scale-95 transition-transform animate-bounce-in"
    >
      <Bell className="h-4 w-4" />
      <span>{count} new posts</span>
    </button>
  );
}
