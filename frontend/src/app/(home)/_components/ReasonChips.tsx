export function ReasonChips({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className='flex flex-wrap gap-1 px-0.5'>
      {reasons.map((reason) => (
        <span
          key={reason}
          className='rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground'
        >
          {reason}
        </span>
      ))}
    </div>
  );
}
