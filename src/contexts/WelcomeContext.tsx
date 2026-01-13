import { createContext, useContext, useState, ReactNode } from 'react';

interface WelcomeContextType {
  hasSeenWelcome: boolean;
  completeWelcome: () => void;
  resetWelcome: () => void;
}

const WelcomeContext = createContext<WelcomeContextType | undefined>(undefined);

export function WelcomeProvider({ children }: { children: ReactNode }) {
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(() => {
    const seen = localStorage.getItem('hasSeenWelcome');
    return seen === 'true';
  });

  const completeWelcome = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('hasSeenWelcome', 'true');
  };

  const resetWelcome = () => {
    setHasSeenWelcome(false);
    localStorage.removeItem('hasSeenWelcome');
    localStorage.removeItem('npd_pro_access');
    localStorage.removeItem('npd_trial_start');
    sessionStorage.removeItem('npd_trial_warning_shown');
  };

  return (
    <WelcomeContext.Provider value={{ hasSeenWelcome, completeWelcome, resetWelcome }}>
      {children}
    </WelcomeContext.Provider>
  );
}

export function useWelcome() {
  const context = useContext(WelcomeContext);
  if (context === undefined) {
    throw new Error('useWelcome must be used within a WelcomeProvider');
  }
  return context;
}
