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
    <SidebarProvider
      style={
        {
          '--sidebar-width': '16rem',
          '--sidebar-width-mobile': '18rem',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <main className='w-full'>
        <div className='sticky top-0 z-10'>
          <SidebarTrigger />
        </div>
        <div className='w-full min-w-0'>{children}</div>
      </main>
    </SidebarProvider>
  );
}
