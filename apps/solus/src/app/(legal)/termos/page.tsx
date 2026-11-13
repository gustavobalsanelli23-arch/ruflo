import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/config/legal';
import { Contact, LegalDocument, Section } from '@/modules/legal/legal-shell';

export const metadata: Metadata = { title: 'Termos de uso' };

export default function TermsPage() {
  return (
    <LegalDocument
      title="Termos de uso"
      intro={
        <p>
          Estes termos regem o uso do SOLUS, oferecido por <strong>{LEGAL.controller}</strong>, {LEGAL.document}. Ao criar uma conta, você
          concorda com eles e com a <Link href="/privacidade">política de privacidade</Link>.
        </p>
      }
    >
      <Section title="1. O serviço">
        <p>
          O SOLUS lê planilhas de vendas e estoque da sua empresa e mostra lucratividade, estoque e oportunidades, com um analista de IA
          que responde perguntas sobre esses dados. Os resultados dependem da qualidade e da completude das planilhas enviadas.
        </p>
      </Section>

      <Section title="2. Conta e organização">
        <ul>
          <li>Você precisa ter 18 anos ou mais e informar dados verdadeiros.</li>
          <li>Você é responsável por manter sua senha em segredo e pelas ações feitas com a sua conta.</li>
          <li>
            O proprietário da organização decide quem entra e com qual papel, e responde pelo uso que a equipe faz do serviço.
          </li>
        </ul>
      </Section>

      <Section title="3. Planos e limites">
        <p>
          Os planos e seus limites (pessoas, linhas guardadas e perguntas ao analista por dia) estão na <Link href="/planos">página de
          planos</Link>. Ao chegar a um limite, o serviço avisa e a ação é recusada até você liberar espaço ou mudar de plano. Nenhum dado
          já guardado é apagado por causa do limite.
        </p>
        <p>
          Planos pagos são cobrados por mês, antecipadamente. Cancelamentos e reembolsos seguem a{' '}
          <Link href="/reembolso">política de reembolso</Link>. Mudanças de preço são avisadas com pelo menos 30 dias de antecedência e
          valem a partir do ciclo seguinte.
        </p>
      </Section>

      <Section title="4. Seus dados">
        <ul>
          <li>Os dados que você importa continuam sendo seus. Usamos esses dados só para prestar o serviço à sua organização.</li>
          <li>
            Você garante que tem o direito de enviar esses dados e que eles não incluem dados pessoais de terceiros sem base legal. Não
            envie dados pessoais dos seus clientes finais: o SOLUS não precisa deles.
          </li>
          <li>Você pode excluir importações, a organização ou a sua conta a qualquer momento, em Configurações.</li>
        </ul>
      </Section>

      <Section title="5. Analista de IA">
        <p>
          O analista gera textos com um modelo de linguagem a partir dos seus dados. Os números citados são conferidos com os dados antes
          de aparecer; o que não pode ser conferido é retirado da resposta. Mesmo assim, interpretações e sugestões podem conter erros e
          não são consultoria financeira, contábil ou jurídica. As decisões tomadas a partir delas são da sua empresa.
        </p>
      </Section>

      <Section title="6. Uso aceitável">
        <p>Não é permitido:</p>
        <ul>
          <li>tentar acessar dados de outras organizações ou burlar limites e controles de acesso;</li>
          <li>sobrecarregar o serviço de propósito ou automatizar acessos fora das funções oferecidas;</li>
          <li>enviar conteúdo ilegal ou que viole direitos de terceiros;</li>
          <li>revender o serviço sem autorização por escrito.</li>
        </ul>
        <p>Em caso de violação, podemos suspender o acesso, avisando o motivo sempre que possível.</p>
      </Section>

      <Section title="7. Disponibilidade">
        <p>
          Trabalhamos para manter o SOLUS disponível, mas ele pode ficar fora do ar por manutenção ou por falhas de fornecedores. Não há
          garantia de disponibilidade contínua. Manutenções programadas serão avisadas com antecedência sempre que possível.
        </p>
      </Section>

      <Section title="8. Responsabilidade">
        <p>
          Respondemos pelos danos causados por falha do serviço, nos termos da lei. Não respondemos por decisões de negócio tomadas a
          partir dos relatórios, nem por dados incorretos enviados pela sua empresa. Nada nestes termos afasta direitos garantidos pelo
          Código de Defesa do Consumidor, quando ele se aplicar.
        </p>
      </Section>

      <Section title="9. Encerramento">
        <p>
          Você pode encerrar o uso a qualquer momento excluindo a organização ou a conta. Podemos encerrar o serviço com aviso prévio de 30
          dias, período em que você poderá excluir seus dados ou pedir uma cópia deles por e-mail.
        </p>
      </Section>

      <Section title="10. Propriedade intelectual">
        <p>O software, a marca SOLUS e a interface são de {LEGAL.controller}. Os seus dados continuam sendo seus.</p>
      </Section>

      <Section title="11. Mudanças e foro">
        <p>
          Mudanças relevantes nestes termos serão avisadas no aplicativo antes de valer. Aplica-se a lei brasileira. Fica eleito o foro de{' '}
          {LEGAL.forumCity}, salvo o foro do domicílio do consumidor quando a lei o garantir. Dúvidas: <Contact email={LEGAL.supportEmail} />.
        </p>
      </Section>
    </LegalDocument>
  );
}
