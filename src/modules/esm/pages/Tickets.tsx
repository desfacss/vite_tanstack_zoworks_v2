import React, { useState, useEffect } from 'react';
import DynamicViews from '@/core/components/DynamicViews';
import { useAuthStore } from '@/core/lib/store';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/core/lib/supabase';

const Tickets: React.FC = () => {
    const { t } = useTranslation('tickets');
    const { user } = useAuthStore();
    const [relatedAccountIds, setRelatedAccountIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchRelatedAccounts = async () => {
            if (!user?.id) return;

            const { data, error } = await supabase
                .schema('organization') // Assuming tasks are in organization schema following Bolt pattern
                .from('tasks')
                .select('account_id')
                .eq('assignee_id', user.id)
                .not('stage_id', 'in', '("CLOSED", "COMPLETED", "CANCELLED")');

            if (!error && data) {
                const ids = [...new Set(data.map(item => item.account_id).filter(Boolean))];
                setRelatedAccountIds(ids as string[]);
            }
        };

        fetchRelatedAccounts();
    }, [user?.id]);

    const tabOptions = [
        {
            key: 'my',
            label: t('tabs.myTickets', 'My Tickets'),
            condition: {
                field: 'assignee_id',
                value: user?.id,
                filter_type: 'eq',
            },
        },
        {
            key: 'related',
            label: t('tabs.relatedTickets', 'Related Tickets'),
            condition: {
                field: 'account_id',
                value: relatedAccountIds,
                filter_type: 'in',
            },
        },
        {
            key: 'all',
            label: t('tabs.allTickets', 'All Tickets'),
        },
    ];

    return (
        <DynamicViews
            entityType="tickets"
            entitySchema="esm"
            tabOptions={tabOptions}
        />
    );
};

export default Tickets;

