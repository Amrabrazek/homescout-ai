import type { Metadata } from 'next';
import { AppSidebar } from './_components/Sidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Nawy',
  description: 'Manage your real estate properties, projects, and users',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        <SidebarTrigger />
        <div className='flex-1'>{children}</div>
      </main>
    </SidebarProvider>
  );
}
