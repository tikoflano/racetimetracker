import {
  IconMenu2,
  IconLayoutSidebarLeftCollapse,
  IconBell,
  IconSearch,
} from "@tabler/icons-react";
import { TextInput } from "@mantine/core";
import { useLocation } from "react-router-dom";
import classes from "./AppHeader.module.css";
import { navigation } from "@/components/app-sidebar/navigation";

interface AppHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppHeader({ collapsed, onToggle }: AppHeaderProps) {
  const { pathname } = useLocation();
  const activeItem =
    navigation
      .flatMap((s) => s.items)
      .find((item) => item.path === pathname || (item.path !== "/" && pathname.startsWith(item.path)))
      ?.label ?? "Dashboard";
  return (
    <header
      className={classes.header}
      style={{
        left: collapsed ? "72px" : "260px",
      }}
    >
      <div className={classes.headerLeft}>
        <button
          className={classes.toggleButton}
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <IconMenu2 size={18} stroke={1.6} />
          ) : (
            <IconLayoutSidebarLeftCollapse size={18} stroke={1.6} />
          )}
        </button>

        <div className={classes.breadcrumb}>
          <span>Pages</span>
          <span className={classes.breadcrumbSeparator}>/</span>
          <span className={classes.breadcrumbActive}>{activeItem}</span>
        </div>
      </div>

      <div className={classes.headerRight}>
        <TextInput
          className={classes.searchInput}
          placeholder="Search anything..."
          leftSection={<IconSearch size={16} stroke={1.6} />}
          size="sm"
          radius="md"
          styles={{
            input: {
              backgroundColor: "#13151b",
              border: "1px solid #1e2028",
              color: "#ffffff",
              fontSize: "13px",
              "&::placeholder": {
                color: "#565b6b",
              },
              "&:focus": {
                borderColor: "#3b82f6",
              },
            },
          }}
        />

        <button className={classes.iconButton} aria-label="Notifications">
          <IconBell size={20} stroke={1.6} />
          <span className={classes.notificationDot} />
        </button>
      </div>
    </header>
  );
}
