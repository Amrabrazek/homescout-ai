'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Check,
  MessageCircle,
  Pencil,
  Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDescription } from '@/components/ui/card';
import { formatArea, formatPrice } from '@/lib/utils/formatters';
import { humanize } from '@/lib/buyer/fit';
import type { BuyerProfile } from '@/lib/graphql/buyer/types';
import type { SimilarUnit, Unit } from '@/lib/graphql/units/types';
import pathsConfig from '@config/paths.config';
import ContactModal from './ContactModal';
import { SimilarUnits } from './SimilarUnits';
import { BuyerActions } from './BuyerActions';
import { UnitGallery } from './UnitGallery';
import { WhyItFits } from './WhyItFits';
import { monthlyInstallment, PaymentPlan } from './PaymentPlan';

type UnitDetailsProps = {
  unit: Unit;
  profile: BuyerProfile | null;
  similarUnits: SimilarUnit[];
};

export default function UnitDetails({
  unit,
  profile,
  similarUnits,
}: UnitDetailsProps) {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const initialSaved = !!profile?.savedUnitIds.includes(unit.id);
  const location = [unit.project.area, unit.project.city]
    .filter(Boolean)
    .join(', ');
  const pricePerM2 = Number(unit.price) / Number(unit.floorArea);
  const monthly = monthlyInstallment(unit);
  const tags = [
    unit.propertyType && humanize(unit.propertyType),
    unit.finishing && humanize(unit.finishing),
    unit.view && `${humanize(unit.view)} view`,
  ].filter((tag): tag is string => !!tag);

  return (
    <div className='container mx-auto max-w-6xl py-6 md:py-8'>
      <Link
        href={pathsConfig.home.index}
        className='mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground'
      >
        <ArrowLeft className='h-4 w-4' />
        All homes
      </Link>

      <UnitGallery images={unit.images} name={unit.name} />

      <div className='mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-12'>
        <div className='min-w-0 space-y-8'>
          <header>
            <h1 className='text-2xl font-extrabold tracking-tight md:text-3xl'>
              {unit.name}
            </h1>
            <p className='mt-1 text-muted-foreground'>
              {unit.project.name}
              {location && ` · ${location}`} · by {unit.project.developer.name}
            </p>
            <p className='mt-3 text-xl font-extrabold tabular-nums lg:hidden'>
              {formatPrice(Number(unit.price))}
              {monthly != null && (
                <span className='ml-2 text-sm font-semibold text-primary'>
                  or {formatPrice(monthly)}/mo
                </span>
              )}
            </p>
            {tags.length > 0 && (
              <div className='mt-3 flex flex-wrap gap-2'>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className='rounded-full bg-muted px-3 py-1 text-xs font-semibold'
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <dl className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            <Fact icon={BedDouble} label='Bedrooms' value={unit.rooms} />
            <Fact icon={Bath} label='Bathrooms' value={unit.bathrooms} />
            <Fact
              icon={Ruler}
              label='Area'
              value={formatArea(Number(unit.floorArea))}
            />
            <Fact
              icon={Building2}
              label='Floor'
              value={unit.floor ? unit.floor : 'Ground'}
            />
          </dl>

          <WhyItFits profile={profile} unit={unit} />

          <section>
            <h2 className='mb-3 text-lg font-bold'>About this home</h2>
            {unit.description ? (
              <CardDescription
                html={unit.description}
                className='leading-relaxed text-foreground/80'
              />
            ) : (
              <p className='text-muted-foreground'>
                No description for this home yet.
              </p>
            )}
          </section>

          {unit.amenities.length > 0 && (
            <section>
              <h2 className='mb-3 text-lg font-bold'>What it offers</h2>
              <ul className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
                {unit.amenities.map((amenity) => (
                  <li key={amenity.id} className='flex items-center gap-3'>
                    {amenity.icon ? (
                      <span
                        className='grid h-5 w-5 place-items-center text-primary [&_svg]:h-5 [&_svg]:w-5'
                        dangerouslySetInnerHTML={{ __html: amenity.icon }}
                      />
                    ) : (
                      <Check className='h-5 w-5 text-primary' />
                    )}
                    {amenity.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className='flex items-center justify-between border-t pt-4 text-xs text-muted-foreground'>
            <span>Unit {unit.number}</span>
            <Link
              href={pathsConfig.units.edit.replace('[id]', unit.id)}
              className='inline-flex items-center gap-1 hover:text-foreground'
            >
              <Pencil className='h-3 w-3' />
              Edit listing
            </Link>
          </div>
        </div>

        <aside className='lg:sticky lg:top-24 lg:self-start'>
          <div className='space-y-5 rounded-2xl border p-5 shadow-sm'>
            <div>
              <div className='text-3xl font-extrabold tracking-tight tabular-nums'>
                {formatPrice(Number(unit.price))}
              </div>
              <div className='mt-0.5 text-sm text-muted-foreground tabular-nums'>
                {formatPrice(pricePerM2)} per m²
              </div>
            </div>

            <PaymentPlan unit={unit} />

            <div className='space-y-2'>
              <Button
                className='h-11 w-full rounded-full text-base font-semibold'
                onClick={() => setContactModalOpen(true)}
              >
                Contact agent
              </Button>
              <Button
                variant='outline'
                className='h-11 w-full rounded-full border-0 bg-[#25D366] text-base font-semibold text-white hover:bg-[#1ebe5a] hover:text-white'
                onClick={() =>
                  window.open(`https://wa.me/201099902278`, '_blank')
                }
              >
                <MessageCircle className='mr-2 h-5 w-5' />
                WhatsApp
              </Button>
            </div>

            <BuyerActions unitId={unit.id} initialSaved={initialSaved} />
          </div>
        </aside>
      </div>

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        unitId={unit.id}
        unitName={unit.name}
      />

      <SimilarUnits items={similarUnits} savedUnitIds={profile?.savedUnitIds} />
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className='rounded-xl border px-4 py-3'>
      <dt className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
        <Icon className='h-3.5 w-3.5' />
        {label}
      </dt>
      <dd className='mt-0.5 text-lg font-bold tabular-nums'>{value}</dd>
    </div>
  );
}

export function UnitDetailSkeleton() {
  return (
    <div className='container mx-auto max-w-6xl py-6 md:py-8'>
      <Skeleton className='mb-4 h-5 w-24' />
      <Skeleton className='aspect-[4/3] w-full rounded-2xl md:aspect-auto md:h-[440px]' />
      <div className='mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-12'>
        <div className='space-y-6'>
          <div className='space-y-2'>
            <Skeleton className='h-8 w-2/3' />
            <Skeleton className='h-5 w-1/2' />
          </div>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-[68px] rounded-xl' />
            ))}
          </div>
          <Skeleton className='h-40 rounded-2xl' />
        </div>
        <Skeleton className='h-[420px] rounded-2xl' />
      </div>
    </div>
  );
}
