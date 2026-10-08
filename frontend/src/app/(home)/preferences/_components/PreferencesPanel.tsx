'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
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

const label = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

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

  return (
    <div className='space-y-10'>
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>My preferences</h1>
          <p className='text-gray-600 mt-1'>
            What you tell us, plus what we learn from the units you view, save
            and skip. You can change or clear any of it.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='outline'>
              <RotateCcw size={16} className='mr-2' /> Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start over?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears your preferences, saved units and viewing history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onReset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <section className='bg-white p-6 rounded-lg shadow-sm'>
        <h2 className='font-semibold text-lg mb-2'>What we learned</h2>
        <p className='text-gray-700'>
          You viewed {views} {views === 1 ? 'unit' : 'units'}, saved {saves} and
          skipped {skips}.{' '}
          {profile.hasTasteVector
            ? 'We use these to rank units that match your taste.'
            : 'Save or view a few units and we will start learning your taste.'}
        </p>
      </section>

      <section className='bg-white p-6 rounded-lg shadow-sm'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                title='Min size (sqm)'
                i18nKey='minSize'
                type='number'
                optional
              />
            </div>

            <CheckboxGroup
              name='propertyTypes'
              title='Property types'
              options={PROPERTY_TYPES.map((t) => ({ id: t, name: label(t) }))}
            />
            <CheckboxGroup
              name='areas'
              title='Areas'
              options={options.areas.map((a) => ({ id: a, name: a }))}
            />
            <CheckboxGroup
              name='amenityIds'
              title='Must-have amenities'
              options={options.amenities}
            />

            <Button type='submit' disabled={saving || !form.formState.isDirty}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          </form>
        </Form>
      </section>

      <section>
        <h2 className='text-xl font-bold mb-4'>Saved units</h2>
        {savedUnits.length === 0 ? (
          <p className='text-gray-600'>
            Units you save with the heart button show up here.
          </p>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {savedUnits.map((unit) => (
              <div key={unit.id} className='flex flex-col gap-2'>
                <UnitCard unit={unit} />
                <Button variant='ghost' onClick={() => onUnsave(unit.id)}>
                  Remove from saved
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CheckboxGroup({
  name,
  title,
  options,
}: {
  name: keyof Pick<
    PreferencesFormInput,
    'areas' | 'propertyTypes' | 'amenityIds'
  >;
  title: string;
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
          <FormItem>
            <FormLabel>{title}</FormLabel>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-2 mt-2'>
              {options.map((option) => (
                <label
                  key={option.id}
                  className='flex items-center gap-2 text-sm cursor-pointer'
                >
                  <Checkbox
                    checked={selected.includes(option.id)}
                    onCheckedChange={() => toggle(option.id)}
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </FormItem>
        );
      }}
    />
  );
}
