import { registerAction } from '@/core/registry/actionRegistry';
import { FileCheck } from 'lucide-react';
import React from 'react';

export const registerESignModule = () => {
    // Register "Send for E-Sign" action for Service Reports
    registerAction({
        id: 'send-for-esign',
        label: 'Send for E-Sign',
        icon: React.createElement(FileCheck, { size: 16 }),
        entityTypes: ['blueprint.service_reports', 'doc_contracts'],
        position: 'row',
        component: () => import('./components/EsignActionModal'),
    });
};
