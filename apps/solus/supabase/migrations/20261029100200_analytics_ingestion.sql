-- SOLUS · Parte 04 · 3/6 — Ingestão de planilhas: envio e validação
--
-- Fluxo (cada passo é uma RPC; o servidor da aplicação chama na ordem):
--
--   create_import          registra o arquivo (formato, tamanho, SHA-256) e
--                          devolve o caminho no Storage; avisa se o mesmo
--                          arquivo já foi importado
--   confirm_import_upload  confere no Storage que o objeto existe e tem o
--                          tamanho declarado
--   save_import_mapping    guarda o mapeamento de colunas (e recomeça a
--                          validação, se já havia lotes)
--   stage_import_batch     recebe até 2.000 linhas já normalizadas e os
--                          problemas encontrados; idempotente por lote
--   finish_validation      fecha a validação: detecta duplicatas e calcula o
--                          resumo para a tela de confirmação
--   start_import           confirmação do usuário, com a política para
--                          duplicatas
--   commit_import_batch    grava um lote nas tabelas finais; idempotente
--   finalize_import        conclui e limpa a área de preparação
--   cancel_import          desiste antes de concluir, sem deixar dados
--   revert_import          desfaz uma importação concluída de vendas ou
--                          estoque
--
-- Garantias:
--   * só analyst ou superior importa; só quem criou a importação (ou owner/
--     admin) a conduz;
--   * o banco não confia no navegador nem no servidor: tipos e limites de cada
--     linha são conferidos de novo aqui, e um lote inválido é recusado inteiro;
--   * gravações de uma organização são serializadas (advisory lock) e só uma
--     importação por vez fica em processamento;
--   * duplicatas são reavaliadas no momento da gravação, não só na validação;
--   * os painéis só leem importações concluídas: dados de uma importação em
--     andamento, cancelada ou desfeita nunca aparecem.

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

-- Chave de comparação de nomes: minúsculas, sem acentos, espaços simples.
create function private.text_key(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(lower(value), 'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn'),
    '\s+', ' ', 'g'
  ))
$$;

-- Chave de SKU: maiúsculas e sem espaços ("abc 123" e "ABC123" são o mesmo).
create function private.sku_key(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(value, '\s+', '', 'g'))
$$;

-- Importações cujos dados valem para os painéis.
create function private.active_import_ids(p_organization_id uuid)
returns setof uuid
language sql
stable
rows 10
set search_path = ''
as $$
  select d.id
  from public.data_imports d
  where d.organization_id = p_organization_id
    and d.status in ('completed', 'with_errors')
$$;

create function private.require_member(p_organization_id uuid, p_minimum public.org_role)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.org_role;
begin
  if actor is null then
    raise exception 'solus:not_authenticated' using errcode = '28000';
  end if;
  select m.role into actor_role
  from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = actor;
  if actor_role is null or private.org_role_rank(actor_role) < private.org_role_rank(p_minimum) then
    raise exception 'solus:forbidden' using errcode = '42501';
  end if;
  return actor;
end
$$;

-- Trava a importação e confere o acesso: membro com o papel mínimo e, para
-- conduzir o fluxo, autor da importação ou owner/admin. Uma importação de
-- outra organização se comporta como inexistente.
create function private.lock_import(p_import_id uuid, p_minimum public.org_role)
returns public.data_imports
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.org_role;
  target public.data_imports;
begin
  if actor is null then
    raise exception 'solus:not_authenticated' using errcode = '28000';
  end if;

  select * into target from public.data_imports d where d.id = p_import_id for update;
  if not found then
    raise exception 'solus:import_not_found' using errcode = 'P0002';
  end if;

  select m.role into actor_role
  from public.organization_members m
  where m.organization_id = target.organization_id and m.user_id = actor;
  if actor_role is null then
    raise exception 'solus:import_not_found' using errcode = 'P0002';
  end if;
  if private.org_role_rank(actor_role) < private.org_role_rank(p_minimum)
    or (target.created_by is distinct from actor and private.org_role_rank(actor_role) < private.org_role_rank('admin')) then
    raise exception 'solus:forbidden' using errcode = '42501';
  end if;

  return target;
end
$$;

create function private.lock_organization_imports(p_organization_id uuid)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('solus:imports:' || p_organization_id::text, 0))
$$;

-- ---------------------------------------------------------------------------
-- Criação e envio do arquivo
-- ---------------------------------------------------------------------------

create function public.create_import(
  p_organization_id uuid,
  p_dataset public.import_dataset,
  p_file_name text,
  p_file_format text,
  p_file_size bigint,
  p_file_sha256 text
)
returns table (
  import_id uuid,
  object_path text,
  previous_import_id uuid,
  previous_import_at timestamptz,
  previous_import_status public.import_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
  clean_name text;
  new_id uuid := gen_random_uuid();
  path text;
begin
  actor := private.require_member(p_organization_id, 'analyst');

  -- Só o nome (sem pastas) e sem caracteres de controle; é apenas exibido.
  clean_name := btrim(regexp_replace(regexp_replace(coalesce(p_file_name, ''), '^.*[/\\]', ''), '[[:cntrl:]]', '', 'g'));
  if char_length(clean_name) not between 1 and 255 then
    raise exception 'solus:invalid_file_name' using errcode = '22023';
  end if;
  if p_dataset is null then
    raise exception 'solus:invalid_dataset' using errcode = '22023';
  end if;
  if p_file_format is null or p_file_format not in ('csv', 'xlsx') then
    raise exception 'solus:unsupported_format' using errcode = '22023';
  end if;
  if p_file_size is null or p_file_size < 1 then
    raise exception 'solus:empty_file' using errcode = '22023';
  end if;
  if p_file_size > 26214400 then
    raise exception 'solus:file_too_large' using errcode = '22023';
  end if;
  if coalesce(p_file_sha256, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'solus:invalid_checksum' using errcode = '22023';
  end if;

  perform private.enforce_rate_limit('import:' || actor::text, 60, 3600);

  path := p_organization_id::text || '/' || new_id::text || '/original.' || p_file_format;

  insert into public.data_imports (
    id, organization_id, dataset, file_name, status, created_by,
    storage_path, file_format, file_size, file_sha256
  )
  values (
    new_id, p_organization_id, p_dataset, clean_name, 'pending', actor,
    path, p_file_format, p_file_size, p_file_sha256
  );

  import_id := new_id;
  object_path := path;

  select d.id, d.created_at, d.status
  into previous_import_id, previous_import_at, previous_import_status
  from public.data_imports d
  where d.organization_id = p_organization_id
    and d.dataset = p_dataset
    and d.file_sha256 = p_file_sha256
    and d.id <> new_id
    and d.status in ('validated', 'processing', 'completed', 'with_errors')
  order by d.created_at desc
  limit 1;

  return next;
end
$$;

-- O servidor confere o conteúdo (SHA-256 e assinatura do formato) baixando o
-- objeto; aqui o banco confere que o objeto existe e tem o tamanho declarado.
create function public.confirm_import_upload(p_import_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
  stored_size bigint;
begin
  target := private.lock_import(p_import_id, 'analyst');
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

-- Guarda o mapeamento de colunas e as opções de leitura. Mudar o mapeamento
-- invalida o que já tinha sido validado: a validação recomeça do zero.
create function public.save_import_mapping(p_import_id uuid, p_mapping jsonb, p_options jsonb, p_sheet_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
begin
  target := private.lock_import(p_import_id, 'analyst');
  if target.status not in ('pending', 'validated') or target.file_verified_at is null then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_mapping) is distinct from 'object' or jsonb_typeof(p_options) is distinct from 'object'
    or octet_length(p_mapping::text) > 8000 or octet_length(p_options::text) > 4000
    or (p_sheet_name is not null and char_length(p_sheet_name) > 120) then
    raise exception 'solus:invalid_mapping' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_each(p_mapping) e where jsonb_typeof(e.value) <> 'string' or char_length(e.key) > 64) then
    raise exception 'solus:invalid_mapping' using errcode = '22023';
  end if;

  delete from private.import_rows r where r.import_id = target.id;
  delete from public.import_batches b where b.import_id = target.id;
  delete from public.import_errors e where e.import_id = target.id;

  update public.data_imports
  set mapping = p_mapping,
      options = p_options,
      sheet_name = p_sheet_name,
      status = 'pending',
      validated_at = null,
      batch_count = null,
      summary = '{}'::jsonb,
      total_rows = 0,
      valid_rows = 0,
      error_count = 0,
      warning_count = 0,
      duplicate_rows = 0,
      period_start = null,
      period_end = null
  where id = target.id;
end
$$;

-- ---------------------------------------------------------------------------
-- Validação em lotes
-- ---------------------------------------------------------------------------

-- Confere e grava na área de preparação as linhas de um lote. Qualquer linha
-- fora do formato esperado recusa o lote inteiro: o servidor da aplicação já
-- separou as linhas com erro, então isso só acontece com chamadas indevidas.
create function private.stage_rows(target public.data_imports, p_batch_index integer, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target.dataset = 'sales' then
    if exists (
      select 1
      from jsonb_to_recordset(p_rows) as r(
        row_number integer, sold_at date, order_id text, sku text, product_name text, quantity numeric,
        unit_price numeric, discount numeric, unit_cost numeric, kind text, channel text
      )
      where not coalesce(
        r.row_number between 1 and 2000000
        and r.sold_at between date '2000-01-01' and current_date + 1
        and char_length(private.sku_key(r.sku)) between 1 and 64 and char_length(btrim(r.sku)) <= 64
        and (r.order_id is null or char_length(btrim(r.order_id)) between 1 and 64)
        and (r.product_name is null or char_length(btrim(r.product_name)) between 1 and 200)
        and r.quantity > 0 and r.quantity < 100000000000
        and r.unit_price >= 0 and r.unit_price < 10000000000
        and coalesce(r.discount, 0) >= 0 and coalesce(r.discount, 0) <= r.quantity * r.unit_price
        and (r.unit_cost is null or (r.unit_cost >= 0 and r.unit_cost < 10000000000))
        and coalesce(r.kind, 'sale') in ('sale', 'return')
        and (r.channel is null or char_length(btrim(r.channel)) between 1 and 60),
        false
      )
    ) then
      raise exception 'solus:invalid_batch' using errcode = '22023';
    end if;

    insert into private.import_rows (import_id, row_number, organization_id, batch_index, data)
    select target.id, r.row_number, target.organization_id, p_batch_index,
      jsonb_build_object(
        'sold_at', r.sold_at,
        'order_id', nullif(btrim(r.order_id), ''),
        'sku', btrim(r.sku),
        'sku_key', private.sku_key(r.sku),
        'product_name', nullif(btrim(r.product_name), ''),
        'quantity', round(r.quantity, 3),
        'unit_price', round(r.unit_price, 4),
        'discount', round(coalesce(r.discount, 0), 2),
        'unit_cost', round(r.unit_cost, 4),
        'kind', coalesce(r.kind, 'sale'),
        'channel', nullif(btrim(r.channel), '')
      )
    from jsonb_to_recordset(p_rows) as r(
      row_number integer, sold_at date, order_id text, sku text, product_name text, quantity numeric,
      unit_price numeric, discount numeric, unit_cost numeric, kind text, channel text
    );

  elsif target.dataset = 'products' then
    if exists (
      select 1
      from jsonb_to_recordset(p_rows) as r(
        row_number integer, sku text, name text, category text, supplier text, unit text,
        cost numeric, price numeric, lead_time_days integer, perishable boolean, active boolean
      )
      where not coalesce(
        r.row_number between 1 and 2000000
        and char_length(private.sku_key(r.sku)) between 1 and 64 and char_length(btrim(r.sku)) <= 64
        and char_length(btrim(r.name)) between 1 and 200
        and (r.category is null or char_length(private.text_key(r.category)) between 1 and 120)
        and (r.supplier is null or char_length(private.text_key(r.supplier)) between 1 and 160)
        and (r.unit is null or char_length(btrim(r.unit)) between 1 and 20)
        and (r.cost is null or (r.cost >= 0 and r.cost < 10000000000))
        and (r.price is null or (r.price >= 0 and r.price < 10000000000))
        and (r.lead_time_days is null or r.lead_time_days between 0 and 365),
        false
      )
    ) then
      raise exception 'solus:invalid_batch' using errcode = '22023';
    end if;

    insert into private.import_rows (import_id, row_number, organization_id, batch_index, data)
    select target.id, r.row_number, target.organization_id, p_batch_index,
      jsonb_build_object(
        'sku', btrim(r.sku),
        'sku_key', private.sku_key(r.sku),
        'name', btrim(r.name),
        'category', nullif(regexp_replace(btrim(r.category), '\s+', ' ', 'g'), ''),
        'category_key', nullif(private.text_key(r.category), ''),
        'supplier', nullif(regexp_replace(btrim(r.supplier), '\s+', ' ', 'g'), ''),
        'supplier_key', nullif(private.text_key(r.supplier), ''),
        'unit', nullif(btrim(r.unit), ''),
        'cost', round(r.cost, 4),
        'price', round(r.price, 4),
        'lead_time_days', r.lead_time_days,
        'perishable', r.perishable,
        'active', r.active
      )
    from jsonb_to_recordset(p_rows) as r(
      row_number integer, sku text, name text, category text, supplier text, unit text,
      cost numeric, price numeric, lead_time_days integer, perishable boolean, active boolean
    );

  elsif target.dataset = 'inventory' then
    if exists (
      select 1
      from jsonb_to_recordset(p_rows) as r(
        row_number integer, sku text, product_name text, snapshot_date date, quantity numeric, unit_cost numeric
      )
      where not coalesce(
        r.row_number between 1 and 2000000
        and char_length(private.sku_key(r.sku)) between 1 and 64 and char_length(btrim(r.sku)) <= 64
        and (r.product_name is null or char_length(btrim(r.product_name)) between 1 and 200)
        and r.snapshot_date between date '2000-01-01' and current_date + 1
        and abs(r.quantity) < 100000000000
        and (r.unit_cost is null or (r.unit_cost >= 0 and r.unit_cost < 10000000000)),
        false
      )
    ) then
      raise exception 'solus:invalid_batch' using errcode = '22023';
    end if;

    insert into private.import_rows (import_id, row_number, organization_id, batch_index, data)
    select target.id, r.row_number, target.organization_id, p_batch_index,
      jsonb_build_object(
        'sku', btrim(r.sku),
        'sku_key', private.sku_key(r.sku),
        'product_name', nullif(btrim(r.product_name), ''),
        'snapshot_date', r.snapshot_date,
        'quantity', round(r.quantity, 3),
        'unit_cost', round(r.unit_cost, 4)
      )
    from jsonb_to_recordset(p_rows) as r(
      row_number integer, sku text, product_name text, snapshot_date date, quantity numeric, unit_cost numeric
    );

  else -- suppliers
    if exists (
      select 1
      from jsonb_to_recordset(p_rows) as r(row_number integer, name text, code text, lead_time_days integer)
      where not coalesce(
        r.row_number between 1 and 2000000
        and char_length(private.text_key(r.name)) between 1 and 160
        and char_length(btrim(r.name)) <= 160
        and (r.code is null or char_length(btrim(r.code)) between 1 and 64)
        and (r.lead_time_days is null or r.lead_time_days between 0 and 365),
        false
      )
    ) then
      raise exception 'solus:invalid_batch' using errcode = '22023';
    end if;

    insert into private.import_rows (import_id, row_number, organization_id, batch_index, data)
    select target.id, r.row_number, target.organization_id, p_batch_index,
      jsonb_build_object(
        'name', regexp_replace(btrim(r.name), '\s+', ' ', 'g'),
        'name_key', private.text_key(r.name),
        'code', nullif(btrim(r.code), ''),
        'lead_time_days', r.lead_time_days
      )
    from jsonb_to_recordset(p_rows) as r(row_number integer, name text, code text, lead_time_days integer);
  end if;
end
$$;

create function public.stage_import_batch(p_import_id uuid, p_batch_index integer, p_rows jsonb, p_issues jsonb)
returns table (staged_rows integer, rejected_rows integer, warnings integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
  previous public.import_batches;
  payload text;
  row_total integer;
  issue_total integer;
  stored_issues integer;
  issue_room integer;
  rejected integer;
  warning_total integer;
begin
  target := private.lock_import(p_import_id, 'analyst');
  if target.status <> 'pending' or target.file_verified_at is null then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;
  if p_batch_index is null or p_batch_index not between 0 and 999
    or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_typeof(p_issues) is distinct from 'array' then
    raise exception 'solus:invalid_batch' using errcode = '22023';
  end if;

  row_total := jsonb_array_length(p_rows);
  issue_total := jsonb_array_length(p_issues);
  if row_total > 2000 or issue_total > 6000 then
    raise exception 'solus:batch_too_large' using errcode = '22023';
  end if;

  -- Reenvio do mesmo lote (rede instável, duplo clique): devolve o resultado
  -- anterior. Conteúdo diferente para o mesmo índice é recusado.
  payload := encode(sha256(convert_to(p_rows::text || '|' || p_issues::text, 'UTF8')), 'hex');
  select * into previous from public.import_batches b where b.import_id = target.id and b.batch_index = p_batch_index;
  if found then
    if previous.payload_sha256 = payload then
      staged_rows := previous.row_count;
      rejected_rows := previous.rejected_count;
      warnings := previous.warning_count;
      return next;
      return;
    end if;
    raise exception 'solus:batch_conflict' using errcode = 'P0001';
  end if;

  begin
    perform private.stage_rows(target, p_batch_index, p_rows);
  exception
    when invalid_text_representation or invalid_datetime_format or datetime_field_overflow
      or numeric_value_out_of_range or invalid_parameter_value or string_data_right_truncation
      or check_violation or not_null_violation or unique_violation or invalid_binary_representation then
      raise exception 'solus:invalid_batch' using errcode = '22023';
  end;

  if exists (
    select 1
    from jsonb_to_recordset(p_issues) as e(row_number integer, field text, code text, severity text, message text, raw_value text)
    where not coalesce(
      (e.row_number is null or e.row_number between 1 and 2000000)
      and (e.field is null or char_length(e.field) <= 64)
      and e.code ~ '^[a-z][a-z0-9_]{1,63}$'
      and e.severity in ('error', 'warning')
      and char_length(e.message) between 1 and 300
      and (e.raw_value is null or char_length(e.raw_value) <= 200),
      false
    )
  ) then
    raise exception 'solus:invalid_batch' using errcode = '22023';
  end if;

  -- Uma linha com erro não pode estar entre as linhas aceitas.
  if exists (
    select 1
    from jsonb_to_recordset(p_issues) as e(row_number integer, severity text)
    join private.import_rows r on r.import_id = target.id and r.row_number = e.row_number
    where e.severity = 'error'
  ) then
    raise exception 'solus:invalid_batch' using errcode = '22023';
  end if;

  select count(distinct e.row_number) filter (where e.severity = 'error'), count(*) filter (where e.severity = 'warning')
  into rejected, warning_total
  from jsonb_to_recordset(p_issues) as e(row_number integer, severity text);

  -- Até 50 mil problemas detalhados por importação; as contagens dos lotes
  -- continuam completas.
  select count(*) into stored_issues from public.import_errors e where e.import_id = target.id;
  issue_room := greatest(0, 50000 - stored_issues);

  insert into public.import_errors (organization_id, import_id, row_number, field, code, severity, message, raw_value)
  select target.organization_id, target.id, e.row_number, e.field, e.code, e.severity::public.issue_severity, e.message, e.raw_value
  from jsonb_to_recordset(p_issues) as e(row_number integer, field text, code text, severity text, message text, raw_value text)
  limit issue_room;

  insert into public.import_batches (
    import_id, organization_id, batch_index, row_count, rejected_count, warning_count, payload_sha256
  )
  values (target.id, target.organization_id, p_batch_index, row_total, rejected, warning_total, payload);

  update public.data_imports set updated_at = now() where id = target.id;

  staged_rows := row_total;
  rejected_rows := rejected;
  warnings := warning_total;
  return next;
end
$$;

-- ---------------------------------------------------------------------------
-- Duplicatas
-- ---------------------------------------------------------------------------

-- Impressão digital de cada linha de venda: conteúdo normalizado + ordem de
-- ocorrência no arquivo (duas linhas idênticas no mesmo arquivo são vendas
-- distintas; reimportar o arquivo gera as mesmas impressões).
create function private.fingerprint_sales(p_import_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.import_rows r
  set content_key = k.content_key,
      fingerprint = sha256(convert_to(k.content_key || '#' || k.occurrence::text, 'UTF8'))
  from (
    select x.row_number, x.content_key,
      row_number() over (partition by x.content_key order by x.row_number) as occurrence
    from (
      select s.row_number,
        concat_ws('|',
          s.data ->> 'sold_at',
          coalesce(s.data ->> 'order_id', ''),
          s.data ->> 'sku_key',
          s.data ->> 'kind',
          trim_scale((s.data ->> 'quantity')::numeric)::text,
          trim_scale((s.data ->> 'unit_price')::numeric)::text,
          trim_scale((s.data ->> 'discount')::numeric)::text
        ) as content_key
      from private.import_rows s
      where s.import_id = p_import_id
    ) x
  ) k
  where r.import_id = p_import_id and r.row_number = k.row_number
$$;

-- Classifica as linhas de venda em relação ao que já está nos painéis:
--   exact     mesma linha (com número de documento) já importada: sempre ignorada
--   order     documento já importado por outra importação: sempre ignorada
--   possible  linha idêntica sem número de documento: pode ser outra venda;
--             o usuário decide (ignorar ou importar)
create function private.classify_sales(p_import_id uuid, p_batch_index integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.import_rows r
  set duplicate = c.duplicate
  from (
    select s.row_number,
      case
        when s.data ->> 'order_id' is not null and exists (
          select 1 from public.sale_items i
          where i.organization_id = s.organization_id
            and i.fingerprint = s.fingerprint
            and i.import_id in (select private.active_import_ids(s.organization_id))
        ) then 'exact'
        when s.data ->> 'order_id' is not null and s.data ->> 'kind' = 'sale' and exists (
          select 1
          from public.sales o
          join public.sale_items i on i.sale_id = o.id
          where o.organization_id = s.organization_id
            and o.external_id = s.data ->> 'order_id'
            and i.kind = 'sale'
            and i.import_id <> s.import_id
            and i.import_id in (select private.active_import_ids(s.organization_id))
        ) then 'order'
        when s.data ->> 'order_id' is null and exists (
          select 1 from public.sale_items i
          where i.organization_id = s.organization_id
            and i.fingerprint = s.fingerprint
            and i.import_id in (select private.active_import_ids(s.organization_id))
        ) then 'possible'
      end as duplicate
    from private.import_rows s
    where s.import_id = p_import_id and (p_batch_index is null or s.batch_index = p_batch_index)
  ) c
  where r.import_id = p_import_id and r.row_number = c.row_number and r.duplicate is distinct from c.duplicate
$$;

-- Posição de estoque já existente (outra importação, mesmo produto e data).
create function private.classify_inventory(p_import_id uuid, p_batch_index integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.import_rows r
  set duplicate = c.duplicate
  from (
    select s.row_number,
      case when exists (
        select 1
        from public.inventory_snapshots i
        join public.products p on p.id = i.product_id
        where i.organization_id = s.organization_id
          and p.sku_key = s.data ->> 'sku_key'
          and i.snapshot_date = (s.data ->> 'snapshot_date')::date
          and i.import_id in (select private.active_import_ids(s.organization_id))
      ) then 'existing' end as duplicate
    from private.import_rows s
    where s.import_id = p_import_id and (p_batch_index is null or s.batch_index = p_batch_index)
  ) c
  where r.import_id = p_import_id and r.row_number = c.row_number and r.duplicate is distinct from c.duplicate
$$;

-- Registra um aviso para linhas repetidas dentro do próprio arquivo. A chave
-- é um campo da linha ou, com p_key = 'content_key', a chave composta já
-- calculada (produto + data no estoque).
create function private.warn_repeated_rows(target public.data_imports, p_key text, p_code text, p_message text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  insert into public.import_errors (organization_id, import_id, row_number, field, code, severity, message, raw_value)
  select target.organization_id, target.id, x.row_number, null, p_code, 'warning',
    replace(p_message, '{first}', x.first_row::text), left(x.key_value, 200)
  from (
    select r.row_number, k.key_value,
      min(r.row_number) over (partition by k.key_value) as first_row,
      count(*) over (partition by k.key_value) as occurrences
    from private.import_rows r
    cross join lateral (
      select case when p_key = 'content_key' then r.content_key else r.data ->> p_key end as key_value
    ) k
    where r.import_id = target.id
  ) x
  where x.occurrences > 1 and x.row_number <> x.first_row
  limit 5000;
  get diagnostics inserted = row_count;
  return inserted;
end
$$;

create function public.finish_validation(p_import_id uuid, p_expected_batches integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.data_imports;
  batches integer;
  last_index integer;
  staged integer;
  rejected integer;
  warning_total integer;
  extra_warnings integer := 0;
  duplicates integer := 0;
  result jsonb;
  first_date date;
  last_date date;
begin
  target := private.lock_import(p_import_id, 'analyst');
  if target.status <> 'pending' or target.file_verified_at is null then
    raise exception 'solus:invalid_import_state' using errcode = 'P0001';
  end if;

  select count(*), max(b.batch_index), coalesce(sum(b.row_count), 0), coalesce(sum(b.rejected_count), 0), coalesce(sum(b.warning_count), 0)
  into batches, last_index, staged, rejected, warning_total
  from public.import_batches b
  where b.import_id = target.id;

  if batches = 0 or batches is distinct from p_expected_batches or last_index <> batches - 1 then
    raise exception 'solus:batches_missing' using errcode = 'P0001';
  end if;

  if staged = 0 then
    update public.data_imports
    set status = 'failed', failure_reason = 'no_valid_rows', batch_count = batches,
        total_rows = rejected, valid_rows = 0, error_count = rejected, warning_count = warning_total,
        validated_at = now()
    where id = target.id;
    return jsonb_build_object('rows', 0, 'rejected', rejected);
  end if;

  if target.dataset = 'sales' then
    perform private.fingerprint_sales(target.id);
    perform private.classify_sales(target.id, null);

    select jsonb_build_object(
      'rows', count(*),
      'saleLines', count(*) filter (where x.kind = 'sale'),
      'returnLines', count(*) filter (where x.kind = 'return'),
      'periodStart', min(x.sold_at),
      'periodEnd', max(x.sold_at),
      'grossRevenue', coalesce(sum(x.quantity * x.unit_price) filter (where x.kind = 'sale'), 0),
      'discounts', coalesce(sum(x.discount) filter (where x.kind = 'sale'), 0),
      'returnsValue', coalesce(sum(x.quantity * x.unit_price - x.discount) filter (where x.kind = 'return'), 0),
      'orders', count(distinct x.order_id) filter (where x.kind = 'sale'),
      'linesWithoutOrder', count(*) filter (where x.order_id is null),
      'distinctSkus', count(distinct x.sku_key),
      'newSkus', count(distinct x.sku_key) filter (where x.product_id is null),
      'linesWithCatalogCost', count(*) filter (where x.unit_cost is null and x.catalog_cost is not null),
      'linesWithoutCost', count(*) filter (where x.unit_cost is null and x.catalog_cost is null),
      'exactDuplicates', count(*) filter (where x.duplicate = 'exact'),
      'orderDuplicates', count(*) filter (where x.duplicate = 'order'),
      'possibleDuplicates', count(*) filter (where x.duplicate = 'possible'),
      'ordersWithMixedDates', (
        select count(*) from (
          select r.data ->> 'order_id'
          from private.import_rows r
          where r.import_id = target.id and r.data ->> 'order_id' is not null
          group by 1
          having count(distinct r.data ->> 'sold_at') > 1
        ) mixed
      )
    ), min(x.sold_at), max(x.sold_at), count(*) filter (where x.duplicate is not null)
    into result, first_date, last_date, duplicates
    from (
      select
        (r.data ->> 'sold_at')::date as sold_at,
        r.data ->> 'order_id' as order_id,
        r.data ->> 'sku_key' as sku_key,
        r.data ->> 'kind' as kind,
        (r.data ->> 'quantity')::numeric as quantity,
        (r.data ->> 'unit_price')::numeric as unit_price,
        (r.data ->> 'discount')::numeric as discount,
        (r.data ->> 'unit_cost')::numeric as unit_cost,
        r.duplicate,
        p.id as product_id,
        p.current_cost as catalog_cost
      from private.import_rows r
      left join public.products p on p.organization_id = r.organization_id and p.sku_key = r.data ->> 'sku_key'
      where r.import_id = target.id
    ) x;

  elsif target.dataset = 'products' then
    extra_warnings := private.warn_repeated_rows(
      target, 'sku_key', 'repeated_sku', 'SKU repetido no arquivo (primeira ocorrência na linha {first}). Vale a última linha.'
    );
    update private.import_rows r set duplicate = 'existing'
    where r.import_id = target.id
      and exists (select 1 from public.products p where p.organization_id = r.organization_id and p.sku_key = r.data ->> 'sku_key' and p.catalog_complete);

    select jsonb_build_object(
      'rows', count(*),
      'distinctSkus', count(distinct x.sku_key),
      'newProducts', count(distinct x.sku_key) filter (where x.product_id is null or not x.complete),
      'updatedProducts', count(distinct x.sku_key) filter (where x.product_id is not null and x.complete),
      'costChanges', count(distinct x.sku_key) filter (where x.product_id is not null and x.cost is not null and x.cost is distinct from x.current_cost),
      'withoutCost', count(distinct x.sku_key) filter (where x.cost is null and x.current_cost is null),
      'newCategories', (
        select count(distinct r.data ->> 'category_key') from private.import_rows r
        where r.import_id = target.id and r.data ->> 'category_key' is not null
          and not exists (select 1 from public.categories c where c.organization_id = r.organization_id and c.name_key = r.data ->> 'category_key')
      ),
      'newSuppliers', (
        select count(distinct r.data ->> 'supplier_key') from private.import_rows r
        where r.import_id = target.id and r.data ->> 'supplier_key' is not null
          and not exists (select 1 from public.suppliers s where s.organization_id = r.organization_id and s.name_key = r.data ->> 'supplier_key')
      )
    ), 0
    into result, duplicates
    from (
      select r.data ->> 'sku_key' as sku_key, (r.data ->> 'cost')::numeric as cost,
        p.id as product_id, p.catalog_complete as complete, p.current_cost
      from private.import_rows r
      left join public.products p on p.organization_id = r.organization_id and p.sku_key = r.data ->> 'sku_key'
      where r.import_id = target.id
    ) x;

  elsif target.dataset = 'inventory' then
    update private.import_rows r set content_key = (r.data ->> 'sku_key') || '|' || (r.data ->> 'snapshot_date')
    where r.import_id = target.id;
    extra_warnings := private.warn_repeated_rows(
      target, 'content_key', 'repeated_position', 'Produto repetido na mesma data (primeira ocorrência na linha {first}). As quantidades serão somadas.'
    );
    perform private.classify_inventory(target.id, null);

    select jsonb_build_object(
      'rows', count(*),
      'distinctSkus', count(distinct x.sku_key),
      'newSkus', count(distinct x.sku_key) filter (where x.product_id is null),
      'firstDate', min(x.snapshot_date),
      'lastDate', max(x.snapshot_date),
      'dates', count(distinct x.snapshot_date),
      'existingPositions', count(*) filter (where x.duplicate = 'existing'),
      'negativeRows', count(*) filter (where x.quantity < 0),
      'withoutCost', count(*) filter (where x.unit_cost is null and x.catalog_cost is null),
      'stockValue', coalesce(sum(greatest(x.quantity, 0) * coalesce(x.unit_cost, x.catalog_cost)), 0)
    ), min(x.snapshot_date), max(x.snapshot_date), count(*) filter (where x.duplicate is not null)
    into result, first_date, last_date, duplicates
    from (
      select r.data ->> 'sku_key' as sku_key, (r.data ->> 'snapshot_date')::date as snapshot_date,
        (r.data ->> 'quantity')::numeric as quantity, (r.data ->> 'unit_cost')::numeric as unit_cost,
        r.duplicate, p.id as product_id, p.current_cost as catalog_cost
      from private.import_rows r
      left join public.products p on p.organization_id = r.organization_id and p.sku_key = r.data ->> 'sku_key'
      where r.import_id = target.id
    ) x;

  else -- suppliers
    extra_warnings := private.warn_repeated_rows(
      target, 'name_key', 'repeated_supplier', 'Fornecedor repetido no arquivo (primeira ocorrência na linha {first}). Vale a última linha.'
    );
    update private.import_rows r set duplicate = 'existing'
    where r.import_id = target.id
      and exists (select 1 from public.suppliers s where s.organization_id = r.organization_id and s.name_key = r.data ->> 'name_key');

    select jsonb_build_object(
      'rows', count(*),
      'newSuppliers', count(distinct r.data ->> 'name_key') filter (where r.duplicate is null),
      'updatedSuppliers', count(distinct r.data ->> 'name_key') filter (where r.duplicate = 'existing')
    ), 0
    into result, duplicates
    from private.import_rows r
    where r.import_id = target.id;
  end if;

  update public.data_imports
  set status = 'validated',
      validated_at = now(),
      batch_count = batches,
      total_rows = staged + rejected,
      valid_rows = staged,
      error_count = rejected,
      warning_count = warning_total + extra_warnings,
      duplicate_rows = duplicates,
      period_start = first_date,
      period_end = last_date,
      summary = result
  where id = target.id;

  return result;
end
$$;

-- ---------------------------------------------------------------------------
-- Privilégios de execução
-- ---------------------------------------------------------------------------

revoke all on function
  private.text_key(text),
  private.sku_key(text),
  private.active_import_ids(uuid),
  private.require_member(uuid, public.org_role),
  private.lock_import(uuid, public.org_role),
  private.lock_organization_imports(uuid),
  private.stage_rows(public.data_imports, integer, jsonb),
  private.fingerprint_sales(uuid),
  private.classify_sales(uuid, integer),
  private.classify_inventory(uuid, integer),
  private.warn_repeated_rows(public.data_imports, text, text, text)
from public, anon, authenticated;

-- Usada pelas funções de métricas (SECURITY INVOKER) e pelo motor.
grant execute on function private.active_import_ids(uuid) to authenticated, service_role;

revoke all on function
  public.create_import(uuid, public.import_dataset, text, text, bigint, text),
  public.confirm_import_upload(uuid),
  public.save_import_mapping(uuid, jsonb, jsonb, text),
  public.stage_import_batch(uuid, integer, jsonb, jsonb),
  public.finish_validation(uuid, integer)
from public, anon;
grant execute on function
  public.create_import(uuid, public.import_dataset, text, text, bigint, text),
  public.confirm_import_upload(uuid),
  public.save_import_mapping(uuid, jsonb, jsonb, text),
  public.stage_import_batch(uuid, integer, jsonb, jsonb),
  public.finish_validation(uuid, integer)
to authenticated;
