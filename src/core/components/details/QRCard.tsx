import React from 'react';
import { Card, Typography, Space } from 'antd';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuthStore } from '@/core/lib/store';

const { Text, Link } = Typography;

interface QRCardProps {
  f: string; // Form name (e.g., 'qr_tickets')
  i: string; // Entity key value (e.g., asset ID)
  display_id?: string; // Optional display ID for the card
}

const QRCard: React.FC<QRCardProps> = ({ f, i, display_id }) => {
  const { organization } = useAuthStore();

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  const qrUrl = `${baseUrl}/submit?f=${encodeURIComponent(f)}&i=${encodeURIComponent(i)}`;

  const companyLink = (organization?.app_settings as any)?.custom_domain
    ? `https://${(organization?.app_settings as any)?.custom_domain}`
    : 'https://www.vkbs.in';

  return (
    <Card
      className="qr-card-content"
      style={{
        width: '70mm',
        height: '90mm',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10mm',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      }}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
          padding: 0,
        }
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%', alignItems: 'center' }}>
        <QRCodeCanvas
          value={qrUrl}
          size={180}
          level="H"
          includeMargin={true}
        />

        {display_id && (
          <Text strong style={{ fontSize: '14px', marginTop: '10px' }}>
            {display_id}
            {/* {i} */}
          </Text>
        )}

        <Link href={companyLink} target="_blank" style={{ fontSize: '16px', marginTop: '5px' }}>
          {new URL(companyLink).hostname}
        </Link>
      </Space>
    </Card>
  );
};

export default QRCard;