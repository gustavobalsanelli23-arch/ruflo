import { redirect } from 'next/navigation';

/** Endereço antigo da página de dados pessoais. */
export default function Page() {
  redirect('/conta/perfil');
}
