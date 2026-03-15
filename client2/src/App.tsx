import { AppShell } from '@/components/app-shell/AppShell';
import { OrgProvider } from '@/providers/OrgProvider';

export default function App() {
  return (
    <OrgProvider>
      <AppShell />
    </OrgProvider>
  );
}
