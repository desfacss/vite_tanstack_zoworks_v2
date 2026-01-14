import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthedLayoutConfig {
  searchFilters?: ReactNode;
  actionButtons?: { icon: ReactNode; tooltip: string; onClick: () => void }[];
  fullScreen?: boolean;
}

const AuthedLayoutContext = createContext<{
  config: AuthedLayoutConfig;
  setConfig: (config: AuthedLayoutConfig) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}>({
  config: {},
  setConfig: () => { },
  showSettings: false,
  setShowSettings: () => { },
});

export const AuthedLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AuthedLayoutConfig>({});
  const [showSettings, setShowSettings] = useState(false);

  return (
    <AuthedLayoutContext.Provider value={{ config, setConfig, showSettings, setShowSettings }}>
      {children}
    </AuthedLayoutContext.Provider>
  );
};

export const useAuthedLayoutConfig = () => useContext(AuthedLayoutContext);