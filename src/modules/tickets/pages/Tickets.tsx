import DynamicViews from '@/core/components/DynamicViews';
import { useAuthStore } from '@/core/lib/store';
import { useTranslation } from 'react-i18next';

const Tickets: React.FC = () => {
    const { t } = useTranslation('tickets');
    const { user } = useAuthStore();

    const tabOptions = [
        {
            key: '1',
            label: t('tabs.myTickets'),
            condition: {
                field: 'assignee_id',
                value: user?.id,
                filter_type: 'eq',
            },
        },
        {
            key: '2',
            label: t('tabs.allTickets'),
        },
    ];

    return (
        <DynamicViews
            entityType="tickets"
            entitySchema="blueprint"
            tabOptions={tabOptions}
        />
    );
};

export default Tickets;

