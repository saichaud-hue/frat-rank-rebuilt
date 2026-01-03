import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const TUTORIAL_COMPLETED_KEY = 'touse_tutorial_completed';

export function useTutorial() {
  const { user } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check if user has completed the tutorial
    const completedUsers = JSON.parse(
      localStorage.getItem(TUTORIAL_COMPLETED_KEY) || '[]'
    );
    
    const hasCompleted = completedUsers.includes(user.id);
    setShowTutorial(!hasCompleted);
    setIsLoading(false);
  }, [user]);

  const completeTutorial = () => {
    if (!user) return;

    const completedUsers = JSON.parse(
      localStorage.getItem(TUTORIAL_COMPLETED_KEY) || '[]'
    );

    if (!completedUsers.includes(user.id)) {
      completedUsers.push(user.id);
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, JSON.stringify(completedUsers));
    }

    setShowTutorial(false);
  };

  const resetTutorial = () => {
    if (!user) return;

    const completedUsers = JSON.parse(
      localStorage.getItem(TUTORIAL_COMPLETED_KEY) || '[]'
    );

    const filtered = completedUsers.filter((id: string) => id !== user.id);
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, JSON.stringify(filtered));
    setShowTutorial(true);
  };

  return {
    showTutorial,
    isLoading,
    completeTutorial,
    resetTutorial,
  };
}
