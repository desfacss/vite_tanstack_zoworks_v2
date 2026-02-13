import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PageHeaderConfig {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    backButton?: {
        label?: string;
        onClick: () => void;
    };
}

interface PageHeaderContextValue {
    config: PageHeaderConfig | null;
    setPageHeader: (config: PageHeaderConfig) => void;
    clearPageHeader: () => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export const usePageHeader = () => {
    const context = useContext(PageHeaderContext);
    if (!context) {
        throw new Error('usePageHeader must be used within PageHeaderProvider');
    }
    return context;
};

interface PageHeaderProviderProps {
    children: ReactNode;
}

export const PageHeaderProvider: React.FC<PageHeaderProviderProps> = ({ children }) => {
    const [config, setConfig] = useState<PageHeaderConfig | null>(null);

    const setPageHeader = useCallback((newConfig: PageHeaderConfig) => {
        setConfig(newConfig);
    }, []);

    const clearPageHeader = useCallback(() => {
        setConfig(null);
    }, []);

    return (
        <PageHeaderContext.Provider value={{ config, setPageHeader, clearPageHeader }}>
            {children}
        </PageHeaderContext.Provider>
    );
};

// Hook for pages to set their header config
export const useSetPageHeader = (config: PageHeaderConfig, deps: React.DependencyList = []) => {
    const { setPageHeader, clearPageHeader } = usePageHeader();

    React.useEffect(() => {
        setPageHeader(config);
        return () => clearPageHeader();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};
