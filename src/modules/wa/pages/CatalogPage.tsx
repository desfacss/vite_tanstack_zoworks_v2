// src/pages/EcomAdminPage.tsx
// E-commerce Catalog Admin page - consistent with app design

import React, { useState } from 'react';
import {
    ShopOutlined,
    DollarCircleOutlined,
    ContainerOutlined,
    GiftOutlined,
    UserOutlined,
    EnvironmentOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../hooks';
import { useAuthStore } from '@/lib/authStore';
import { useSetPageHeader } from '../contexts/PageHeaderContext';
import { ActionBar } from '../components/common/ActionBar';
import { usePageTour } from '../help';
import { catalogTour } from '../help/tours';

// Import ecom admin pages
import ProductManagerPage from '../components/ecom/ProductManagerPage';
import PricingManagerPage from '../components/ecom/PricingManagerPage';
import InventoryManagerPage from '../components/ecom/InventoryManagerPage';
import DiscountManagerPage from '../components/ecom/DiscountManagerPage';
import CustomerSegmentsPage from '../components/ecom/CustomerSegmentsPage';
import LocationsPage from '../components/ecom/LocationsPage';

// Demo organization ID for development
// const DEMO_ORG_ID = '55555555-5555-5555-5555-555555555555';
const DEMO_ORG_ID = '11111111-1111-1111-1111-111111111111';

const EcomAdminPage: React.FC = () => {
    const { isMobile } = useResponsive();
    const { organization } = useAuthStore();
    const [activeTab, setActiveTab] = useState('products');

    // Debug: log organization state
    console.log('[EcomAdminPage] organization from authStore:', organization);

    // Use organization from auth store - no fallback, show loading if not ready
    const selectedOrganization = organization?.id || '';

    // Set page header - title only
    useSetPageHeader({
        title: 'Catalog',
    }, []);

    const tabItems = [
        {
            key: 'products',
            label: <span><ShopOutlined /> {!isMobile && 'Products'}</span>,
        },
        {
            key: 'pricing',
            label: <span><DollarCircleOutlined /> {!isMobile && 'Pricing'}</span>,
        },
        {
            key: 'inventory',
            label: <span><ContainerOutlined /> {!isMobile && 'Inventory'}</span>,
        },
        {
            key: 'discounts',
            label: <span><GiftOutlined /> {!isMobile && 'Discounts'}</span>,
        },
        {
            key: 'segments',
            label: <span><UserOutlined /> {!isMobile && 'Segments'}</span>,
        },
        {
            key: 'locations',
            label: <span><EnvironmentOutlined /> {!isMobile && 'Locations'}</span>,
        },
    ];

    // Render active tab content
    const renderContent = () => {
        switch (activeTab) {
            case 'products':
                return <ProductManagerPage selectedOrganization={selectedOrganization} />;
            case 'pricing':
                return <PricingManagerPage selectedOrganization={selectedOrganization} />;
            case 'inventory':
                return <InventoryManagerPage selectedOrganization={selectedOrganization} />;
            case 'discounts':
                return <DiscountManagerPage selectedOrganization={selectedOrganization} />;
            case 'segments':
                return <CustomerSegmentsPage selectedOrganization={selectedOrganization} />;
            case 'locations':
                return <LocationsPage selectedOrganization={selectedOrganization} />;
            default:
                return <ProductManagerPage selectedOrganization={selectedOrganization} />;
        }
    };

    // Register help tour
    const { startTour: startCatalogTour } = usePageTour(catalogTour);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Action Bar with Tabs */}
            <ActionBar
                tabs={tabItems}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                secondaryActions={[
                    {
                        key: 'help',
                        label: 'Show Help Tour',
                        icon: <QuestionCircleOutlined />,
                        onClick: startCatalogTour,
                    },
                ]}
            />

            {/* Content */}
            <div style={{ padding: isMobile ? 12 : 24, flex: 1, overflow: 'auto' }}>
                {renderContent()}
            </div>
        </div>
    );
};

export default EcomAdminPage;
