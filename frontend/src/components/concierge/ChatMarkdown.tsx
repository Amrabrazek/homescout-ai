import { Fragment } from 'react';

/** Just enough Markdown for chat replies: paragraphs, bullets and bold. */
export function ChatMarkdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className='space-y-2'>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className='list-disc pl-5 space-y-1'>
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.replace(/^\s*([-*]|\d+\.)\s+/, '')} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className='whitespace-pre-wrap'>
            <Inline text={block.replace(/^#+\s*/gm, '')} />
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}
