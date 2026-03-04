import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Text, Box, Paper, Title } from '@mantine/core';

export default function QRCodeView() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const url = `${window.location.origin}/register/${orgSlug}`;

  return (
    <Box mih="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Paper withBorder p="xl" maw={440} w="100%" style={{ textAlign: 'center' }}>
        <Title order={2} mb="md">Rider Registration</Title>
        <Box
          bg="white"
          p="lg"
          mb="md"
          style={{ display: 'inline-block', borderRadius: 12 }}
        >
          <QRCodeSVG value={url} size={256} level="M" />
        </Box>
        <Text size="sm" c="dimmed" style={{ wordBreak: 'break-all' }}>
          {url}
        </Text>
        <Button variant="subtle" size="xs" mt="md" onClick={() => window.print()}>
          Print
        </Button>
      </Paper>
    </Box>
  );
}
