import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthedLayoutConfig {
  searchFilters?: ReactNode;
  actionButtons?: { icon: ReactNode; tooltip: string; onClick: () => void }[];
}

const AuthedLayoutContext = createContext<{
  config: AuthedLayoutConfig;
  setConfig: (config: AuthedLayoutConfig) => void;
}>({
  config: {},
  setConfig: () => {},
});

export const AuthedLayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AuthedLayoutConfig>({});

  return (
    <AuthedLayoutContext.Provider value={{ config, setConfig }}>
      {children}
    </AuthedLayoutContext.Provider>
  );
};

export const useAuthedLayoutConfig = () => useContext(AuthedLayoutContext);