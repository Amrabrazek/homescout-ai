import { Metadata } from 'next';
import {
  getMyProfile,
  getPreferenceOptions,
  getSavedUnits,
} from '@/lib/graphql/buyer/server';
import { PreferencesPanel } from './_components/PreferencesPanel';

export const metadata: Metadata = { title: 'My preferences' };

export default async function PreferencesPage() {
  const [profile, savedUnits, options] = await Promise.all([
    getMyProfile(),
    getSavedUnits(),
    getPreferenceOptions(),
  ]);

  return (
    <div className='container mx-auto max-w-6xl py-8'>
      <PreferencesPanel
        profile={profile}
        savedUnits={savedUnits}
        options={options}
      />
    </div>
  );
}
