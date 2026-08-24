create table if not exists finished_films (
  id          text primary key,
  title       text not null,
  artist      text not null default 'Willwi',
  album       text not null default '',
  caption     text not null default '',
  cover_b64   text,
  video_b64   text,
  video_mime  text not null default 'video/mp4',
  video_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists finished_films_created_at_idx
  on finished_films (created_at desc);
