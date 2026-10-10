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
    <section className={cn('rounded-2xl border bg-card', className)}>
      <div className='flex flex-col gap-0.5 border-b px-5 py-4'>
        <h2 className='font-bold'>{title}</h2>
        {subtitle && (
          <p className='text-sm text-muted-foreground'>{subtitle}</p>
        )}
      </div>
      <div className='flex flex-col px-1 py-1'>{children}</div>
    </section>
  );
}

export default FormSectionFieldsContainer;
