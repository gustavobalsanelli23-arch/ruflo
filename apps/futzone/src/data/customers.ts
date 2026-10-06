import type { Customer } from '@/types/commerce';

/** Clientes simulados — nenhum dado real. */
export const seedCustomers: Customer[] = [
  {
    id: 'c-001', name: 'Lucas Andrade', email: 'lucas.andrade@exemplo.com', phone: '(21) 99876-1234', cpf: '123.456.789-00',
    birthDate: '1994-03-12', city: 'Rio de Janeiro', state: 'RJ', createdAt: '2025-11-04',
    addresses: [
      { id: 'a-001', label: 'Casa', recipient: 'Lucas Andrade', street: 'Rua das Laranjeiras', number: '210', complement: 'Apto 502', district: 'Laranjeiras', city: 'Rio de Janeiro', state: 'RJ', zip: '22240-003', isDefault: true },
      { id: 'a-002', label: 'Trabalho', recipient: 'Lucas Andrade', street: 'Av. Rio Branco', number: '45', complement: '12º andar', district: 'Centro', city: 'Rio de Janeiro', state: 'RJ', zip: '20090-003', isDefault: false },
    ],
  },
  { id: 'c-002', name: 'Mariana Costa', email: 'mariana.costa@exemplo.com', phone: '(11) 98765-4321', cpf: '987.654.321-00', birthDate: '1998-07-22', city: 'São Paulo', state: 'SP', createdAt: '2026-01-15', addresses: [] },
  { id: 'c-003', name: 'Rafael Souza', email: 'rafael.souza@exemplo.com', phone: '(31) 99654-7788', cpf: '456.789.123-00', birthDate: '1989-12-02', city: 'Belo Horizonte', state: 'MG', createdAt: '2026-02-03', addresses: [] },
  { id: 'c-004', name: 'Beatriz Lima', email: 'beatriz.lima@exemplo.com', phone: '(51) 99123-4567', cpf: '321.654.987-00', birthDate: '2000-05-30', city: 'Porto Alegre', state: 'RS', createdAt: '2026-03-21', addresses: [] },
  { id: 'c-005', name: 'Gabriel Martins', email: 'gabriel.martins@exemplo.com', phone: '(81) 98888-1122', cpf: '654.321.987-00', birthDate: '1996-09-17', city: 'Recife', state: 'PE', createdAt: '2026-04-09', addresses: [] },
  { id: 'c-006', name: 'Juliana Ribeiro', email: 'juliana.ribeiro@exemplo.com', phone: '(41) 99777-3344', cpf: '789.123.456-00', birthDate: '1992-01-08', city: 'Curitiba', state: 'PR', createdAt: '2026-05-27', addresses: [] },
  { id: 'c-007', name: 'Pedro Henrique Alves', email: 'pedro.alves@exemplo.com', phone: '(71) 99234-5566', cpf: '147.258.369-00', birthDate: '2001-11-25', city: 'Salvador', state: 'BA', createdAt: '2026-06-30', addresses: [] },
  { id: 'c-008', name: 'Camila Ferreira', email: 'camila.ferreira@exemplo.com', phone: '(61) 98432-9900', cpf: '258.369.147-00', birthDate: '1997-04-14', city: 'Brasília', state: 'DF', createdAt: '2026-08-11', addresses: [] },
];

/** Cliente "logado" na área do cliente (simulação, sem autenticação real). */
export const DEMO_CUSTOMER_ID = 'c-001';
