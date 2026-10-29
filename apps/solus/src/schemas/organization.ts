import { z } from 'zod';
import { emailSchema, fullNameSchema } from './auth';

/**
 * Validation for organization and membership operations. Each schema lists
 * exactly the fields an action accepts: nothing else from the request is
 * read (mass-assignment protection on top of the database column grants).
 * The organization is never one of them: it comes from the active-organization
 * cookie, re-checked against the database.
 */

export const organizationNameSchema = z
  .string({ error: 'Informe o nome da empresa.' })
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().min(2, 'Use pelo menos 2 caracteres.').max(80, 'Use no máximo 80 caracteres.'));

export const createOrganizationSchema = z.object({ name: organizationNameSchema });
export const renameOrganizationSchema = z.object({ name: organizationNameSchema });

export const roleSchema = z.enum(['owner', 'admin', 'analyst', 'viewer'], 'Escolha um papel válido.');

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'analyst', 'viewer'], 'Escolha um papel válido.'),
});

export const changeRoleSchema = z.object({
  memberId: z.uuid('Membro inválido.'),
  role: roleSchema,
});

export const memberIdSchema = z.object({ memberId: z.uuid('Membro inválido.') });
export const invitationIdSchema = z.object({ invitationId: z.uuid('Convite inválido.') });
export const organizationIdSchema = z.object({ organizationId: z.uuid('Organização inválida.') });
export const invitationTokenSchema = z.string().regex(/^[0-9a-f]{64}$/, 'Convite inválido.');

export const updateProfileSchema = z.object({ fullName: fullNameSchema });

export const deleteOrganizationSchema = z.object({ confirmation: z.string().trim() });
