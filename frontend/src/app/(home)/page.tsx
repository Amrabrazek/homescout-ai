import Home from './_components/Home';
import { getMyProfile } from '@/lib/graphql/buyer/server';

export const metadata = {
  title: 'Find a home that fits how you live | HomeScout AI',
  description:
    'Describe the home you want in your own words. HomeScout AI searches apartments, villas and chalets across Egypt by meaning, not just filters.',
  keywords: [
    'property',
    'real estate',
    'apartments',
    'homes',
    'Egypt',
    'HomeScout AI',
  ],
  openGraph: {
    title: 'Find a home that fits how you live | HomeScout AI',
    description:
      'Describe the home you want in your own words. HomeScout AI finds it across Egypt.',
  },
};

async function savedUnitIds(): Promise<string[]> {
  try {
    return (await getMyProfile()).savedUnitIds;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  return (
    <main className='container min-h-screen'>
      <Home savedUnitIds={await savedUnitIds()} />
    </main>
  );
}
