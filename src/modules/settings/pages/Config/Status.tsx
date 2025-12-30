import React, { useState, useEffect } from 'react';
import { QueryBuilder, RuleGroupType } from 'react-querybuilder';
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
import { message } from 'antd';
// import { supabase } from 'configs/SupabaseConfig';
import { supabase } from '@/core/lib/supabase';

interface Workflow {
    id: string;
    name: string;
    entity_type: string;
    details: any;
}

function Status() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
    const [query, setQuery] = useState<RuleGroupType>({ combinator: 'and', rules: [] });

    // Fetch workflows from Supabase
    useEffect(() => {
        async function fetchWorkflows() {
            const { data, error } = await supabase
                .from('workflow_configurations')
                .select('*');
            if (error) {
                message.error('Error fetching workflows');
                console.error(error);
            } else {
                setWorkflows(data as Workflow[]);
            }
        }
        fetchWorkflows();
    }, []);

    // Open editor for a workflow
    const handleEdit = (workflow: Workflow) => {
        console.log(workflow?.details?.stages?.[1]?.entry_criteria)
        setSelectedWorkflow(workflow);
        setQuery(workflow?.details?.stages?.[1]?.entry_criteria || { combinator: 'and', rules: [] });
    };

    function removeIds(json: string) {
        const parsed = JSON.parse(json);

        // Recursively remove 'id' from rules and the root object
        function cleanObject(obj: any): any {
            const { id, rules, ...rest } = obj; // Destructure to exclude 'id'
            if (rules) {
                // If rules exist, clean them recursively
                rest.rules = rules.map(cleanObject);
            }
            return rest;
        }

        const cleaned = cleanObject(parsed);

        return JSON.stringify(cleaned, null, 4); // Pretty-print the cleaned JSON
    }

    // Save updated workflow
    const handleSave = async () => {
        if (!selectedWorkflow) return;
        const { id } = selectedWorkflow;
        const updatedDetails = JSON.stringify(query);

        const { error } = await supabase
            .from('workflow_configurations')
            .update({ details: removeIds(updatedDetails) })
            .eq('id', id);

        if (error) {
            message.error('Error saving workflow');
            console.error(error);
        } else {
            message.success('Workflow saved successfully');
            setSelectedWorkflow(null);
        }
    };

    return (
        <div className="App">
            <h1>Workflow Configurations</h1>
            <table border={1}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Entity Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {workflows.map((workflow) => (
                        <tr key={workflow.id}>
                            <td>{workflow.id}</td>
                            <td>{workflow.name}</td>
                            <td>{workflow.entity_type}</td>
                            <td>
                                <button onClick={() => handleEdit(workflow)}>Edit</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {selectedWorkflow && (
                <div className="modal">
                    <h2>Edit Workflow: {selectedWorkflow.name}</h2>
                    <QueryBuilder
                        query={query}
                        // onQueryChange={(newQuery) => setQuery(newQuery)}
                        onQueryChange={(newQuery: RuleGroupType) => {
                            setQuery((prevQuery) => ({
                                ...prevQuery,
                                ...newQuery, // Merge changes properly
                            }));
                        }}
                    />
                    <button onClick={handleSave}>Save</button>
                    <button onClick={() => setSelectedWorkflow(null)}>Cancel</button>
                </div>
            )}

            {/* <ToastContainer /> */}
        </div>
    );
}

export default Status;
