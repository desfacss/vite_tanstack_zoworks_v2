import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';

const EsignActionModal: React.FC<{ record: any; entityType: string }> = ({ record, entityType }) => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to the E-Sign wizard
        navigate(`/app/esign/create?entityId=${record.id}&entityType=${entityType}`);
    }, [navigate, record.id, entityType]);

    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spin tip="Redirecting to E-Sign Wizard..." size="large" />
        </div>
    );
};

export default EsignActionModal;
