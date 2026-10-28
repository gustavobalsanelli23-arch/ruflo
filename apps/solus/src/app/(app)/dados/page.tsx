import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { Notice } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { can } from '@/lib/auth/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ImportHistory } from '@/modules/data-hub/import-history';
import { listImports } from '@/services/organization-data';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Dados' };

export default async function DataPage() {
  const { active } = await requireWorkspace();
  const supabase = await createSupabaseServerClient();
  const imports = supabase ? await listImports(supabase, active.organizationId) : [];
  const canImport = can(active.role, 'import');

  return (
    <>
      <PageHeader
        title="Dados"
        description="Planilhas de vendas, produtos e estoque da empresa. A SOLUS valida e organiza tudo antes de usar nas análises."
      />
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-8" title="Importar planilhas" description="Arquivo, pré-visualização, mapeamento, validação, confirmação e resultado.">
          <Notice title="O envio de arquivos chega na próxima etapa">
            O processamento real das planilhas será ativado junto com o motor analítico. Até lá, nenhum arquivo é recebido ou armazenado.
            {!canImport && ' Seu papel nesta organização é de leitura: importações serão feitas por analistas e administradores.'}
          </Notice>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/demo/dados">
              Ver o fluxo de importação na demonstração
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </Panel>
        <Panel className="xl:col-span-4" title="Antes de enviar">
          <ul className="flex flex-col gap-4 text-sm">
            <li>
              <p className="font-medium text-foreground">Formatos aceitos</p>
              <p className="mt-0.5 text-muted-foreground">CSV separado por vírgula ou ponto e vírgula, e Excel (.xlsx, .xls). Uma aba por arquivo, até 50 MB.</p>
            </li>
            <li>
              <p className="font-medium text-foreground">Campos obrigatórios para vendas</p>
              <p className="mt-0.5 text-muted-foreground">Data, código do produto (SKU), quantidade e preço unitário.</p>
            </li>
            <li>
              <p className="font-medium text-foreground">Privacidade</p>
              <p className="mt-0.5 text-muted-foreground">Os arquivos e os dados ficam restritos a esta organização e a quem tem acesso a ela.</p>
            </li>
          </ul>
        </Panel>
      </div>
      <Panel className="mt-6" title="Histórico de importações" description="Status de processamento, registros e erros de cada arquivo enviado.">
        <ImportHistory rows={imports} />
      </Panel>
    </>
  );
}
