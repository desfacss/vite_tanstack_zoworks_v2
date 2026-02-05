import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';

const Invoices: React.FC = () => {
    return (
        <DynamicViews
            entityType="invoices"
            entitySchema="blueprint"
        />
    );
};

export default Invoices;
