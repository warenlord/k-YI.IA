-- kÆYI — schéma MVP
-- À exécuter dans le SQL Editor du projet Supabase (une seule fois).

create table if not exists public.challenges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  mode          text not null check (mode in ('email', 'decision', 'negociation')),
  input         text not null check (char_length(input) between 1 and 20000),
  output        text not null default '',
  status        text not null default 'streaming' check (status in ('streaming', 'complete', 'error')),
  error_message text,
  created_at    timestamptz not null default now()
);

-- Conversation multi-tours. Un tableau jsonb plutôt qu'une table de messages :
-- on lit toujours la conversation entière, elle est plafonnée à 8 messages, et
-- une session tient donc dans une seule ligne. Bloc idempotent — ce fichier
-- peut être rejoué tel quel sur une base existante.
alter table public.challenges
  add column if not exists messages jsonb not null default '[]'::jsonb;

-- Reprise des sessions créées avant le multi-tours.
update public.challenges
set messages = jsonb_build_array(
      jsonb_build_object('role', 'user', 'content', input),
      jsonb_build_object('role', 'assistant', 'content', output)
    )
where messages = '[]'::jsonb
  and coalesce(output, '') <> '';

create index if not exists challenges_user_created_idx
  on public.challenges (user_id, created_at desc);

alter table public.challenges enable row level security;

-- Un utilisateur ne voit et ne modifie que ses propres échanges.
drop policy if exists "challenges_select_own" on public.challenges;
create policy "challenges_select_own"
  on public.challenges for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "challenges_insert_own" on public.challenges;
create policy "challenges_insert_own"
  on public.challenges for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "challenges_update_own" on public.challenges;
create policy "challenges_update_own"
  on public.challenges for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "challenges_delete_own" on public.challenges;
create policy "challenges_delete_own"
  on public.challenges for delete
  to authenticated
  using (auth.uid() = user_id);
