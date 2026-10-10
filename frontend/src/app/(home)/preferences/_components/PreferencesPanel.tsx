'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Eye, Heart, RotateCcw, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { FormInputField } from '@/components/ui/form-fields';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import UnitCard from '@/app/(home)/_components/UnitCard';
import pathsConfig from '@config/paths.config';
import { cn } from '@/lib/utils/ui';
import { humanize } from '@/lib/buyer/fit';
import {
  resetProfile,
  unsaveUnit,
  updatePreferences,
} from '@/lib/graphql/buyer/actions';
import {
  PreferencesFormInput,
  preferencesSchema,
} from '@/lib/graphql/buyer/schema';
import {
  BuyerProfile,
  PreferenceOptions,
  PROPERTY_TYPES,
} from '@/lib/graphql/buyer/types';
import type { Unit } from '@/lib/graphql/units/types';

type PreferencesPanelProps = {
  profile: BuyerProfile;
  savedUnits: Unit[];
  options: PreferenceOptions;
};

const toFormValues = (profile: BuyerProfile): PreferencesFormInput => ({
  budgetMin: profile.budgetMin ?? '',
  budgetMax: profile.budgetMax ?? '',
  areas: profile.areas,
  propertyTypes: profile.propertyTypes,
  minRooms: profile.minRooms ?? '',
  minSize: profile.minSize ?? '',
  amenityIds: profile.amenityIds,
});

export function PreferencesPanel({
  profile,
  savedUnits,
  options,
}: PreferencesPanelProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const form = useForm<PreferencesFormInput>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: toFormValues(profile),
  });

  const onSubmit = async (values: PreferencesFormInput) => {
    setSaving(true);
    const result = await updatePreferences(values);
    setSaving(false);
    if (result.success) {
      form.reset(toFormValues(result.data));
      toast.success('Preferences saved');
    } else {
      toast.error(result.error);
    }
  };

  const onReset = async () => {
    const result = await resetProfile();
    if (result.success) {
      form.reset(toFormValues(result.data));
      toast.success('Your preferences and history were cleared');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const onUnsave = async (unitId: string) => {
    const result = await unsaveUnit(unitId);
    if (result.success) router.refresh();
    else toast.error(result.error);
  };

  const { views, saves, skips } = profile.activity;
  const dirty = form.formState.isDirty;

  return (
    <div className='space-y-12'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-3xl font-extrabold tracking-tight'>
            My preferences
          </h1>
          <p className='mt-1 max-w-2xl text-muted-foreground'>
            What you tell us, plus what we learn from the homes you view, save
            and skip. You can change or clear any of it.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='ghost' className='self-start rounded-full'>
              <RotateCcw className='mr-2 h-4 w-4' /> Start over
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start over?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears your preferences, saved homes and viewing history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onReset}>Clear all</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className='grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]'>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='order-2 rounded-2xl border lg:order-1'
          >
            <Section title='Budget and size'>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <FormInputField
                  name='budgetMin'
                  title='Min budget (EGP)'
                  i18nKey='budgetMin'
                  type='number'
                  optional
                />
                <FormInputField
                  name='budgetMax'
                  title='Max budget (EGP)'
                  i18nKey='budgetMax'
                  type='number'
                  optional
                />
                <FormInputField
                  name='minRooms'
                  title='Min bedrooms'
                  i18nKey='minRooms'
                  type='number'
                  optional
                />
                <FormInputField
                  name='minSize'
                  title='Min size (m²)'
                  i18nKey='minSize'
                  type='number'
                  optional
                />
              </div>
            </Section>
            <Section title='Home type'>
              <ChipGroup
                label='Home type'
                name='propertyTypes'
                options={PROPERTY_TYPES.map((t) => ({
                  id: t,
                  name: humanize(t),
                }))}
              />
            </Section>
            <Section title='Areas'>
              <ChipGroup
                label='Areas'
                name='areas'
                options={options.areas.map((a) => ({ id: a, name: a }))}
              />
            </Section>
            <Section title='Must-have amenities'>
              <ChipGroup
                label='Must-have amenities'
                name='amenityIds'
                options={options.amenities}
              />
            </Section>

            <div
              className={cn(
                'flex items-center justify-end gap-2 rounded-b-2xl border-t bg-background/95 px-5 py-3 backdrop-blur lg:sticky lg:bottom-0',
                dirty && 'shadow-[0_-4px_12px_-6px_rgb(0_0_0/0.12)]'
              )}
            >
              {dirty && (
                <span className='mr-auto text-sm text-muted-foreground'>
                  Unsaved changes
                </span>
              )}
              <Button
                type='button'
                variant='ghost'
                className='rounded-full'
                disabled={!dirty || saving}
                onClick={() => form.reset()}
              >
                Discard
              </Button>
              <Button
                type='submit'
                className='rounded-full px-6'
                disabled={saving || !dirty}
              >
                {saving ? 'Saving…' : 'Save preferences'}
              </Button>
            </div>
          </form>
        </Form>

        <aside className='order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start'>
          <div className='rounded-2xl bg-accent/60 p-5'>
            <h2 className='font-bold'>What we learned</h2>
            <div className='mt-4 grid grid-cols-3 gap-2'>
              <Stat icon={Eye} label='Viewed' value={views} />
              <Stat icon={Heart} label='Saved' value={saves} />
              <Stat icon={ThumbsDown} label='Skipped' value={skips} />
            </div>
            <p className='mt-4 text-sm text-muted-foreground'>
              {profile.hasTasteVector
                ? 'We use these to rank homes that match your taste.'
                : 'View or save a few homes and we will start learning your taste.'}
            </p>
            <Link
              href={pathsConfig.home.index}
              className='mt-3 inline-block text-sm font-semibold text-primary hover:underline'
            >
              Browse homes
            </Link>
          </div>
        </aside>
      </div>

      <section>
        <h2 className='mb-5 text-xl font-bold tracking-tight'>
          Saved homes
          {savedUnits.length > 0 && (
            <span className='ml-2 text-base font-semibold text-muted-foreground'>
              {savedUnits.length}
            </span>
          )}
        </h2>
        {savedUnits.length === 0 ? (
          <div className='rounded-2xl border border-dashed p-10 text-center'>
            <Heart className='mx-auto h-8 w-8 text-muted-foreground/50' />
            <p className='mt-3 text-muted-foreground'>
              Homes you save with the heart show up here.
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4'>
            {savedUnits.map((unit) => (
              <div key={unit.id} className='flex flex-col gap-1'>
                <UnitCard unit={unit} saved />
                <button
                  type='button'
                  onClick={() => onUnsave(unit.id)}
                  className='self-start px-0.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className='border-b p-5 last-of-type:border-b-0'>
      <h2 className='mb-4 font-bold'>{title}</h2>
      {children}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className='rounded-xl bg-background px-3 py-2.5'>
      <Icon className='h-4 w-4 text-primary' />
      <div className='mt-1 text-xl font-extrabold tabular-nums'>{value}</div>
      <div className='text-xs text-muted-foreground'>{label}</div>
    </div>
  );
}

function ChipGroup({
  label,
  name,
  options,
}: {
  label: string;
  name: keyof Pick<
    PreferencesFormInput,
    'areas' | 'propertyTypes' | 'amenityIds'
  >;
  options: { id: string; name: string }[];
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        const selected: string[] = field.value ?? [];
        const toggle = (id: string) =>
          field.onChange(
            selected.includes(id)
              ? selected.filter((value) => value !== id)
              : [...selected, id]
          );
        return (
          <FormItem
            role='group'
            aria-label={label}
            className='flex flex-wrap gap-2 space-y-0'
          >
            {options.map((option) => {
              const on = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type='button'
                  aria-pressed={on}
                  onClick={() => toggle(option.id)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    on
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'hover:border-foreground/40'
                  )}
                >
                  {option.name}
                </button>
              );
            })}
          </FormItem>
        );
      }}
    />
  );
}
