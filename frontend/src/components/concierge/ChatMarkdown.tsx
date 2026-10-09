import { Fragment } from 'react';

/** Just enough Markdown for chat replies: paragraphs, bullets, bold and tables. */
export function ChatMarkdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className='space-y-2'>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        if (isTable(lines)) return <Table key={i} lines={lines} />;
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

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_DIVIDER = /^\s*\|(\s*:?-+:?\s*\|)+\s*$/;

function isTable(lines: string[]) {
  return (
    lines.length >= 2 &&
    lines.every((l) => TABLE_ROW.test(l)) &&
    TABLE_DIVIDER.test(lines[1])
  );
}

function cells(line: string) {
  return line.trim().slice(1, -1).split('|').map((c) => c.trim());
}

function Table({ lines }: { lines: string[] }) {
  const [head, , ...rows] = lines.map(cells);
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-left text-xs'>
        <thead>
          <tr className='border-b'>
            {head.map((c, i) => (
              <th key={i} className='px-2 py-1 font-semibold'>
                <Inline text={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className='border-b last:border-0'>
              {row.map((c, j) => (
                <td key={j} className='px-2 py-1 align-top'>
                  <Inline text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
