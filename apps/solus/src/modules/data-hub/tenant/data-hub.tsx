'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Panel } from '@/components/data/panel';
import { Notice } from '@/components/data/states';
import type { ImportHistoryItem } from '@/services/imports';
import { ImportHistory } from '../import-history';
import { ImportWizard } from './wizard';

/** Data Hub of a real organization: the import wizard (analyst or above) and the history. */
export function TenantDataHub({
  history,
  canImport,
  canAdmin,
  userId,
  resumeId,
}: {
  history: ImportHistoryItem[];
  canImport: boolean;
  canAdmin: boolean;
  userId: string;
  resumeId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const historyRef = useRef<HTMLDivElement>(null);
  const inProgress = history.filter((item) => item.status === 'processing');

  return (
    <div className="flex flex-col gap-6">
      {inProgress.length > 0 && !resumeId && (
        <Notice tone="warning" title="Há uma importação interrompida na gravação">
          {inProgress[0]!.fileName}: os dados dela ainda não aparecem nos painéis. Use Continuar ou Cancelar no histórico.
        </Notice>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-8" title="Importar planilhas" description="Arquivo, pré-visualização, mapeamento, validação, confirmação, processamento e resultado.">
          {canImport ? (
            <ImportWizard
              key={resumeId ?? 'nova'}
              resume={resumeId ? { importId: resumeId } : null}
              onShowHistory={() => {
                if (resumeId) router.replace(pathname, { scroll: false });
                historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          ) : (
            <Notice title="Importações são feitas por analistas e administradores">
              Seu papel nesta organização é de leitura. Você vê o histórico abaixo e os painéis com os dados importados.
            </Notice>
          )}
        </Panel>
        <Panel className="xl:col-span-4" title="Antes de enviar">
          <ul className="flex flex-col gap-4 text-sm">
            <li>
              <p className="font-medium text-foreground">Formatos aceitos</p>
              <p className="mt-0.5 text-muted-foreground">
                CSV (vírgula, ponto e vírgula ou tabulação; UTF-8 ou Windows-1252) e Excel .xlsx. Até 25 MB e 200 mil linhas. O formato antigo .xls não é
                aceito: salve como .xlsx.
              </p>
            </li>
            <li>
              <p className="font-medium text-foreground">Ordem recomendada</p>
              <p className="mt-0.5 text-muted-foreground">
                Produtos (com custo), depois vendas e a posição de estoque. Vendas com SKU sem cadastro criam o produto sem categoria nem custo.
              </p>
            </li>
            <li>
              <p className="font-medium text-foreground">Vendas</p>
              <p className="mt-0.5 text-muted-foreground">
                Obrigatórios: data, SKU, quantidade e preço unitário (ou valor total). O nº do pedido evita duplicatas e permite contar vendas e calcular o
                ticket médio. O custo da venda, se houver, preserva o CMV histórico.
              </p>
            </li>
            <li>
              <p className="font-medium text-foreground">Privacidade</p>
              <p className="mt-0.5 text-muted-foreground">O arquivo original e os dados ficam restritos a esta organização.</p>
            </li>
          </ul>
        </Panel>
      </div>
      <div ref={historyRef} className="scroll-mt-24">
        <Panel title="Histórico de importações" description="Status, registros gravados, duplicados ignorados e linhas rejeitadas de cada arquivo.">
          <ImportHistory rows={history} canImport={canImport} canAdmin={canAdmin} userId={userId} />
        </Panel>
      </div>
    </div>
  );
}
