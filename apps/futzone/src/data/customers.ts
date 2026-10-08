import type { Address, Customer } from '@/types/commerce';

/** Clientes simulados — nenhum dado real. */

const addr = (id: string, recipient: string, street: string, number: string, district: string, city: string, state: string, zip: string, extra: Partial<Address> = {}): Address => ({
  id, label: 'Casa', recipient, street, number, district, city, state, zip, isDefault: true, ...extra,
});

export const seedCustomers: Customer[] = [
  {
    id: 'c-001', name: 'Lucas Andrade', email: 'lucas.andrade@exemplo.com', phone: '(21) 99876-1234', cpf: '123.456.789-00',
    birthDate: '1994-03-12', city: 'Rio de Janeiro', state: 'RJ', createdAt: '2025-11-04', origin: 'exemplo',
    addresses: [
      addr('a-001', 'Lucas Andrade', 'Rua das Laranjeiras', '210', 'Laranjeiras', 'Rio de Janeiro', 'RJ', '22240-003', { complement: 'Apto 502', reference: 'Portaria 24h' }),
      addr('a-002', 'Lucas Andrade', 'Av. Rio Branco', '45', 'Centro', 'Rio de Janeiro', 'RJ', '20090-003', { label: 'Trabalho', complement: '12º andar', isDefault: false }),
    ],
  },
  { id: 'c-002', name: 'Mariana Costa', email: 'mariana.costa@exemplo.com', phone: '(11) 98765-4321', cpf: '987.654.321-00', birthDate: '1998-07-22', city: 'São Paulo', state: 'SP', createdAt: '2026-01-15', origin: 'exemplo', addresses: [addr('a-003', 'Mariana Costa', 'Rua Domingos de Morais', '1500', 'Vila Mariana', 'São Paulo', 'SP', '04010-100', { complement: 'Apto 81' })] },
  { id: 'c-003', name: 'Rafael Souza', email: 'rafael.souza@exemplo.com', phone: '(31) 99654-7788', cpf: '456.789.123-00', birthDate: '1989-12-02', city: 'Belo Horizonte', state: 'MG', createdAt: '2026-02-03', origin: 'exemplo', addresses: [addr('a-004', 'Rafael Souza', 'Rua da Bahia', '900', 'Centro', 'Belo Horizonte', 'MG', '30160-011')] },
  { id: 'c-004', name: 'Beatriz Lima', email: 'beatriz.lima@exemplo.com', phone: '(51) 99123-4567', cpf: '321.654.987-00', birthDate: '2000-05-30', city: 'Porto Alegre', state: 'RS', createdAt: '2026-03-21', origin: 'exemplo', addresses: [addr('a-005', 'Beatriz Lima', 'Av. Ipiranga', '2000', 'Azenha', 'Porto Alegre', 'RS', '90160-093')] },
  { id: 'c-005', name: 'Gabriel Martins', email: 'gabriel.martins@exemplo.com', phone: '(81) 98888-1122', cpf: '654.321.987-00', birthDate: '1996-09-17', city: 'Recife', state: 'PE', createdAt: '2026-04-09', origin: 'exemplo', addresses: [addr('a-006', 'Gabriel Martins', 'Rua da Aurora', '300', 'Boa Vista', 'Recife', 'PE', '50050-000')] },
  { id: 'c-006', name: 'Juliana Ribeiro', email: 'juliana.ribeiro@exemplo.com', phone: '(41) 99777-3344', cpf: '789.123.456-00', birthDate: '1992-01-08', city: 'Curitiba', state: 'PR', createdAt: '2026-05-27', origin: 'exemplo', addresses: [addr('a-007', 'Juliana Ribeiro', 'Rua XV de Novembro', '700', 'Centro', 'Curitiba', 'PR', '80020-310')] },
  { id: 'c-007', name: 'Pedro Henrique Alves', email: 'pedro.alves@exemplo.com', phone: '(71) 99234-5566', cpf: '147.258.369-00', birthDate: '2001-11-25', city: 'Salvador', state: 'BA', createdAt: '2026-06-30', origin: 'exemplo', addresses: [addr('a-008', 'Pedro Henrique Alves', 'Av. Sete de Setembro', '1200', 'Centro', 'Salvador', 'BA', '40060-001')] },
  { id: 'c-008', name: 'Camila Ferreira', email: 'camila.ferreira@exemplo.com', phone: '(61) 98432-9900', cpf: '258.369.147-00', birthDate: '1997-04-14', city: 'Brasília', state: 'DF', createdAt: '2026-08-11', origin: 'exemplo', addresses: [addr('a-009', 'Camila Ferreira', 'SQS 308 Bloco C', '201', 'Asa Sul', 'Brasília', 'DF', '70355-030')] },
];

/** Conta de exemplo usada no botão "Explorar com a conta de demonstração". */
export const DEMO_CUSTOMER_ID = 'c-001';
