-- ============================================================
-- MAGAZZINO DIVISE — Migrazione v6
-- 1. I movimenti (carico/scarico) diventano multi-articolo, con
--    un riferimento (es. numero fattura) condiviso tra le righe.
--    Non sono più legati a un dipendente né a uno stato.
-- 2. Nuova tabella "assegnazioni": collega un articolo a uno o
--    più dipendenti con relativa quantità e stato
--    (Consegnato/Reso/Altro). Un "Reso" torna in giacenza.
-- 3. La giacenza ora si calcola come:
--    Carichi - Scarichi - Assegnazioni non rese
-- Sicuro da eseguire su un database già in uso.
-- ============================================================
-- Esegui in: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1. Nuovi campi sui movimenti: riferimento (es. numero fattura)
--    e gruppo_id (per collegare le righe inserite insieme)
alter table movimenti add column if not exists riferimento text;
alter table movimenti add column if not exists gruppo_id uuid;

-- 2. Nuova tabella assegnazioni (sostituisce l'uso di "scarico + dipendente")
create table if not exists assegnazioni (
  id                uuid primary key default gen_random_uuid(),
  data_assegnazione date not null default current_date,
  articolo_id       uuid not null references articoli(id) on delete restrict,
  azienda_id        uuid references aziende(id),
  dipendente_id     uuid not null references dipendenti(id) on delete restrict,
  quantita          integer not null check (quantita > 0),
  stato             text not null default 'Consegnato' check (stato in ('Consegnato', 'Reso', 'Altro')),
  note              text,
  movimento_rif     uuid references movimenti(id) on delete set null,
  creato_da         uuid references auth.users(id),
  created_at        timestamptz not null default now()
);

create index if not exists idx_assegnazioni_dipendente on assegnazioni(dipendente_id);
create index if not exists idx_assegnazioni_articolo on assegnazioni(articolo_id);

-- 3. Migra gli scarichi storici già legati a un dipendente nella nuova
--    tabella assegnazioni, poi li rimuove dai movimenti (altrimenti
--    verrebbero sottratti due volte dalla giacenza).
--    Se non avevi ancora usato la funzione "scarico a dipendente",
--    questo passaggio semplicemente non troverà nulla da spostare.
insert into assegnazioni (data_assegnazione, articolo_id, azienda_id, dipendente_id, quantita, stato, note, creato_da, created_at)
select data_mov, articolo_id, azienda_id, dipendente_id, quantita, coalesce(stato, 'Consegnato'), note, creato_da, created_at
from movimenti
where tipo = 'Scarico' and dipendente_id is not null;

delete from movimenti where tipo = 'Scarico' and dipendente_id is not null;

-- 4. Vista giacenze aggiornata: Carichi - Scarichi - Assegnazioni non rese
drop view if exists giacenze;
create view giacenze as
select
  a.id            as articolo_id,
  a.codice,
  a.tipologia,
  a.colore,
  a.genere,
  a.taglia,
  a.soglia_min,
  az.id           as azienda_id,
  az.nome         as azienda_nome,
  coalesce(mc.tot, 0) - coalesce(ms.tot, 0) - coalesce(asg.tot, 0) as giacenza_attuale
from articoli a
cross join aziende az
left join (
  select articolo_id, azienda_id, sum(quantita) as tot from movimenti where tipo = 'Carico' group by articolo_id, azienda_id
) mc on mc.articolo_id = a.id and mc.azienda_id = az.id
left join (
  select articolo_id, azienda_id, sum(quantita) as tot from movimenti where tipo = 'Scarico' group by articolo_id, azienda_id
) ms on ms.articolo_id = a.id and ms.azienda_id = az.id
left join (
  select articolo_id, azienda_id, sum(quantita) as tot from assegnazioni where coalesce(stato, 'Consegnato') <> 'Reso' group by articolo_id, azienda_id
) asg on asg.articolo_id = a.id and asg.azienda_id = az.id
where a.attivo = true
order by a.tipologia, a.colore, a.genere, a.taglia, az.nome;

-- 5. Controllo giacenza sufficiente sui movimenti di scarico (aggiornato
--    per considerare anche le assegnazioni)
create or replace function check_giacenza_sufficiente()
returns trigger as $$
declare
  giacenza_corrente integer;
begin
  if new.tipo = 'Scarico' then
    select
      coalesce(sum(case when tipo = 'Carico' then quantita else 0 end), 0)
      - coalesce(sum(case when tipo = 'Scarico' then quantita else 0 end), 0)
    into giacenza_corrente
    from movimenti
    where articolo_id = new.articolo_id and azienda_id = new.azienda_id;

    giacenza_corrente := giacenza_corrente - coalesce((
      select sum(quantita) from assegnazioni
      where articolo_id = new.articolo_id and azienda_id = new.azienda_id and coalesce(stato, 'Consegnato') <> 'Reso'
    ), 0);

    if giacenza_corrente < new.quantita then
      raise exception 'Giacenza insufficiente per questa società: disponibili % pezzi, richiesti %', giacenza_corrente, new.quantita;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- 6. Stesso controllo applicato quando si assegna un articolo a un dipendente
create or replace function check_giacenza_sufficiente_assegnazione()
returns trigger as $$
declare
  giacenza_corrente integer;
begin
  select
    coalesce(sum(case when tipo = 'Carico' then quantita else 0 end), 0)
    - coalesce(sum(case when tipo = 'Scarico' then quantita else 0 end), 0)
  into giacenza_corrente
  from movimenti
  where articolo_id = new.articolo_id and azienda_id is not distinct from new.azienda_id;

  giacenza_corrente := giacenza_corrente - coalesce((
    select sum(quantita) from assegnazioni
    where articolo_id = new.articolo_id and azienda_id is not distinct from new.azienda_id and coalesce(stato, 'Consegnato') <> 'Reso'
  ), 0);

  if giacenza_corrente < new.quantita then
    raise exception 'Giacenza insufficiente per questo articolo in questa società: disponibili % pezzi, richiesti %', giacenza_corrente, new.quantita;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_check_giacenza_assegnazione on assegnazioni;
create trigger trg_check_giacenza_assegnazione
  before insert on assegnazioni
  for each row execute function check_giacenza_sufficiente_assegnazione();

-- 7. Sicurezza: permette di creare, modificare ed eliminare movimenti
--    e assegnazioni agli utenti autenticati (operatori)
drop policy if exists "authenticated delete mov" on movimenti;
create policy "authenticated delete mov" on movimenti for delete using (auth.role() = 'authenticated');

alter table assegnazioni enable row level security;

drop policy if exists "authenticated read assegnazioni" on assegnazioni;
create policy "authenticated read assegnazioni" on assegnazioni for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write assegnazioni" on assegnazioni;
create policy "authenticated write assegnazioni" on assegnazioni for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update assegnazioni" on assegnazioni;
create policy "authenticated update assegnazioni" on assegnazioni for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete assegnazioni" on assegnazioni;
create policy "authenticated delete assegnazioni" on assegnazioni for delete using (auth.role() = 'authenticated');
