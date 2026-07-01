-- ============================================================
-- MAGAZZINO DIVISE — Schema database (Supabase / Postgres)
-- ============================================================
-- Esegui questo file in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- SEDI ----------
create table if not exists sedi (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------- DIPENDENTI ----------
create table if not exists dipendenti (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cognome     text not null,
  sede_id     uuid references sedi(id) on delete set null,
  attivo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- ARTICOLI (anagrafica / catalogo) ----------
create type tipologia_capo as enum ('Pantaloni', 'Casacca', 'Camice');
create type genere_capo as enum ('Uomo', 'Donna', 'Unisex');

create table if not exists articoli (
  id          uuid primary key default gen_random_uuid(),
  codice      text not null unique,           -- es. CAS-BLU-U-M
  tipologia   tipologia_capo not null,
  colore      text not null,
  genere      genere_capo not null,
  taglia      text not null,
  soglia_min  integer not null default 0,      -- soglia sotto cui segnalare scorta bassa
  attivo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tipologia, colore, genere, taglia)
);

-- ---------- MOVIMENTI (registro carichi/scarichi) ----------
create type tipo_movimento as enum ('Carico', 'Scarico');

create table if not exists movimenti (
  id            uuid primary key default gen_random_uuid(),
  data_mov      date not null default current_date,
  tipo          tipo_movimento not null,
  articolo_id   uuid not null references articoli(id) on delete restrict,
  quantita      integer not null check (quantita > 0),
  dipendente_id uuid references dipendenti(id) on delete set null, -- obbligatorio lato app se Scarico
  note          text,
  creato_da     uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_movimenti_articolo on movimenti(articolo_id);
create index if not exists idx_movimenti_dipendente on movimenti(dipendente_id);
create index if not exists idx_movimenti_data on movimenti(data_mov);

-- ---------- VIEW: GIACENZE (calcolate in tempo reale) ----------
create or replace view giacenze as
select
  a.id            as articolo_id,
  a.codice,
  a.tipologia,
  a.colore,
  a.genere,
  a.taglia,
  a.soglia_min,
  coalesce(sum(case when m.tipo = 'Carico'  then m.quantita else 0 end), 0)
  - coalesce(sum(case when m.tipo = 'Scarico' then m.quantita else 0 end), 0)
    as giacenza_attuale
from articoli a
left join movimenti m on m.articolo_id = a.id
where a.attivo = true
group by a.id, a.codice, a.tipologia, a.colore, a.genere, a.taglia, a.soglia_min
order by a.tipologia, a.colore, a.genere, a.taglia;

-- ---------- RIGA DI SICUREZZA: impedisce scarichi che portano sotto zero ----------
create or replace function check_giacenza_sufficiente()
returns trigger as $$
declare
  giacenza_corrente integer;
begin
  if new.tipo = 'Scarico' then
    select coalesce(sum(case when tipo = 'Carico' then quantita else -quantita end), 0)
    into giacenza_corrente
    from movimenti
    where articolo_id = new.articolo_id;

    if giacenza_corrente < new.quantita then
      raise exception 'Giacenza insufficiente: disponibili % pezzi, richiesti %', giacenza_corrente, new.quantita;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_check_giacenza on movimenti;
create trigger trg_check_giacenza
  before insert on movimenti
  for each row execute function check_giacenza_sufficiente();

-- ============================================================
-- SICUREZZA (RLS) — tutti gli utenti autenticati (operatori)
-- possono leggere e scrivere. Adatta le policy se in futuro
-- vuoi limitare per sede o per ruolo.
-- ============================================================
alter table sedi        enable row level security;
alter table dipendenti  enable row level security;
alter table articoli    enable row level security;
alter table movimenti   enable row level security;

create policy "authenticated read sedi"   on sedi        for select using (auth.role() = 'authenticated');
create policy "authenticated write sedi"  on sedi        for insert with check (auth.role() = 'authenticated');
create policy "authenticated update sedi" on sedi        for update using (auth.role() = 'authenticated');

create policy "authenticated read dip"    on dipendenti  for select using (auth.role() = 'authenticated');
create policy "authenticated write dip"   on dipendenti  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update dip"  on dipendenti  for update using (auth.role() = 'authenticated');

create policy "authenticated read art"    on articoli    for select using (auth.role() = 'authenticated');
create policy "authenticated write art"   on articoli    for insert with check (auth.role() = 'authenticated');
create policy "authenticated update art"  on articoli    for update using (auth.role() = 'authenticated');

create policy "authenticated read mov"    on movimenti   for select using (auth.role() = 'authenticated');
create policy "authenticated write mov"   on movimenti   for insert with check (auth.role() = 'authenticated');

-- ---------- Dati di esempio (opzionale — puoi eliminare questa sezione) ----------
insert into sedi (nome) values ('Sede Centrale'), ('Filiale Nord'), ('Filiale Sud')
  on conflict (nome) do nothing;
