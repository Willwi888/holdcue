create table if not exists patrons (
  id          text primary key,
  name        text not null,
  email       text not null,
  line_id     text not null default '',
  city        text not null default '',
  plan        text not null,
  amount_twd  integer not null,
  deliver     text not null default 'app',
  code_hash   text not null,
  code_hint   text not null,
  can_lyrics  integer not null default 1,
  can_time    integer not null default 0,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists patrons_email_idx on patrons (email);
create index if not exists patrons_code_hash_idx on patrons (code_hash);

create table if not exists patron_sessions (
  token_hash  text primary key,
  patron_id   text not null references patrons(id),
  created_at  timestamptz not null default now()
);
