import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageHeaderProvider } from '../contexts/PageHeaderContext';
import { HelpProvider } from '../help';

/**
 * WA Layout Component
 * 
 * Provides the PageHeaderContext and HelpContext for all WA module pages.
 * This wraps all /wa/* routes with necessary providers.
 */
const WaLayout: React.FC = () => {
    return (
        <HelpProvider>
            <PageHeaderProvider>
                <Outlet />
            </PageHeaderProvider>
        </HelpProvider>
    );
};

export default WaLayout;
