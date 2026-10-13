import { Footer } from './components/Footer';
import { business, logo } from './data/site';

const UPDATED = '13 de outubro de 2026';

/** Política de privacidade: o que o site coleta (medição) e o que não coleta (formulário). */
export function PrivacyPage() {
  return (
    <>
      <header className="bg-ink text-bone">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 md:px-10">
          <a href="/" aria-label="VIP body & hair — voltar ao início">
            <img src={logo.monoWhite.src} width={logo.monoWhite.width} height={logo.monoWhite.height} alt="" className="h-10 w-auto" />
          </a>
          <a href="/" className="eyebrow link-line text-[0.6rem]">
            Voltar ao site
          </a>
        </div>
      </header>
      <main id="conteudo" className="bg-paper py-20 md:py-28">
        <article className="mx-auto max-w-2xl px-5 text-stone [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-ink [&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <p className="eyebrow text-[0.6rem]">Atualizada em {UPDATED}</p>
          <h1 className="display mt-6 text-5xl text-ink md:text-6xl">
            Política de <em>privacidade</em>
          </h1>
          <p>
            Esta política explica como o site do {business.name} trata informações pessoais, em conformidade com a Lei
            Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>

          <h2>Formulário de agendamento</h2>
          <p>
            O formulário do site não armazena nem envia seus dados a nenhum servidor. Ao tocar em “Enviar pelo WhatsApp”,
            ele apenas monta uma mensagem com as informações que você digitou e abre o WhatsApp no seu aparelho. A
            mensagem só chega ao salão se você decidir enviá-la. A partir daí, a conversa segue as políticas do WhatsApp.
          </p>

          <h2>Ferramentas de medição</h2>
          <p>
            Para entender o uso do site e medir o resultado de anúncios, utilizamos o Google Tag Manager e o Meta Pixel
            (Facebook/Instagram). Essas ferramentas podem usar cookies e identificadores para registrar, por exemplo,
            visitas às páginas e cliques nos botões de contato. Elas só são carregadas depois que você interage com a
            página.
          </p>
          <ul>
            <li>Você pode bloquear ou apagar cookies nas configurações do seu navegador.</li>
            <li>As preferências de anúncios podem ser ajustadas nas suas contas do Google e da Meta.</li>
          </ul>

          <h2>Conteúdos de terceiros</h2>
          <p>
            O mapa da seção de contato é fornecido pelo Google Maps e é carregado apenas quando a seção se aproxima da área
            visível da tela. Links para Instagram, Facebook, WhatsApp, Google Maps e Waze levam a serviços com políticas
            próprias.
          </p>

          <h2>Seus direitos e contato</h2>
          <p>
            Você pode solicitar informações, correção ou exclusão de dados pessoais tratados pelo salão pelo e-mail{' '}
            <a href={`mailto:${business.email}`} className="link-line text-ink">
              {business.email}
            </a>{' '}
            ou pelo telefone {business.phone.display}.
          </p>
        </article>
      </main>
      <Footer home={false} />
    </>
  );
}
