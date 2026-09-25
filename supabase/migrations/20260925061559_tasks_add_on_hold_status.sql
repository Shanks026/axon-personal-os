-- Feature 04 follow-up: add the "On hold" task status
alter table public.tasks drop constraint tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('todo','in_progress','in_review','blocked','on_hold','done','cancelled'));
