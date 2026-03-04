import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Text } from '@mantine/core';

export default function QRCodeView() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const url = `${window.location.origin}/register/${orgSlug}`;

  return (
    <div className="register-page">
      <div className="register-card" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: 16 }}>Rider Registration</h2>
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 12,
            display: 'inline-block',
            marginBottom: 16,
          }}
        >
          <QRCodeSVG value={url} size={256} level="M" />
        </div>
        <Text size="sm" c="dimmed" style={{ wordBreak: 'break-all' }}>
          {url}
        </Text>
        <Button variant="subtle" size="xs" mt="md" onClick={() => window.print()}>
          Print
        </Button>
      </div>
    </div>
  );
}
