import { redirect } from 'next/navigation';

/** The demonstration has no page of its own: it opens on the executive view. */
export default function DemoHome() {
  redirect('/demo/visao-geral');
}
