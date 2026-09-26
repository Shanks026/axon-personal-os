alter table public.notes
  add column kind text not null default 'note' check (kind in ('note','journal')),
  add column journal_date date,
  add constraint notes_journal_date_chk check ((kind = 'journal') = (journal_date is not null));
create unique index notes_journal_unique on public.notes (user_id, space_id, journal_date)
  where kind = 'journal' and deleted_at is null;
