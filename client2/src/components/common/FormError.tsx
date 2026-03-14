import { Text } from "@mantine/core";

interface FormErrorProps {
  error?: string | null;
}

export function FormError({ error }: FormErrorProps) {
  if (!error) return null;
  return (
    <Text size="sm" c="red">
      {error}
    </Text>
  );
}
