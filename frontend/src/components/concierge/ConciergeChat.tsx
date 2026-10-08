'use client';

import { useChat } from '@ai-sdk/react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { RotateCcw, SendHorizontal, Sparkles, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/ui';
import { conciergeChat } from './chat';
import { ChatMarkdown } from './ChatMarkdown';
import { isToolPart, ToolResult } from './ToolResult';

const STARTERS = [
  'Family of 4, New Cairo or Zayed, under 10M, need schools',
  'A sea-view chalet on the North Coast',
  'Ready-to-move 2-bedroom apartment under 6M',
];

export function ConciergeChat({ className }: { className?: string }) {
  const router = useRouter();
  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    chat: conciergeChat,
    onFinish: ({ message }) => {
      const changed = message.parts.some(
        (p) =>
          (p.type === 'tool-update_preferences' ||
            p.type === 'tool-save_unit') &&
          p.state === 'output-available'
      );
      if (changed) router.refresh();
    },
  });
  const [input, setInput] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text: text.trim() });
    setInput('');
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className='flex-1 space-y-4 overflow-y-auto p-4'>
        {messages.length === 0 && (
          <div className='space-y-3 text-sm'>
            <p className='flex items-center gap-2 font-medium'>
              <Sparkles className='h-4 w-4 text-primary' />
              Tell me what home you are looking for.
            </p>
            <div className='flex flex-col gap-2'>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className='rounded-lg border px-3 py-2 text-left hover:bg-muted'
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'space-y-2 text-sm',
              message.role === 'user' &&
                'ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground'
            )}
          >
            {message.parts.map((part, i) => {
              if (part.type === 'text') {
                return message.role === 'user' ? (
                  <p key={i} className='whitespace-pre-wrap'>
                    {part.text}
                  </p>
                ) : (
                  <ChatMarkdown key={i} text={part.text} />
                );
              }
              if (isToolPart(part)) return <ToolResult key={i} part={part} />;
              return null;
            })}
          </div>
        ))}

        {status === 'submitted' && (
          <p className='text-xs text-muted-foreground'>Thinking…</p>
        )}
        {error && (
          <p className='text-xs text-destructive'>
            {error.message || 'Something went wrong. Please try again.'}
          </p>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={onSubmit} className='flex items-end gap-2 border-t p-3'>
        {messages.length > 0 && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => setMessages([])}
            disabled={busy}
            aria-label='New chat'
            title='New chat'
          >
            <RotateCcw className='h-4 w-4' />
          </Button>
        )}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder='Budget, area, bedrooms, must-haves…'
          rows={1}
          className='max-h-32 min-h-[40px] resize-none'
        />
        {busy ? (
          <Button type='button' size='icon' onClick={stop} aria-label='Stop'>
            <Square className='h-4 w-4' />
          </Button>
        ) : (
          <Button
            type='submit'
            size='icon'
            disabled={!input.trim()}
            aria-label='Send'
          >
            <SendHorizontal className='h-4 w-4' />
          </Button>
        )}
      </form>
    </div>
  );
}
