alter table public.ai_usage drop constraint ai_usage_job_check;
alter table public.ai_usage add constraint ai_usage_job_check
  check (job in ('draft_tasks','suggest_tags','checklist','report_weekly','report_quarterly','chat'));
