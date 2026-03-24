import React from 'react';
import GenericDynamicPage from '@/core/components/DynamicViews/GenericDynamicPage';

const OrdersPage: React.FC = () => {
    return <GenericDynamicPage schema="commerce" entity="orders" />;
};

export default OrdersPage;
