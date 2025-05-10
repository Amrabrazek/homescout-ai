import UnitSearch from './_components/UnitSearch';
import HomeHero from './_components/HomeHero';

// Page metadata for SEO
export const metadata = {
  title: 'Find Your Dream Property | Nawy',
  description:
    'Browse our selection of premium properties, apartments, and villas across Egypt. Find your perfect home with advanced filtering options.',
  keywords: ['property', 'real estate', 'apartments', 'homes', 'Egypt', 'Nawy'],
  openGraph: {
    title: 'Find Your Dream Property | Nawy',
    description:
      'Browse our selection of premium properties, apartments, and villas across Egypt.',
  },
};

export default function Home() {
  return (
    <main className='min-h-screen bg-gray-50'>
      {/* Hero section with scroll functionality */}
      <HomeHero />

      <div className='container mx-auto py-8' id='property-search'>
        <h1 className='text-3xl font-bold mb-6'>Find Your Dream Property</h1>

        {/* UnitSearch is a client component, while the page itself is server-rendered */}
        <UnitSearch />
      </div>
    </main>
  );
}
