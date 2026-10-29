import { signOutAction } from '@/modules/auth/actions';

/** Who is signed in on the focused flows (onboarding, invitation), with a way out. */
export function SignedInAs({ email }: { email: string }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-5 text-sm text-muted-foreground">
      <p className="min-w-0 truncate">
        Conectado como <span className="font-medium text-foreground">{email}</span>
      </p>
      <form action={signOutAction}>
        <button type="submit" className="font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline">
          Sair
        </button>
      </form>
    </div>
  );
}
