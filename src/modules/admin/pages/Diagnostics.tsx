import { useEffect, useState } from 'react';
import { Card, Button, Space, Typography, Alert, Table } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/core/lib/store';

const { Title, Text } = Typography;

interface TestResult {
    name: string;
    status: 'success' | 'error' | 'pending';
    data?: any;
    error?: string;
    httpStatus?: number;
}

/**
 * PostgREST & RPC Diagnostic Tool
 * 
 * Tests various API calls to diagnose 403 Forbidden issues.
 * Included as a tab in Admin Settings.
 */
export default function DiagnosticTest() {
    const [results, setResults] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(false);
    const { user, organization } = useAuthStore();

    const runTests = async () => {
        setLoading(true);
        setResults([]);

        const tests: TestResult[] = [];

        // Test 1: core.entities (PostgREST)
        try {
            console.log('Testing core.entities (PostgREST)...');
            const { data, error } = await supabase
                .schema('core')
                .from('entities')
                .select('*')
                .limit(1);

            tests.push({
                name: 'PostgREST: core.entities',
                status: error ? 'error' : 'success',
                data: data,
                error: error?.message,
                httpStatus: error?.code ? parseInt(error.code) : 200
            });
        } catch (e: any) {
            tests.push({ name: 'PostgREST: core.entities', status: 'error', error: e.message });
        }

        // Test 2: core.forms (PostgREST)
        try {
            console.log('Testing core.forms (PostgREST)...');
            const { data, error } = await supabase
                .schema('core')
                .from('forms')
                .select('*')
                .limit(1);

            tests.push({
                name: 'PostgREST: core.forms',
                status: error ? 'error' : 'success',
                data: data,
                error: error?.message,
                httpStatus: error?.code ? parseInt(error.code) : 200
            });
        } catch (e: any) {
            tests.push({ name: 'PostgREST: core.forms', status: 'error', error: e.message });
        }

        // Test 3: core.api_fetch_entity_records_rls (RPC Gateway)
        try {
            console.log('Testing RPC Gateway (core.forms)...');
            const { data, error } = await supabase
                .schema('core')
                .rpc('api_fetch_entity_records_rls', {
                    config: {
                        entity_schema: 'core',
                        entity_name: 'forms',
                        organization_id: organization?.id,
                        filters: [{ column: 'name', operator: 'eq', value: 'leave_applications_add_edit_form' }]
                    }
                });

            tests.push({
                name: 'RPC: core.api_fetch_entity_records_rls (forms)',
                status: error ? 'error' : 'success',
                data: data,
                error: error?.message
            });
        } catch (e: any) {
            tests.push({ name: 'RPC: core.forms', status: 'error', error: e.message });
        }

        // Test 4: RPC Gateway (core.entities)
        try {
            console.log('Testing RPC Gateway (core.entities)...');
            const { data, error } = await supabase
                .schema('core')
                .rpc('api_fetch_entity_records_rls', {
                    config: {
                        entity_schema: 'core',
                        entity_name: 'entities',
                        organization_id: organization?.id,
                        pagination: { limit: 1 }
                    }
                });

            tests.push({
                name: 'RPC: core.api_fetch_entity_records_rls (entities)',
                status: error ? 'error' : 'success',
                data: data,
                error: error?.message
            });
        } catch (e: any) {
            tests.push({ name: 'RPC: core.entities', status: 'error', error: e.message });
        }

        // Test 5: blueprint schema (PostgREST)
        try {
            console.log('Testing blueprint schema (PostgREST)...');
            const { data, error } = await supabase
                .schema('blueprint')
                .from('projects')
                .select('*')
                .limit(1);

            tests.push({
                name: 'PostgREST: blueprint.projects',
                status: error ? 'error' : 'success',
                data: data,
                error: error?.message
            });
        } catch (e: any) {
            tests.push({ name: 'PostgREST: blueprint', status: 'error', error: e.message });
        }

        // Test 6: core_upsert_data_v8 (RPC Availability)
        try {
            console.log('Testing RPC core.core_upsert_data_v8 availability...');
            // We just check if it's reachable by sending a dummy call that fails gracefully or returns empty
            const { data, error } = await supabase
                .schema('core')
                .rpc('core_upsert_data_v8', {
                    table_name: 'core.entities',
                    data: {},
                    id: '00000000-0000-0000-0000-000000000000' // Non-existent ID, should do nothing or fail with specifically "record not found"
                });

            tests.push({
                name: 'RPC: core.core_upsert_data_v8 Reachability',
                status: error && error.message.includes('permission denied') ? 'error' : 'success',
                data: data,
                error: error?.message
            });
        } catch (e: any) {
            tests.push({ name: 'RPC: core_upsert_data_v8', status: 'error', error: e.message });
        }

        // Test 7: Check JWT claims
        try {
            const { data: { session } } = await supabase.auth.getSession();
            tests.push({
                name: 'JWT Claims',
                status: 'success',
                data: {
                    user_id: session?.user?.id,
                    role: session?.user?.role,
                    app_metadata: session?.user?.app_metadata,
                    organization_id: session?.user?.app_metadata?.organization_id,
                }
            });
        } catch (e: any) {
            tests.push({ name: 'JWT Claims', status: 'error', error: e.message });
        }

        setResults(tests);
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            runTests();
        }
    }, [user]);

    const columns = [
        {
            title: 'Test',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <span style={{ color: status === 'success' ? 'green' : status === 'error' ? 'red' : 'orange' }}>
                    {status === 'success' ? '✅ Success' : status === 'error' ? '❌ Error' : '⏳ Pending'}
                </span>
            ),
        },
        {
            title: 'Error',
            dataIndex: 'error',
            key: 'error',
            render: (error: string) => error ? <Text type="danger">{error}</Text> : '-',
        },
        {
            title: 'Data',
            dataIndex: 'data',
            key: 'data',
            render: (data: any) => data ? (
                <details>
                    <summary>View Result</summary>
                    <pre style={{ fontSize: '10px', maxHeight: '200px', overflow: 'auto', background: '#f5f5f5', padding: 8 }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </details>
            ) : '-',
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card title="Diagnostic Tool">
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>API & Gateway Diagnostics</Title>
                            <Text type="secondary">Debugging 403 Forbidden errors between PostgREST and RPC</Text>
                        </div>
                        <Button type="primary" onClick={runTests} loading={loading}>
                            Re-run Tests
                        </Button>
                    </div>

                    <Table
                        dataSource={results}
                        columns={columns}
                        rowKey="name"
                        pagination={false}
                        size="small"
                    />

                    <Alert
                        type="info"
                        message="Diagnostic Guide"
                        description={
                            <ul style={{ paddingLeft: 20, margin: 0 }}>
                                <li>If <strong>PostgREST: core.forms</strong> fails but <strong>RPC: core.api_fetch_entity...</strong> works, direct table access is blocked.</li>
                                <li>If both <strong>PostgREST</strong> tests fail for the <code>core</code> or <code>blueprint</code> schema, it might be a grant or schema exposure issue.</li>
                                <li>If <strong>JWT Claims</strong> is missing <code>organization_id</code>, RLS policies will fail.</li>
                            </ul>
                        }
                    />
                </Space>
            </Card>
        </div>
    );
}
