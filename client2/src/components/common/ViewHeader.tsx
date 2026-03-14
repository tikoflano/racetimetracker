import { Box, Group, Text, Title, ThemeIcon } from "@mantine/core";

interface ViewHeaderProps {
  icon: React.ReactNode;
  iconColor?: string;
  gradient?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  isMobile?: boolean;
}

const DEFAULT_GRADIENT =
  "linear-gradient(135deg, #1C2348 0%, #2A3364 60%, #313B72 100%)";

export function ViewHeader({
  icon,
  iconColor = "blue",
  gradient = DEFAULT_GRADIENT,
  eyebrow,
  title,
  subtitle,
  actions,
  isMobile = false,
}: ViewHeaderProps) {
  return (
    <Box
      p={isMobile ? "md" : "xl"}
      style={{
        background: gradient,
        borderRadius: "var(--mantine-radius-md)",
        border: "1px solid #1e2028",
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
        <Group gap="sm" align="center" style={{ minWidth: 0 }}>
          {!isMobile && (
            <ThemeIcon size={52} radius="md" color={iconColor} variant="light">
              {icon}
            </ThemeIcon>
          )}
          <div style={{ minWidth: 0 }}>
            {!isMobile && eyebrow && (
              <Text size="xs" c={`${iconColor}.3`} tt="uppercase" fw={600} mb={2}>
                {eyebrow}
              </Text>
            )}
            <Title
              order={isMobile ? 4 : 2}
              c="white"
              fw={700}
              style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {title}
            </Title>
            {subtitle && (
              <Text size={isMobile ? "xs" : "sm"} c={`${iconColor}.2`} mt={2}>
                {subtitle}
              </Text>
            )}
          </div>
        </Group>
        {actions && (
          <Group gap="sm" style={{ flexShrink: 0 }}>
            {actions}
          </Group>
        )}
      </Group>
    </Box>
  );
}
