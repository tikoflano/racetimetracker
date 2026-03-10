import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar/AppSidebar";
import { AppHeader } from "@/components/app-header/AppHeader";
import { MainContent } from "@/components/main-content/MainContent";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <AppSidebar collapsed={collapsed} />
      <AppHeader
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <MainContent collapsed={collapsed} />
    </>
  );
}
