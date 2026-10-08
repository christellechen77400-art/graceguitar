-- GCCGuitare — le schéma du compte.
--
-- À exécuter en entier dans l'éditeur SQL du projet Supabase, une fois. Le script
-- est refaisable : tout est en `if not exists` ou remplacé, donc le relancer ne
-- casse rien.
--
-- Deux principes gouvernent ce fichier :
--
-- 1. **Aucune colonne pour les paroles.** Elles ne quittent jamais l'appareil ;
--    ce qui n'a pas de colonne ne peut pas fuir par erreur.
-- 2. **Chaque table est fermée par RLS**, et chaque politique se limite à
--    `auth.uid()`. Sans politique, personne ne lit rien — c'est voulu : un oubli
--    ferme l'accès au lieu de l'ouvrir.
--
-- Les identifiants sont des `text` et non des `uuid` : ils viennent du téléphone,
-- qui fabrique les siens (« song-… », « set-… », et pour une réponse l'instant de
-- la séance suivi de son rang). C'est ce qui rend un envoi refait sans effet : la
-- même réponse porte toujours le même identifiant.

-- ---------------------------------------------------------------------------
-- Le profil
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  level int not null default 2 check (level between 1 and 3),
  locale text not null default 'fr',
  notation text not null default 'anglo',
  handedness text not null default 'right',
  preferred_capo_shapes int[] not null default '{}',
  daily_goal_minutes int not null default 10,
  reminder_time int not null default 19,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Une ligne de profil pour chaque compte, posée à l'inscription : l'app peut
-- alors lire le prénom dès la première connexion, sans attendre qu'elle l'écrive.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'first_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_on_signup on auth.users;
create trigger create_profile_on_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- ---------------------------------------------------------------------------
-- Les chants (sans les paroles)
-- ---------------------------------------------------------------------------

create table if not exists public.songs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  default_key int not null,
  mode text not null default 'major',
  sections jsonb,
  tempo int,
  notes text,
  reference_url text,
  source text not null default 'manual',
  updated_at timestamptz not null default now()
);

create index if not exists songs_user_idx on public.songs (user_id);

-- ---------------------------------------------------------------------------
-- Les sets, et leurs chants
-- ---------------------------------------------------------------------------

create table if not exists public.sets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  service_date date not null,
  service_name text,
  source text not null default 'manual',
  updated_at timestamptz not null default now()
);

create index if not exists sets_user_idx on public.sets (user_id);

-- `position` n'est pas unique : réordonner un set écrit les nouvelles places
-- avant de retirer les anciennes, et une contrainte d'unicité ferait échouer le
-- premier des deux. L'ordre est rétabli à la lecture, par tri.
create table if not exists public.set_songs (
  id text primary key,
  set_id text not null references public.sets (id) on delete cascade,
  song_id text not null references public.songs (id) on delete cascade,
  key int not null,
  capo int not null default 0,
  position int not null default 0
);

create index if not exists set_songs_set_idx on public.set_songs (set_id);

-- ---------------------------------------------------------------------------
-- Les réponses, une ligne par question
-- ---------------------------------------------------------------------------

-- La progression n'est pas un total mais une liste de réponses : c'est ce qui
-- permet de la reconstruire à l'identique sur un autre appareil, et d'envoyer
-- deux fois la même séance sans compter deux fois.
create table if not exists public.progress_events (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  "string" int not null,
  fret int not null,
  correct boolean not null,
  response_ms int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists progress_events_user_idx on public.progress_events (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.sets enable row level security;
alter table public.set_songs enable row level security;
alter table public.progress_events enable row level security;

-- Le profil : le sien, et rien d'autre.
drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Les chants : les siens.
drop policy if exists songs_own on public.songs;
create policy songs_own on public.songs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Les sets : les siens.
drop policy if exists sets_own on public.sets;
create policy sets_own on public.sets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Une place dans un set appartient à qui possède le set.
drop policy if exists set_songs_own on public.set_songs;
create policy set_songs_own on public.set_songs
  for all to authenticated
  using (
    exists (select 1 from public.sets s where s.id = set_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.sets s where s.id = set_id and s.user_id = auth.uid())
  );

-- Les réponses : les siennes.
drop policy if exists progress_events_own on public.progress_events;
create policy progress_events_own on public.progress_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Les droits
-- ---------------------------------------------------------------------------

-- RLS filtre les lignes ; ces droits ouvrent les tables. Les deux sont
-- nécessaires, et dans cet ordre : sans politique, ces droits ne montrent rien.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.songs to authenticated;
grant select, insert, update, delete on public.sets to authenticated;
grant select, insert, update, delete on public.set_songs to authenticated;
grant select, insert, update, delete on public.progress_events to authenticated;
