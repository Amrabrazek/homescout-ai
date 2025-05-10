'use client';

import { HeroCover } from '@/components/ui/hero-cover';

export default function HomeHero() {
  // Function to scroll to the search section
  const scrollToSearch = () => {
    // Find the element by ID
    const searchSection = document.getElementById('property-search');

    // Scroll to it if found
    if (searchSection) {
      searchSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <HeroCover
      title='Find Your Dream Property in Egypt'
      subtitle='Browse through our selection of premium properties in the best locations across Egypt.'
      scrollToContent={scrollToSearch}
    />
  );
}
