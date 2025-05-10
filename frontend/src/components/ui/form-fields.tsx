import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { cn } from '@/lib/utils/ui';
import { Input } from './input';
import { HTMLInputTypeAttribute, ReactElement } from 'react';
import { Checkbox } from './checkbox';
import { formatCurrency } from '@/lib/utils/formatters';
import { Textarea } from './textarea';
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from './select';

export const FormInputField = ({
  name,
  title,
  type = 'text',
  placeholder,
  optional = false,
  disabled = false,
  suffixIcon,
  postfixIcon,
}: {
  name: string;
  title: string;
  i18nKey: string;
  type?: HTMLInputTypeAttribute | undefined;
  placeholder?: string;
  optional?: boolean;
  disabled?: boolean;
  suffixIcon?: ReactElement;
  postfixIcon?: ReactElement;
}) => (
  <FormField
    name={name}
    render={({ field }) => {
      return (
        <FormItem>
          <FormLabel
            className={cn('flex w-full', {
              'justify-between': optional,
              hidden: !title,
            })}
          >
            <div>{title}</div>
            {optional && (
              <div className='font-body text-muted-foreground'>
                {'optional'}
              </div>
            )}
          </FormLabel>

          <FormControl>
            <div className='relative'>
              {suffixIcon && (
                <div className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2'>
                  {suffixIcon}
                </div>
              )}
              <Input
                placeholder={placeholder}
                {...field}
                type={type}
                className={cn('min-h-10', {
                  'pl-8': suffixIcon,
                  'pr-8': postfixIcon,
                })}
                disabled={disabled}
              />
              {postfixIcon && (
                <div className='text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2'>
                  {postfixIcon}
                </div>
              )}
            </div>
          </FormControl>

          <FormMessage />
        </FormItem>
      );
    }}
  />
);

export const FormCheckboxField = ({
  name,
  title,
  disabled = false,
  containerClassName = '',
}: {
  name: string;
  title: string;
  disabled?: boolean;
  containerClassName?: string;
}) => {
  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            'flex flex-row items-start gap-2 space-y-0',
            containerClassName
          )}
        >
          <FormControl>
            <Checkbox
              className='my-auto'
              checked={field.value}
              disabled={disabled}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <FormLabel className='my-2'>{title}</FormLabel>
        </FormItem>
      )}
    />
  );
};

export const PriceWithCurrencyFormField = ({
  name,
  currency,
  title,
  placeholder,
  maximum,
  minimum,
}: {
  name: string;
  currency: string;
  title?: string;
  placeholder?: string;
  maximum?: number;
  minimum?: number;
}) => {
  return (
    <div className='w-full'>
      {title && <FormLabel>{title}</FormLabel>}
      <FormField
        name={name}
        render={({ field }) => (
          <FormItem className='my-auto w-full'>
            <FormControl>
              <div
                className={` focus-within:ring-ring flex h-[40px] w-full rounded-md border focus-within:ring-1`}
              >
                <div className='font-body text-muted-foreground my-auto flex h-10 items-center justify-start p-2 pe-0 text-sm'>
                  {formatCurrency({
                    currencyCode: currency,
                  })}
                </div>
                <Input
                  type='number'
                  max={maximum}
                  min={minimum}
                  placeholder={placeholder}
                  className='border-0 focus-visible:ring-0'
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export const FormTextareaField = ({
  name,
  title,
  className,
}: {
  name: string;
  title: string;
  className?: string;
}) => (
  <FormField
    name={name}
    render={({ field }) => {
      return (
        <FormItem>
          <FormLabel>{title}</FormLabel>

          <FormControl>
            <Textarea
              placeholder={''}
              className={cn('min-h-32', className)}
              {...field}
            />
          </FormControl>

          <FormMessage />
        </FormItem>
      );
    }}
  />
);

/**
 * Renders a select field for a form.
 *
 * @param name - The name of the field.
 * @param i18nKey - The translation key for the label.
 * @param options - The options for the select field.
 * @returns The rendered select field component.
 *
 * @example
 * // To use the FormSelectField component, you can pass the required props as follows:
 * <FormSelectField
 *   name="fieldName"
 *   i18nKey="translationKey"
 *   options={[
 *     { value: "option1", label: "Option 1" },
 *     { value: "option2", label: "Option 2" },
 *     { value: "option3", label: "Option 3" },
 *   ]}
 * />
 */
export const FormSelectField = ({
  name,
  title,
  options,
  placeholder,
  disabled = false,
  className,
  handleOnChange,
}: {
  name: string;
  title: string;
  options: ReadonlyArray<{ value: string; label: string; default?: boolean }>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  handleOnChange?: (value: string) => void;
}) => {
  return (
    <FormField
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem>
          {title && <FormLabel>{title}</FormLabel>}
          <Select
            onValueChange={(value) => {
              handleOnChange?.(value);
              field.onChange(value); // Update form state
            }}
            {...field}
          >
            <FormControl className={className}>
              <SelectTrigger className='shadow-none rtl:flex-row-reverse'>
                <SelectValue placeholder={placeholder ?? ''} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
