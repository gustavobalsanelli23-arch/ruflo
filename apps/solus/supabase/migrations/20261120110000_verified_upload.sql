-- O envio só é confirmado pelo servidor, depois de conferir o conteúdo.
--
-- confirm_import_upload era executável por authenticated: chamada direto pela
-- API, ela marcava o arquivo como verificado conferindo só existência e
-- tamanho, e pulava a checagem de SHA-256 e da assinatura do formato que o
-- servidor faz (verifyStoredFile). Agora só o service_role confirma, por
-- confirm_verified_upload, que recebe quem age e confere as mesmas
-- permissões de private.lock_import.

revoke execute on function public.confirm_import_upload(uuid) from public, anon, authenticated;

create function public.confirm_verified_upload(p_actor uuid, p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
  actor_role public.org_role;
  stored_size bigint;
begin
  select * into target from public.data_imports d where d.id = p_import_id for update;
  if not found then
    raise exception 'solus:import_not_found' using errcode = 'P0002';
  end if;

  select m.role into actor_role
  from public.organization_members m
  where m.organization_id = target.organization_id and m.user_id = p_actor;
  if actor_role is null then
    raise exception 'solus:import_not_found' using errcode = 'P0002';
  end if;
  if private.org_role_rank(actor_role) < private.org_role_rank('analyst')
    or (target.created_by is distinct from p_actor and private.org_role_rank(actor_role) < private.org_role_rank('admin')) then
    raise exception 'solus:forbidden' using errcode = '42501';
  end if;

  if target.status <> 'pending' then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;
  if target.file_verified_at is not null then
    return;
  end if;

  select (o.metadata ->> 'size')::bigint into stored_size
  from storage.objects o
  where o.bucket_id = 'imports' and o.name = target.storage_path;
  if not found then
    raise exception 'solus:upload_missing' using errcode = 'P0001';
  end if;
  if stored_size is distinct from target.file_size then
    raise exception 'solus:upload_mismatch' using errcode = 'P0001';
  end if;

  update public.data_imports set file_verified_at = now() where id = target.id;
end
$$;

revoke all on function public.confirm_verified_upload(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_verified_upload(uuid, uuid) to service_role;
