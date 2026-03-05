import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar/AppSidebar";
import { AppHeader } from "@/components/app-header/AppHeader";
import { MainContent } from "@/components/main-content/MainContent";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("Dashboard");

  return (
    <>
      <AppSidebar
        collapsed={collapsed}
        activeItem={activeItem}
        onItemClick={setActiveItem}
      />
      <AppHeader
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        activeItem={activeItem}
      />
      <MainContent collapsed={collapsed} />
    </>
  );
}
