create extension if not exists pgcrypto;

create table if not exists public.gradebooks (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'MesMoyens',
  students jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists gradebooks_set_updated_at on public.gradebooks;

create trigger gradebooks_set_updated_at
before update on public.gradebooks
for each row
execute function public.set_updated_at();
