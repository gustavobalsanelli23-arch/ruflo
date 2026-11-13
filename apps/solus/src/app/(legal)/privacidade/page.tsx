import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/config/legal';
import { Contact, LegalDocument, Section } from '@/modules/legal/legal-shell';

export const metadata: Metadata = { title: 'Política de privacidade' };

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Política de privacidade"
      intro={
        <p>
          Esta política explica quais dados pessoais o SOLUS trata, para quê, com quem compartilha e como você exerce seus direitos,
          conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
        </p>
      }
    >
      <Section title="1. Quem é o responsável">
        <p>
          O controlador dos dados das contas é <strong>{LEGAL.controller}</strong>, {LEGAL.document}, {LEGAL.address}. O encarregado pelo
          tratamento de dados pessoais (art. 41 da LGPD) atende pelo e-mail <Contact email={LEGAL.privacyEmail} />.
        </p>
        <p>
          Os dados que a sua empresa importa (vendas, produtos, estoque, fornecedores) pertencem a ela. Nesses dados, a sua empresa é a
          controladora e o SOLUS atua como operador: tratamos esses dados só para prestar o serviço que você contratou.
        </p>
      </Section>

      <Section title="2. Quais dados coletamos">
        <p>Coletamos só o necessário para o serviço funcionar:</p>
        <ul>
          <li>
            <strong>Conta:</strong> nome, e-mail e senha. A senha é guardada pelo provedor de autenticação apenas em forma de hash; nós
            nunca a vemos.
          </li>
          <li>
            <strong>Organização:</strong> nome da empresa, as pessoas que fazem parte dela, o papel de cada uma e os e-mails convidados.
          </li>
          <li>
            <strong>Dados importados:</strong> as planilhas que você envia e o que calculamos a partir delas. Pedimos que não inclua dados
            pessoais dos seus clientes finais (como nome, CPF ou telefone): o SOLUS não precisa deles.
          </li>
          <li>
            <strong>Analista de IA:</strong> as perguntas feitas ao analista, as respostas e a contagem de uso.
          </li>
          <li>
            <strong>Segurança:</strong> o endereço IP e o e-mail usados nas tentativas de entrar, cadastrar e recuperar a senha são
            guardados apenas como resumo criptográfico (hash), por poucas horas, para limitar abusos.
          </li>
          <li>
            <strong>Cookies essenciais:</strong> só os necessários para a sessão e o funcionamento. Detalhes na{' '}
            <Link href="/cookies">política de cookies</Link>.
          </li>
        </ul>
        <p>
          Não usamos Google Analytics, pixels de anúncio nem qualquer ferramenta de rastreamento ou publicidade. Não vendemos dados.
        </p>
      </Section>

      <Section title="3. Para que usamos e com qual base legal">
        <ul>
          <li>Criar e manter sua conta e sua organização, e prestar o serviço contratado (execução de contrato, art. 7º, V).</li>
          <li>Enviar e-mails de confirmação, convite e recuperação de senha (execução de contrato).</li>
          <li>Proteger o serviço contra abuso, fraude e acessos indevidos (legítimo interesse, art. 7º, IX).</li>
          <li>Cumprir obrigações legais e atender autoridades quando exigido (art. 7º, II).</li>
        </ul>
      </Section>

      <Section title="4. Com quem compartilhamos">
        <p>Usamos fornecedores que tratam dados em nosso nome, apenas para prestar o serviço:</p>
        <ul>
          <li>
            <strong>Supabase</strong>: banco de dados, autenticação, envio de e-mails da conta e armazenamento das planilhas.
          </li>
          <li>
            <strong>Vercel</strong>: hospedagem do aplicativo.
          </li>
          <li>
            <strong>Provedor de IA</strong> (hoje, Groq): recebe a pergunta, até seis trocas anteriores da conversa, o nome da organização
            e os resultados das consultas aos seus dados (totais, produtos, categorias, fornecedores, estoque e oportunidades). Não recebe
            e-mails nem dados de conta. Configuramos o provedor para não guardar esse conteúdo.
          </li>
        </ul>
        <p>
          Esses fornecedores ficam fora do Brasil, principalmente nos Estados Unidos. A transferência internacional se apoia nas
          garantias contratuais deles (cláusulas-padrão de proteção de dados), conforme o art. 33 da LGPD.
        </p>
      </Section>

      <Section title="5. Por quanto tempo guardamos">
        <ul>
          <li>Conta e organização: enquanto existirem. Ao excluir, os dados são apagados.</li>
          <li>Dados importados: até você desfazer a importação, removê-la ou excluir a organização.</li>
          <li>Importações iniciadas e não concluídas: canceladas e apagadas depois de 48 horas.</li>
          <li>Registros de limite de tentativas: poucas horas.</li>
          <li>Cópias de segurança mantidas pelos fornecedores podem levar mais alguns dias para expirar.</li>
        </ul>
      </Section>

      <Section title="6. Seus direitos">
        <p>
          Você pode pedir, a qualquer momento: confirmação de que tratamos seus dados, acesso, correção, anonimização, bloqueio ou
          eliminação de dados desnecessários, portabilidade, informação sobre com quem compartilhamos e revogação do consentimento, quando
          ele for a base (art. 18 da LGPD).
        </p>
        <ul>
          <li>
            <strong>Corrigir seus dados:</strong> em Configurações, na seção Conta.
          </li>
          <li>
            <strong>Excluir sua conta:</strong> em Configurações, na seção Conta, opção Excluir conta. Organizações em que você é o único
            membro são apagadas junto, com os dados importados.
          </li>
          <li>
            <strong>Excluir os dados de uma organização:</strong> o proprietário exclui a organização em Configurações.
          </li>
          <li>
            <strong>Outros pedidos:</strong> pelo e-mail <Contact email={LEGAL.privacyEmail} />. Respondemos em até 15 dias.
          </li>
        </ul>
        <p>
          Se não ficar satisfeito, você pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em{' '}
          <a href="https://www.gov.br/anpd" rel="noopener noreferrer">
            gov.br/anpd
          </a>
          .
        </p>
      </Section>

      <Section title="7. Segurança">
        <p>
          Cada organização só enxerga os próprios dados, isolados no banco. As conexões são criptografadas, as senhas ficam em hash, os
          acessos dependem do papel de cada pessoa e as tentativas de acesso são limitadas. Nenhum sistema é infalível: se houver um
          incidente que possa trazer risco a você, avisaremos você e a ANPD.
        </p>
      </Section>

      <Section title="8. Crianças e adolescentes">
        <p>O SOLUS é um serviço para empresas e não se destina a menores de 18 anos.</p>
      </Section>

      <Section title="9. Mudanças nesta política">
        <p>
          Se esta política mudar de forma relevante, avisaremos no aplicativo antes de a mudança valer. A data da versão atual está no
          topo desta página.
        </p>
      </Section>
    </LegalDocument>
  );
}
