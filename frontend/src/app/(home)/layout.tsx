import FloatingRedirection from '@/components/ui/floating-redirection';
import Navbar from '@/components/ui/Navbar';
import pathsConfig from '@/config/paths.config';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className='pt-16'>{children}</div>
      <FloatingRedirection redirectionUrl={pathsConfig.units.new} />
    </>
  );
}
