create or replace function public.search_all(
  p_query          text,
  p_space_ids      uuid[],
  p_limit          int     default 20,
  p_include_global boolean default false,
  p_types          text[]  default null
)
returns table (
  entity_type text,
  id          uuid,
  space_id    uuid,
  title       text,
  snippet     text,
  status      text,
  rank        real,
  updated_at  timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  -- Typos match through word similarity (a close word inside a longer title), compared at 0.4:
  -- the `<%` operator's default 0.6 threshold misses one-letter slips, and a stable function
  -- can't change it. Single-user data sizes make the unindexed comparison cheap.
  with q as (
    select
      btrim(p_query) as raw,
      websearch_to_tsquery('english', btrim(p_query)) as tsq,
      '%' || replace(replace(replace(btrim(p_query), '\', '\'), '%', '\%'), '_', '\_') || '%' as pat,
      replace(replace(replace(btrim(p_query), '\', '\'), '%', '\%'), '_', '\_') || '%' as prefix
    where char_length(btrim(coalesce(p_query, ''))) >= 2
  ),
  hits as (
    select 'task'::text as entity_type, t.id, t.space_id, t.title, t.description_text as body,
           t.status, t.updated_at,
           (greatest(ts_rank(t.search, q.tsq), extensions.word_similarity(q.raw, t.title))
             + case when t.title ilike q.prefix then 0.5 else 0 end)::real as rank
      from public.tasks t, q
     where t.deleted_at is null
       and t.space_id = any (p_space_ids)
       and (t.search @@ q.tsq or t.title ilike q.pat or extensions.word_similarity(q.raw, t.title) >= 0.4)
    union all
    select case when n.kind = 'journal' then 'journal' else 'note' end, n.id, n.space_id, n.title, n.content_text,
           case when n.kind = 'journal' then n.journal_date::text end, n.updated_at,
           (greatest(ts_rank(n.search, q.tsq), extensions.word_similarity(q.raw, n.title))
             + case when n.title ilike q.prefix then 0.5 else 0 end)::real
      from public.notes n, q
     where n.deleted_at is null
       and n.space_id = any (p_space_ids)
       and (n.search @@ q.tsq or n.title ilike q.pat or extensions.word_similarity(q.raw, n.title) >= 0.4)
    union all
    select 'report', r.id, r.space_id, r.title, r.content_text, r.status, r.updated_at,
           (greatest(ts_rank(r.search, q.tsq), extensions.word_similarity(q.raw, r.title))
             + case when r.title ilike q.prefix then 0.5 else 0 end)::real
      from public.reports r, q
     where r.deleted_at is null
       and (r.space_id = any (p_space_ids) or (p_include_global and r.space_id is null))
       and (r.search @@ q.tsq or r.title ilike q.pat or extensions.word_similarity(q.raw, r.title) >= 0.4)
    union all
    select 'todo', d.id, d.space_id, d.title, null::text,
           case when d.is_done then 'done' else 'open' end, d.updated_at,
           (extensions.word_similarity(q.raw, d.title)
             + case when d.title ilike q.prefix then 0.5 else 0 end)::real
      from public.todos d, q
     where d.deleted_at is null
       and d.task_id is null
       and d.space_id = any (p_space_ids)
       and (d.title ilike q.pat or extensions.word_similarity(q.raw, d.title) >= 0.4)
    union all
    select 'event', e.id, e.space_id, e.title, e.description,
           to_char(e.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), e.updated_at,
           (extensions.word_similarity(q.raw, e.title)
             + case when e.title ilike q.prefix then 0.5 else 0 end)::real
      from public.events e, q
     where e.deleted_at is null
       and e.space_id = any (p_space_ids)
       and (e.title ilike q.pat or extensions.word_similarity(q.raw, e.title) >= 0.4)
  ),
  top as (
    select * from hits
     where p_types is null or hits.entity_type = any (p_types)
     order by rank desc, updated_at desc
     limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select h.entity_type, h.id, h.space_id, h.title,
         case
           when coalesce(h.body, '') = '' then null
           when h.entity_type in ('task', 'note', 'journal', 'report') then
             ts_headline('english', left(h.body, 20000), q.tsq,
               'MaxFragments=1, MaxWords=18, MinWords=6, ShortWord=2, StartSel=' || chr(57344) || ', StopSel=' || chr(57345))
           else left(h.body, 140)
         end,
         h.status, h.rank, h.updated_at
    from top h, q
   order by h.rank desc, h.updated_at desc;
$$;
