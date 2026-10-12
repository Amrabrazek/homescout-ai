import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import pathsConfig from '@config/paths.config';
import type { HomeFeed, MatchedUnit } from '@/lib/graphql/feed/types';
import UnitCard from './UnitCard';
import { ReasonChips } from './ReasonChips';

type ForYouRailsProps = {
  feed: HomeFeed;
  savedUnitIds: string[];
};

export default function ForYouRails({ feed, savedUnitIds }: ForYouRailsProps) {
  const saved = new Set(savedUnitIds);
  if (feed.rails.length === 0 && !feed.coldStart) return null;

  return (
    <div className='flex flex-col gap-10 pb-12'>
      {feed.coldStart && <ConciergeNudge />}
      {feed.rails.map((rail) => (
        <section key={rail.section} aria-labelledby={`rail-${rail.section}`}>
          <h2
            id={`rail-${rail.section}`}
            className='mb-4 text-xl font-bold tracking-tight'
          >
            {rail.title}
          </h2>
          <UnitRail items={rail.items} saved={saved} />
        </section>
      ))}
    </div>
  );
}

export function UnitRail({
  items,
  saved,
}: {
  items: MatchedUnit[];
  saved: Set<string>;
}) {
  return (
    <div className='-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 hide-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4'>
      {items.map(({ unit, matchScore, reasons }) => (
        <div
          key={unit.id}
          className='flex w-[260px] shrink-0 snap-start flex-col gap-2 sm:w-auto'
        >
          <UnitCard
            unit={unit}
            saved={saved.has(unit.id)}
            matchScore={matchScore}
          />
          <ReasonChips reasons={reasons} />
        </div>
      ))}
    </div>
  );
}

function ConciergeNudge() {
  return (
    <Link
      href={pathsConfig.home.concierge}
      className='group flex flex-col gap-3 rounded-2xl bg-secondary p-5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between'
    >
      <span className='flex items-center gap-3'>
        <span className='grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'>
          <MessageCircle className='h-4 w-4' />
        </span>
        <span className='flex flex-col'>
          <span className='font-bold'>
            Tell the concierge what you&apos;re looking for
          </span>
          <span className='text-sm text-muted-foreground'>
            Your budget, areas and must-haves turn this page into homes picked
            for you.
          </span>
        </span>
      </span>
      <span className='flex items-center gap-1 text-sm font-bold text-primary'>
        Start a conversation
        <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
      </span>
    </Link>
  );
}
