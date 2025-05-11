import { cn } from '@/lib/utils/ui';
import { Button, ButtonProps } from './button';

const IconButton = (props: ButtonProps) => {
  const { className, ...other } = props;

  return (
    <Button
      className={cn(
        'bg-background text-foreground hover:bg-accent/50 h-10 w-10 rounded-md border p-0 shadow-none outline-none focus:outline-none [&>svg]:w-4',
        className
      )}
      {...other}
    />
  );
};

export default IconButton;
