create table if not exists public.texts (
  text_id text primary key,
  titel text not null,
  ophav text not null default '',
  rolle_ophav text not null default '',
  ar text not null default '',
  medieform text not null default '',
  genre text not null default '',
  platform_eller_kilde text not null default '',
  primaer_tekstkategori text not null,
  sekundaer_tekstkategori text not null default '',
  temaer text[] not null default '{}',
  periode text not null default '',
  fp9_relevans text not null default 'uklar' check (fp9_relevans in ('høj', 'middel', 'lav', 'uklar')),
  mulige_fordybelsesomraader text[] not null default '{}',
  kan_indgaa_i_tekstopgivelser text not null default 'kræver vurdering'
    check (kan_indgaa_i_tekstopgivelser in ('ja', 'nej', 'kræver vurdering')),
  anbefalet_brug text not null default 'supplerende materiale'
    check (anbefalet_brug in ('hovedtekst', 'perspektivering', 'supplerende materiale')),
  klassifikationssikkerhed integer not null check (klassifikationssikkerhed between 0 and 100),
  status text not null check (status in ('verificeret', 'foreløbig', 'kræver kilde')),
  kilder text[] not null default '{}',
  faglige_noter text not null default '',
  oprettet timestamptz not null default timezone('utc', now()),
  sidst_opdateret timestamptz not null default timezone('utc', now())
);

create index if not exists texts_status_idx on public.texts (status);
create index if not exists texts_fp9_relevans_idx on public.texts (fp9_relevans);
create index if not exists texts_primaer_tekstkategori_idx on public.texts (primaer_tekstkategori);
create index if not exists texts_temaer_gin_idx on public.texts using gin (temaer);
create index if not exists texts_titel_idx on public.texts (titel);
create index if not exists texts_ophav_idx on public.texts (ophav);
