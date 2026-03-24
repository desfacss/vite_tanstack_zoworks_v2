import React from 'react';
import GenericDynamicPage from '@/core/components/DynamicViews/GenericDynamicPage';

const ReturnsPage: React.FC = () => {
    return <GenericDynamicPage schema="commerce" entity="returns" />;
};

export default ReturnsPage;
