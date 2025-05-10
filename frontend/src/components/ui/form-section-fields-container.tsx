'use client';

import React from 'react';

import { cn } from '@/lib/utils/ui';

interface FormSectionFieldsContainerProps {
  children: React.ReactNode;
  title: string;
  className?: string;
  subtitle?: string;
}

function FormSectionFieldsContainer({
  children,
  title,
  subtitle,
  className,
}: FormSectionFieldsContainerProps) {
  return (
    <div
      className={cn(
        'border-muted flex flex-col gap-1 rounded-[10px] border bg-[#F4F4F5] p-1',
        className
      )}
    >
      <div className='flex flex-col gap-2 p-1 ps-4'>
        <div className='text-md'>{title}</div>
        {subtitle && (
          <div className='font-body text-muted-foreground text-sm'>
            {subtitle}
          </div>
        )}
      </div>
      <div className='flex flex-col rounded-md border bg-white'>{children}</div>
    </div>
  );
}

export default FormSectionFieldsContainer;
