import React from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    // Set initial value
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Use the newer addEventListener
    media.addEventListener('change', listener);

    // Cleanup by removing the listener
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
