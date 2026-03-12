import { useState } from "react";
import { useReducer } from "spacetimedb/react";
import { Box, Button, Text } from "@mantine/core";
import { AppSidebar } from "@/components/app-sidebar/AppSidebar";
import { AppHeader } from "@/components/app-header/AppHeader";
import { MainContent } from "@/components/main-content/MainContent";
import { useAuth } from "@/auth";
import { reducers } from "@/module_bindings";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);
  const { user, realUser, isImpersonating } = useAuth();
  const stopImpersonation = useReducer(reducers.stopImpersonation);

  return (
    <>
      {isImpersonating && user && realUser && (
        <Box
          style={{
            background: "var(--mantine-color-orange-6)",
            color: "white",
            padding: "8px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text size="sm">
            Viewing as: <strong>{user.name || user.email}</strong>
          </Text>
          <Button
            variant="white"
            color="dark"
            size="xs"
            onClick={() => stopImpersonation()}
          >
            Stop
          </Button>
        </Box>
      )}
      <AppSidebar collapsed={collapsed} />
      <AppHeader
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <MainContent collapsed={collapsed} />
    </>
  );
}
