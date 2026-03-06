import {
  IconLayoutDashboard,
  IconCalendar,
  IconClock,
  IconTrophy,
  IconMapPin,
  IconBike,
  IconUsersGroup,
  IconTool,
  IconFlag,
} from "@tabler/icons-react";
import { Tooltip } from "@mantine/core";
import classes from "./AppSidebar.module.css";
import { IS_DEV } from "@/env";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "Main",
    items: [
      { icon: IconLayoutDashboard, label: "Dashboard", path: "/" },
      { icon: IconFlag, label: "Event Preview", path: "/event-preview" },
      { icon: IconCalendar, label: "Calendar", path: "/calendar" },
      { icon: IconClock, label: "Timekeeping", path: "/timekeep" },
    ],
  },
  {
    title: "Manage",
    items: [
      { icon: IconTrophy, label: "Championships", path: "/championships" },
      { icon: IconMapPin, label: "Locations", path: "/locations" },
      { icon: IconBike, label: "Riders", path: "/riders" },
      { icon: IconUsersGroup, label: "Members", path: "/members" },
    ],
  },
  ...(IS_DEV
    ? [
        {
          title: "Dev",
          items: [{ icon: IconTool, label: "Dev Tools", path: "/dev" }],
        } as NavSection,
      ]
    : []),
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
