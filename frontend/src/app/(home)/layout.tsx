import FloatingRedirection from '@/components/ui/floating-redirection';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FloatingRedirection redirectionUrl='/dashboard/units/new' />
    </>
  );
}
