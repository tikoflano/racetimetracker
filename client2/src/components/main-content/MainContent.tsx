import { Routes, Route } from "react-router-dom";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconUsers,
  IconChartBar,
  IconCurrencyDollar,
  IconEye,
} from "@tabler/icons-react";
import classes from "./MainContent.module.css";
import { EventPreviewView } from "./EventPreviewView";
import { MembersView } from "./MembersView";
import { CalendarView } from "./CalendarView";
import { LocationsView } from "./LocationsView";
import { LocationDetailView } from "./LocationDetailView";
import { TimekeepView } from "./TimekeepView";
import { DevToolsView } from "./DevToolsView";
import { RidersView } from "./RidersView";
import { ChampionshipsView } from "./ChampionshipsView";
import { ChampionshipDetailView } from "./ChampionshipDetailView";

interface MainContentProps {
  collapsed: boolean;
}

const stats = [
  {
    label: "Total Revenue",
    value: "$48,290",
    change: "+12.5%",
    positive: true,
    icon: IconCurrencyDollar,
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
  },
  {
    label: "Active Users",
    value: "2,847",
    change: "+8.2%",
    positive: true,
    icon: IconUsers,
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
  {
    label: "Conversion Rate",
    value: "3.24%",
    change: "-0.4%",
    positive: false,
    icon: IconChartBar,
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
  {
    label: "Page Views",
    value: "184K",
    change: "+24.1%",
    positive: true,
    icon: IconEye,
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
  },
];

const activities = [
  {
    text: ["Sarah Chen", " completed the ", "Q4 Report"],
    color: "#3b82f6",
    time: "2 minutes ago",
  },
  {
    text: ["New signup: ", "Marcus Johnson", " joined the team"],
    color: "#22c55e",
    time: "15 minutes ago",
  },
  {
    text: ["Payment of ", "$2,400", " received from Acme Corp"],
    color: "#f59e0b",
    time: "1 hour ago",
  },
  {
    text: ["Deployment ", "v2.4.1", " is now live"],
    color: "#8b5cf6",
    time: "3 hours ago",
  },
  {
    text: ["Lisa Park", " updated the ", "Design System"],
    color: "#ec4899",
    time: "5 hours ago",
  },
];

const projects = [
  {
    name: "Mobile App Redesign",
    desc: "UI/UX overhaul for iOS and Android",
    icon: "M",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    status: "In Progress",
    statusColor: "#3b82f6",
    statusBg: "rgba(59, 130, 246, 0.12)",
  },
  {
    name: "API Integration",
    desc: "Third-party payment gateway setup",
    icon: "A",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    status: "Completed",
    statusColor: "#22c55e",
    statusBg: "rgba(34, 197, 94, 0.12)",
  },
  {
    name: "Data Migration",
    desc: "Legacy database to cloud migration",
    icon: "D",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    status: "Planning",
    statusColor: "#f59e0b",
    statusBg: "rgba(245, 158, 11, 0.12)",
  },
  {
    name: "Security Audit",
    desc: "Annual compliance and security review",
    icon: "S",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    status: "Pending",
    statusColor: "#a1a5b2",
    statusBg: "rgba(161, 165, 178, 0.08)",
  },
];

function DashboardView() {
  return (
    <>
      <div className={classes.greeting}>
        <h1 className={classes.greetingTitle}>Good morning, Alex</h1>
        <p className={classes.greetingSubtitle}>
          {"Here's what's happening with your projects today."}
        </p>
      </div>

      <div className={classes.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={classes.statCard}>
            <div className={classes.statHeader}>
              <span className={classes.statLabel}>{stat.label}</span>
              <div
                className={classes.statIconWrapper}
                style={{ backgroundColor: stat.bgColor }}
              >
                <stat.icon size={20} stroke={1.6} color={stat.color} />
              </div>
            </div>
            <div className={classes.statValue}>{stat.value}</div>
            <div
              className={`${classes.statChange} ${stat.positive ? classes.statChangePositive : classes.statChangeNegative}`}
            >
              {stat.positive ? (
                <IconArrowUpRight size={14} stroke={2} />
              ) : (
                <IconArrowDownRight size={14} stroke={2} />
              )}
              <span>{stat.change} from last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className={classes.contentGrid}>
        <div className={classes.contentCard}>
          <div className={classes.contentCardHeader}>
            <h3 className={classes.contentCardTitle}>Recent Activity</h3>
            <span className={classes.viewAllLink}>View all</span>
          </div>
          <div className={classes.activityList}>
            {activities.map((activity, index) => (
              <div key={index} className={classes.activityItem}>
                <div
                  className={classes.activityDot}
                  style={{ backgroundColor: activity.color }}
                />
                <div className={classes.activityContent}>
                  <div className={classes.activityText}>
                    {activity.text.map((segment, i) =>
                      i % 2 === 0 ? (
                        <span key={i} className={classes.activityTextBold}>
                          {segment}
                        </span>
                      ) : (
                        <span key={i}>{segment}</span>
                      ),
                    )}
                  </div>
                  <div className={classes.activityTime}>{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={classes.contentCard}>
          <div className={classes.contentCardHeader}>
            <h3 className={classes.contentCardTitle}>Active Projects</h3>
            <span className={classes.viewAllLink}>View all</span>
          </div>
          <div className={classes.projectList}>
            {projects.map((project) => (
              <div key={project.name} className={classes.projectItem}>
                <div
                  className={classes.projectIcon}
                  style={{
                    backgroundColor: project.bgColor,
                    color: project.color,
                    fontWeight: 700,
                  }}
                >
                  {project.icon}
                </div>
                <div className={classes.projectInfo}>
                  <div className={classes.projectName}>{project.name}</div>
                  <div className={classes.projectDesc}>{project.desc}</div>
                </div>
                <span
                  className={classes.projectStatus}
                  style={{
                    backgroundColor: project.statusBg,
                    color: project.statusColor,
                  }}
                >
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}


export function MainContent({ collapsed }: MainContentProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return (
    <main
      className={classes.main}
      style={{ marginLeft: isMobile ? "0px" : collapsed ? "72px" : "260px" }}
    >
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/event-preview" element={<EventPreviewView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/locations" element={<LocationsView />} />
        <Route path="/locations/:venueId" element={<LocationDetailView />} />
        <Route path="/timekeep" element={<TimekeepView />} />
        <Route path="/riders" element={<RidersView />} />
        <Route path="/championships" element={<ChampionshipsView />} />
        <Route path="/championships/:champId" element={<ChampionshipDetailView />} />
        <Route path="/members" element={<MembersView />} />
        <Route path="/dev" element={<DevToolsView />} />
      </Routes>
    </main>
  );
}
