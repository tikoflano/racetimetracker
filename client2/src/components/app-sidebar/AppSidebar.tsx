import {
  IconLayoutDashboard,
  IconChartBar,
  IconUsers,
  IconFolder,
  IconCalendar,
  IconMail,
  IconSettings,
  IconHelp,
  IconBolt,
} from "@tabler/icons-react";
import { Tooltip } from "@mantine/core";
import classes from "./AppSidebar.module.css";

interface NavItem {
  icon: React.ElementType;
  label: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "Main",
    items: [
      { icon: IconLayoutDashboard, label: "Dashboard" },
      { icon: IconChartBar, label: "Analytics" },
      { icon: IconUsers, label: "Customers", badge: "128" },
      { icon: IconFolder, label: "Projects" },
      { icon: IconCalendar, label: "Schedule" },
      { icon: IconMail, label: "Messages", badge: "3" },
    ],
  },
  {
    title: "System",
    items: [
      { icon: IconSettings, label: "Settings" },
      { icon: IconHelp, label: "Help Center" },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  activeItem: string;
  onItemClick: (label: string) => void;
}

export function AppSidebar({
  collapsed,
  activeItem,
  onItemClick,
}: AppSidebarProps) {
  return (
    <nav
      className={`${classes.sidebar} ${collapsed ? classes.sidebarCollapsed : ""}`}
    >
      {/* Logo */}
      <div className={classes.logo}>
        <div className={classes.logoIcon}>
          <IconBolt size={18} stroke={2} />
        </div>
        <span
          className={`${classes.logoText} ${collapsed ? classes.logoTextHidden : ""}`}
        >
          Voltex
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
                const isActive = activeItem === item.label;
                const content = (
                  <li
                    key={item.label}
                    className={`${classes.navItem} ${isActive ? classes.navItemActive : ""}`}
                    onClick={() => onItemClick(item.label)}
                  >
                    <span className={classes.navItemIcon}>
                      <item.icon size={20} stroke={1.6} />
                    </span>
                    <span
                      className={`${classes.navItemLabel} ${collapsed ? classes.navItemLabelHidden : ""}`}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={`${classes.badge} ${collapsed ? classes.badgeHidden : ""}`}
                      >
                        {item.badge}
                      </span>
                    )}
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
  );
}
