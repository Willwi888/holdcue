create table if not exists metro_stations (
  slug        text primary key,
  code        text not null,
  title       text not null,
  en          text not null,
  sort_order  integer not null,
  desc_text   text not null default '',
  copy_text   text not null default '',
  audio_url   text,
  audio_b64   text,
  audio_mime  text not null default 'audio/mpeg',
  cover_url   text
);

create table if not exists metro_copy (
  key    text primary key,
  value  text not null
);

create table if not exists desk_sessions (
  token_hash  text primary key,
  created_at  timestamptz not null default now()
);

insert into metro_stations (slug, code, title, en, sort_order, desc_text, copy_text) values
  ('empty-seat', 'EM01', '空位', 'Empty Seat', 1,
   '不提供座位，只提供理解。',
   '有些位置本來以為會有人一直在。那個人還在，可是那個位置，已經變成你不認得的樣子。'),
  ('memory-frame', 'EM02', '回憶相框', 'Memory Frame', 2,
   '遺憾可以帶上車，但不要忘記拿走。',
   '我會學著，把回憶摺好，收進相框。不是丟掉，是放到一個剛好的地方。'),
  ('not-my-happiness', 'EM03', '不屬於我的幸福', 'Not My Happiness', 3,
   '本列車不開往你的幸福。',
   '不屬於我的幸福，請你慢走。是真心祝福，也是很痛的承認。'),
  ('expired', 'EM04', '過期', 'Expired', 4,
   '本列車販售之座位可能已過期。',
   '原來幸福也有保存期限。不是誰錯了，只是我們的時間剛好走散。'),
  ('no-goodbye', 'EM05', '不告別', 'No Goodbye', 5,
   '本列車不提供告別廣播。',
   '後來我學會，和想念和平共處。有些人沒有正式說再見，但你還是得學會往前。'),
  ('unworthy-pain', 'EM06', '沒資格的痛', 'Unworthy Pain', 6,
   '能站在這裡的人其實都已經輸過了。',
   '連回憶都不准我留。寫給那些連難過都不被承認的人。'),
  ('leave-it-to-me', 'EM07', '接下來交給我', 'Leave It to Me', 7,
   '請把自己的未來交給自己。',
   '學會在沒有你的世界裡呼吸。這裡不是痊癒，是慢慢接手自己。'),
  ('wae-ijeya', 'EM08', '왜 이제야', 'Why Only Now', 8,
   '成功換來的空位。',
   '為什麼現在才懂？很多答案都是很晚才到，但還是值得被寫下來。'),
  ('goodnight-radio', 'EM09', '晚安電台', 'Goodnight Radio', 9,
   '提供過夜服務。退房時間：你準備好面對明天的時候。',
   '你確定不睡嗎？明天還要上班喔。這一站比較像一個可以暫停的房間。')
on conflict (slug) do nothing;

insert into metro_copy (key, value) values
  ('night_kicker', '深夜情緒模式'),
  ('night_lead', '這一站比較暗。'),
  ('night_body', '你可以只是坐著。也可以把名字留下來，讓我們知道你來過。不用對時也沒關係。留下來，不是為了完成什麼。是因為這首歌還想記得你。'),
  ('night_cta', '我在這裡'),
  ('night_issued', '這是今晚的票。出站就作廢。我們不會再問一次。')
on conflict (key) do nothing;
