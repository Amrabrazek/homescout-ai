'use client';

import React from 'react';
import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';

interface BadgeItem {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | null;
}

interface PageHeaderProps {
  isEditing: boolean;
  entityName: string;
  title?: string | null;
  redirectUrl: string;
  badges?: BadgeItem[] | null;
  extraButtons?: React.ReactNode;
  onSubmit: () => void;
  loading?: boolean;
  showActionButtons?: boolean;
}

export function FormPageHeader({
  isEditing,
  entityName,
  title,
  redirectUrl,
  badges,
  extraButtons,
  onSubmit,
  loading = false,
  showActionButtons = true,
}: PageHeaderProps) {
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const { reset, formState } = useFormContext();

  const isDirty = !!Object.keys(formState.dirtyFields).length;
  const headerTitle = isEditing ? title ?? '' : `New ${entityName}`;

  return (
    <div className='bg-background form-header sticky top-0 w-full sm:-top-2'>
      {/* Desktop header */}
      <div className='hidden flex-1 items-start gap-4 px-8 py-6 sm:grid sm:gap-8'>
        <div className='flex items-center gap-2'>
          <div className='flex grow items-center gap-4'>
            <Link href={redirectUrl}>
              <Button variant='outline' size='icon' className='flex'>
                <ArrowLeft width={18} height={15} />
              </Button>
            </Link>
            <div className='text-sm'>{headerTitle}</div>
            {badges && badges.length > 0 && (
              <div className='flex gap-2'>
                {badges.map((badge, index) => (
                  <Badge
                    key={index}
                    variant={badge.variant}
                    className='rounded-full font-normal'
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className='flex gap-2'>
            {extraButtons ?? null}

            {showActionButtons && (
              <>
                <Button
                  variant='outline'
                  className='h-[40px] px-4 py-2'
                  onClick={() => reset()}
                  disabled={!isDirty}
                >
                  Discard
                </Button>

                <Button
                  className='h-[40px] px-4 py-2'
                  onClick={onSubmit}
                  disabled={(!isDirty && isEditing) || loading}
                  id={isLargeScreen ? 'catalogDetailsTour-step4' : ''}
                >
                  {isEditing ? 'Update' : 'Create'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className='grid h-[50px] flex-1 items-start gap-4 border-b-[1px] px-0 sm:hidden'>
        <div className='my-auto flex h-full items-center gap-2 pe-2'>
          <div className='flex grow items-center'>
            <Link href={redirectUrl}>
              <Button
                variant='link'
                className='flex h-[50px] w-[50px] p-1 px-3'
              >
                <ArrowLeft size={24} />
              </Button>
            </Link>
            <div className='text-md line-clamp-1'>{headerTitle}</div>
          </div>
          <div className='flex gap-1'>
            {extraButtons ?? null}
            <Button
              size='sm'
              onClick={onSubmit}
              disabled={!isDirty}
              id={isLargeScreen ? '' : 'catalogDetailsTour-step4'}
            >
              {isEditing ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
