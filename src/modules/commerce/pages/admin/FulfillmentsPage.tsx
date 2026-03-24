import React from 'react';
import GenericDynamicPage from '@/core/components/DynamicViews/GenericDynamicPage';

const FulfillmentsPage: React.FC = () => {
    return <GenericDynamicPage schema="commerce" entity="fulfillments" />;
};

export default FulfillmentsPage;
