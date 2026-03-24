import React from 'react';
import DynamicViews from '@/core/components/DynamicViews';

const ServiceReports: React.FC = () => {
    return (
        <DynamicViews
            entityType="service_reports"
            entitySchema="blueprint"
        />
    );
};

export default ServiceReports;
