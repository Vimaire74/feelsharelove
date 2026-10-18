-- Connect — même structure que la base locale, pour le futur serveur (PostgreSQL / Supabase)
create table profiles (
  id uuid primary key,
  name text not null, city text, tz smallint default 0, online boolean default false,
  intent text[] default '{}',          -- parler / amis / amour
  now text, photo_url text,
  facts jsonb default '{}',            -- { birth:{v,show,year}, langs:{v,show}, ... }
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table entries (
  id uuid primary key, profile_id uuid references profiles(id) on delete cascade,
  kind text not null, title text not null, title_norm text not null,   -- title_norm : sans accents ni majuscules, pour les résonances
  work_id uuid,                                                          -- futur catalogue d'œuvres
  why text, created_at timestamptz default now()
);
create index on entries(profile_id); create index on entries(title_norm);
create table questions (
  id uuid primary key, profile_id uuid references profiles(id) on delete cascade,
  k text not null, a text
);
create table messages (
  id uuid primary key, from_id uuid references profiles(id), to_id uuid references profiles(id),
  kind text default 'text',            -- text | ephemeral
  text text, about_entry uuid references entries(id),
  seconds smallint, seen boolean default false,
  ephemeral_blob text,                 -- copie chiffrée gardée quelques jours pour la modération, puis détruite
  expires_at timestamptz, ts timestamptz default now()
);
create index on messages(from_id, to_id);
create table lists (
  id uuid primary key, owner_id uuid references profiles(id) on delete cascade,
  type text not null,                  -- red | black
  name text, hint text, created_at timestamptz default now()
);
create table reports (
  id uuid primary key, by_id uuid references profiles(id), target_id uuid references profiles(id),
  kind text not null,                  -- profile | photo | block
  message_id uuid references messages(id), reason text, status text default 'open',
  created_at timestamptz default now()
);
create table circles (id uuid primary key, title text not null, members int default 0);
