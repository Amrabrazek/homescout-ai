import FloatingRedirection from '@/components/ui/floating-redirection';
import pathsConfig from '@/config/paths.config';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FloatingRedirection redirectionUrl={pathsConfig.units.new} />
    </>
  );
}
