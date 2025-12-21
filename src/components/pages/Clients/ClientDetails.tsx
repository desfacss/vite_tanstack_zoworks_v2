// components/ClientDetails.tsx
import React, { useEffect, useState } from 'react';
import { Card, Spin, Alert, Typography } from 'antd';
import { supabase } from '@/lib/supabase';
import DetailOverview from '../../common/details/DetailOverview';

const { Title } = Typography;

// Interfaces for type safety
interface ClientDetailsData {
    id: string;
    name: string;
    details: {
        zip?: string;
        email?: string;
        phone?: string;
        address?: string;
        pincode?: string;
    };
    client_type: string | null;
    is_active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface ClientContact {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    is_primary: boolean;
}

interface ClientDetailsProps {
    editItem: {
        account_id: string;
    };
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ editItem }) => {
    const [displayData, setDisplayData] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const viewConfig = {
        details_overview: {
            groups: [
                {
                    name: "Client Details",
                    fields: [
                        { label: "Name", fieldPath: "name" },
                        { label: "Address", fieldPath: "details.address" },
                        { label: "Zip", fieldPath: "details.pincode" },
                        { label: "Client Type", fieldPath: "client_type" },
                        { label: "Status", fieldPath: "is_active", style: { render: 'tag', colorMapping: { 'true': 'green', 'false': 'red' } } },
                        { label: "Notes", fieldPath: "notes" },
                        { label: "Created At", fieldPath: "created_at" },
                        { label: "Updated At", fieldPath: "updated_at" }
                    ]
                },
                {
                    name: "Primary Contact",
                    fields: [
                        { label: "Name", fieldPath: "contact.name" },
                        { label: "Email", fieldPath: "contact.email" },
                        { label: "Phone", fieldPath: "contact.phone" }
                    ]
                }
            ],
            dividers: ["Primary Contact"]
        }
    };

    useEffect(() => {
        const fetchClientData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch client details
                const { data: clientData, error: clientError } = await supabase
                    .schema('external').from('accounts')
                    .select('*')
                    .eq('id', editItem?.account_id)
                    .single();

                if (clientError) {
                    throw new Error(`Error fetching client: ${clientError.message}`);
                }
                if (!clientData) {
                    throw new Error('Client not found');
                }

                // Fetch primary contact
                const { data: contactData, error: contactError } = await supabase
                    .schema('external').from('contacts')
                    .select('*')
                    .eq('account_id', clientData.id)
                    .eq('is_primary', true)
                    .single();

                if (contactError && contactError.code !== 'PGRST116') {
                    throw new Error(`Error fetching contact: ${contactError.message}`);
                }

                // Combine data into a single object for DetailOverview
                const combinedData = {
                    ...clientData,
                    contact: contactData || {}
                };

                setDisplayData(combinedData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unexpected error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (editItem?.account_id) {
            fetchClientData();
        }
    }, [editItem]);

    if (loading) {
        return <Spin style={{ display: 'block', margin: '20px auto' }} />;
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }

    if (!displayData) {
        return <Alert message="No client found" type="warning" showIcon />;
    }

    return (
            <DetailOverview data={displayData} viewConfig={viewConfig} />
    );
};

export default ClientDetails;