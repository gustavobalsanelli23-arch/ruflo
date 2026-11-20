/**
 * Bot trap for the forms that send e-mail (sign-up, password recovery). The
 * field is off-screen, out of the tab order and hidden from assistive
 * technology, so people never fill it; form-filling bots usually do. The
 * action then answers exactly as on success, without sending anything.
 */
export const HONEYPOT_FIELD = 'referencia_extra';

export function Honeypot() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden">
      <label>
        Não preencha este campo
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
