import React from 'react';
import { NaturalLanguageQueryInterface } from '../components/nlp/query/NaturalLanguageQueryInterface';

const AiQueryMigrationPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <NaturalLanguageQueryInterface />
        </div>
    );
};

export default AiQueryMigrationPage;
