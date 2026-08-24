create table if not exists guestbook (
  id          text primary key,
  author      text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists guestbook_created_at_idx
  on guestbook (created_at desc);
