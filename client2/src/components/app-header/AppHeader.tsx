import {
  IconMenu2,
  IconLayoutSidebarLeftCollapse,
  IconBell,
  IconSearch,
} from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { useLocation } from "react-router-dom";
import classes from "./AppHeader.module.css";
import { navigation } from "@/components/app-sidebar/navigation";

interface AppHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppHeader({ collapsed, onToggle }: AppHeaderProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
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
        left: isMobile ? "0px" : collapsed ? "72px" : "260px",
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
        <button className={classes.iconButton} aria-label="Search">
          <IconSearch size={20} stroke={1.6} />
        </button>

        <button className={classes.iconButton} aria-label="Notifications">
          <IconBell size={20} stroke={1.6} />
          <span className={classes.notificationDot} />
        </button>
      </div>
    </header>
  );
}
