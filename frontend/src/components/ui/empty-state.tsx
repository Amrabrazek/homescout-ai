import React, { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button } from './button';

type EmptyStateAction = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
};

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  suggestions?: string[];
};

export function EmptyState({
  icon = <Search className='h-10 w-10 text-gray-400' />,
  title,
  description,
  actions = [],
  suggestions = [],
}: EmptyStateProps) {
  return (
    <div className='bg-white p-10 rounded-lg shadow-sm text-center max-w-lg mx-auto'>
      <div className='w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6'>
        {icon}
      </div>
      <h3 className='text-xl font-semibold mb-3'>{title}</h3>
      <p className='text-gray-500 mb-8'>{description}</p>

      {actions.length > 0 && (
        <div className='flex flex-wrap gap-4 justify-center'>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              className='flex items-center gap-2 px-6 py-3 text-base'
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className='mt-8 text-sm text-gray-500'>
          <p className='font-medium mb-2'>Suggestions:</p>
          <ul className='list-disc pl-5 text-left inline-block'>
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
