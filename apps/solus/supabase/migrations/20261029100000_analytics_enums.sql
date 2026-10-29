-- SOLUS · Parte 04 · 1/6 — Novos estados de importação
--
-- Fica sozinha porque um valor novo de enum só pode ser usado depois que a
-- transação que o criou termina (o Supabase aplica cada migration numa
-- transação própria).
--
--   pending     criada; arquivo sendo enviado ou linhas sendo validadas
--   validated   validada no servidor, aguardando a confirmação
--   processing  gravando os dados (em lotes)
--   completed   concluída sem linhas rejeitadas
--   with_errors concluída; algumas linhas foram rejeitadas
--   failed      interrompida por um erro (por exemplo, nenhuma linha válida)
--   canceled    cancelada antes de terminar; nada dela fica nos painéis
--   reverted    desfeita depois de concluída

alter type public.import_status add value if not exists 'validated' after 'pending';
alter type public.import_status add value if not exists 'canceled';
alter type public.import_status add value if not exists 'reverted';
