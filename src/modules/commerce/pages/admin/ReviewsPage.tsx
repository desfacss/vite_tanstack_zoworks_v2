import React from 'react';
import GenericDynamicPage from '@/core/components/DynamicViews/GenericDynamicPage';

const ReviewsPage: React.FC = () => {
    return <GenericDynamicPage schema="commerce" entity="reviews" />;
};

export default ReviewsPage;
