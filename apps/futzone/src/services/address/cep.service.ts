import type { Address } from '@/types/commerce';
import { formatCEP, onlyDigits } from '@/lib/validation';

/**
 * Consulta de CEP.
 *
 * Nenhum serviço externo está conectado: o provedor local identifica o ESTADO
 * pela faixa oficial do CEP e reaproveita endereços já cadastrados neste
 * navegador. Rua/bairro/cidade de CEPs novos são preenchidos pelo cliente.
 * Para ativar a busca completa, crie um `CepProvider` que consulte uma API
 * (de preferência via rota do servidor) e troque `cepProvider` abaixo.
 */

export interface CepLookupResult {
  cep: string;
  state?: string;
  city?: string;
  district?: string;
  street?: string;
  /** Rua, bairro, cidade e estado encontrados. */
  complete: boolean;
  source: 'faixa-cep' | 'enderecos-salvos' | 'api';
}

export interface CepProvider {
  readonly id: string;
  readonly isMock: boolean;
  lookup(cep: string): Promise<CepLookupResult | null>;
}

/** Faixas de CEP por estado (Correios). */
const RANGES: Array<[from: number, to: number, uf: string]> = [
  [1000, 19999, 'SP'], [20000, 28999, 'RJ'], [29000, 29999, 'ES'], [30000, 39999, 'MG'],
  [40000, 48999, 'BA'], [49000, 49999, 'SE'], [50000, 56999, 'PE'], [57000, 57999, 'AL'],
  [58000, 58999, 'PB'], [59000, 59999, 'RN'], [60000, 63999, 'CE'], [64000, 64999, 'PI'],
  [65000, 65999, 'MA'], [66000, 68899, 'PA'], [68900, 68999, 'AP'], [69000, 69299, 'AM'],
  [69300, 69399, 'RR'], [69400, 69899, 'AM'], [69900, 69999, 'AC'], [70000, 72799, 'DF'],
  [72800, 72999, 'GO'], [73000, 73699, 'DF'], [73700, 76799, 'GO'], [76800, 76999, 'RO'],
  [77000, 77999, 'TO'], [78000, 78899, 'MT'], [79000, 79999, 'MS'], [80000, 87999, 'PR'],
  [88000, 89999, 'SC'], [90000, 99999, 'RS'],
];

export function stateFromCep(cep: string): string | undefined {
  const d = onlyDigits(cep);
  if (d.length !== 8) return undefined;
  const prefix = Number(d.slice(0, 5));
  return RANGES.find(([from, to]) => prefix >= from && prefix <= to)?.[2];
}

export const BR_STATES: Array<{ uf: string; name: string }> = [
  { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' }, { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' }, { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' }, { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' }, { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' }, { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' }, { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' },
];

export class LocalCepProvider implements CepProvider {
  readonly id = 'local';
  readonly isMock = true;

  constructor(private readonly knownAddresses: () => Address[] = () => []) {}

  async lookup(cep: string): Promise<CepLookupResult | null> {
    const digits = onlyDigits(cep);
    const state = stateFromCep(digits);
    if (!state) return null;
    const known = this.knownAddresses().find((a) => onlyDigits(a.zip) === digits);
    if (known) {
      return { cep: formatCEP(digits), state: known.state, city: known.city, district: known.district, street: known.street, complete: true, source: 'enderecos-salvos' };
    }
    return { cep: formatCEP(digits), state, complete: false, source: 'faixa-cep' };
  }
}
