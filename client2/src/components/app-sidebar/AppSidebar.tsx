import { IconClock } from "@tabler/icons-react";
import { Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useNavigate, useLocation } from "react-router-dom";
import classes from "./AppSidebar.module.css";
import { navigation } from "./navigation";

interface AppSidebarProps {
  collapsed: boolean;
  onClose?: () => void;
}

export function AppSidebar({ collapsed, onClose }: AppSidebarProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <>
      {isMobile && !collapsed && (
        <div className={classes.backdrop} onClick={onClose} />
      )}
    <nav
      className={`${classes.sidebar} ${collapsed ? classes.sidebarCollapsed : ""}`}
    >
      {/* Logo */}
      <div className={classes.logo}>
        <div className={classes.logoIcon}>
          <IconClock size={18} stroke={2} />
        </div>
        <span
          className={`${classes.logoText} ${collapsed ? classes.logoTextHidden : ""}`}
        >
          RaceTimeTracker
        </span>
      </div>

      {/* Nav content */}
      <div className={classes.navContent}>
        {navigation.map((section) => (
          <div key={section.title}>
            <div
              className={`${classes.sectionLabel} ${collapsed ? classes.sectionLabelHidden : ""}`}
            >
              {section.title}
            </div>
            <ul className={classes.navList}>
              {section.items.map((item) => {
                const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
                const content = (
                  <li
                    key={item.label}
                    className={`${classes.navItem} ${isActive ? classes.navItemActive : ""}`}
                    onClick={() => { navigate(item.path); if (isMobile) onClose?.(); }}
                  >
                    <span className={classes.navItemIcon}>
                      <item.icon size={20} stroke={1.6} />
                    </span>
                    <span
                      className={`${classes.navItemLabel} ${collapsed ? classes.navItemLabelHidden : ""}`}
                    >
                      {item.label}
                    </span>
                  </li>
                );

                if (collapsed) {
                  return (
                    <Tooltip
                      key={item.label}
                      label={item.label}
                      position="right"
                      withArrow
                      transitionProps={{ duration: 150 }}
                    >
                      {content}
                    </Tooltip>
                  );
                }

                return content;
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
    </>
  );
}
