import type { Metadata } from 'next';
import { LegalDocument, Section } from '@/modules/legal/legal-shell';

export const metadata: Metadata = { title: 'Política de cookies' };

const COOKIES = [
  { name: 'sb-…-auth-token', purpose: 'Mantém você conectado com segurança.', duration: 'Até você sair da conta (no máximo 400 dias)' },
  { name: 'solus-org', purpose: 'Lembra qual organização está aberta.', duration: '1 ano' },
  { name: 'solus-convite', purpose: 'Guarda um convite enquanto você entra ou cria a conta.', duration: '24 horas' },
  { name: 'solus-recuperacao', purpose: 'Permite criar uma nova senha depois de abrir o link de recuperação.', duration: '15 minutos' },
  { name: 'solus-demo-ia', purpose: 'Libera o analista de IA na demonstração para quem tem o código de acesso.', duration: '7 dias' },
];

const STORAGE = [
  { name: 'theme', purpose: 'Tema claro ou escuro escolhido.' },
  { name: 'solus-sidebar', purpose: 'Menu lateral aberto ou recolhido.' },
  { name: 'solus-aviso-cookies', purpose: 'Registra que você já viu o aviso de cookies.' },
];

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Política de cookies"
      intro={
        <p>
          O SOLUS usa apenas cookies estritamente necessários para funcionar. Não usamos cookies de análise, de publicidade ou de
          terceiros. Por isso eles não dependem de consentimento, e não há nada para ligar ou desligar.
        </p>
      }
    >
      <Section title="Cookies">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Cookies usados pelo SOLUS</caption>
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Nome</th>
                <th scope="col" className="py-2 pr-4 font-medium">Para que serve</th>
                <th scope="col" className="py-2 font-medium">Duração</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((cookie) => (
                <tr key={cookie.name} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-4 font-mono text-[13px]">{cookie.name}</td>
                  <td className="py-2 pr-4">{cookie.purpose}</td>
                  <td className="py-2">{cookie.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Todos são do próprio SOLUS, protegidos contra leitura por scripts (HttpOnly) e enviados só ao SOLUS.</p>
      </Section>

      <Section title="Armazenamento no navegador">
        <p>Algumas preferências ficam no armazenamento local do navegador, sem sair do seu aparelho:</p>
        <ul>
          {STORAGE.map((item) => (
            <li key={item.name}>
              <code className="font-mono text-[13px]">{item.name}</code>: {item.purpose}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Como apagar">
        <p>
          Você pode apagar cookies e dados do site nas configurações do navegador. Ao apagar os cookies de sessão, você sai da conta e
          precisa entrar de novo.
        </p>
      </Section>
    </LegalDocument>
  );
}
