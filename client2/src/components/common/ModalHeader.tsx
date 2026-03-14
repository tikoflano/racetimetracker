import { Group, Text, ThemeIcon } from "@mantine/core";

interface ModalHeaderProps {
  icon: React.ReactNode;
  iconColor?: string;
  label: string;
  title: string;
}

export function ModalHeader({
  icon,
  iconColor = "blue",
  label,
  title,
}: ModalHeaderProps) {
  return (
    <Group gap="sm">
      <ThemeIcon size={36} radius="md" color={iconColor} variant="light">
        {icon}
      </ThemeIcon>
      <div>
        <Text size="xs" c={`${iconColor}.4`} tt="uppercase" fw={600} lh={1}>
          {label}
        </Text>
        <Text fw={700} size="lg" lh={1.3}>
          {title}
        </Text>
      </div>
    </Group>
  );
}

export function modalHeaderStyles(
  gradient = "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)",
) {
  return {
    header: {
      background: gradient,
      borderBottom: "1px solid #1e2028",
    },
    close: { color: "white" },
  };
}
