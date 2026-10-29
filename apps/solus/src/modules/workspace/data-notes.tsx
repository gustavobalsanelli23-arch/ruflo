import { Notice } from '@/components/data/states';

/**
 * What the numbers on a screen cannot show, said next to them: missing costs,
 * short history, positions older than the sales. Hidden when there is
 * nothing to say.
 */
export function DataNotes({ notes, title = 'Limites destes números' }: { notes: string[]; title?: string }) {
  if (notes.length === 0) return null;
  return (
    <Notice tone="warning" title={title}>
      <ul className="mt-1 flex flex-col gap-1">
        {notes.map((note) => (
          <li key={note} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-warning" />
            {note}
          </li>
        ))}
      </ul>
    </Notice>
  );
}
