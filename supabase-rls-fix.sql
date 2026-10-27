-- Fix: enable RLS and replace wide-open policies (Supabase alert rls_disabled_in_public)
-- Run in the Supabase SQL Editor for project ckecbzepesnomedmqrpd

-- Remove wide-open catch-all policies
drop policy if exists "Enable all access for surveys" on public.surveys;
drop policy if exists "Enable all access for images" on public.images;
drop policy if exists "Enable all access for votes" on public.votes;

-- images: authenticated policies were USING (true); scope to survey owner
drop policy if exists "Authenticated can insert images" on public.images;
drop policy if exists "Authenticated can update images" on public.images;
drop policy if exists "Authenticated can delete images" on public.images;

-- Public read (vote page + results need these)
create policy "Public can read surveys" on public.surveys for select using (true);
create policy "Public can read images" on public.images for select using (true);
create policy "Public can read votes" on public.votes for select using (true);

-- images: only the survey owner can write options
create policy "Owner can insert images" on public.images for insert to authenticated
  with check (exists (select 1 from public.surveys s where s.id = survey_id and s.user_id = auth.uid()));
create policy "Owner can update images" on public.images for update to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.surveys s where s.id = survey_id and s.user_id = auth.uid()));
create policy "Owner can delete images" on public.images for delete to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id and s.user_id = auth.uid()));

-- votes: anyone can vote, but only for an option that belongs to that survey; no update/delete
create policy "Public can insert votes" on public.votes for insert to anon, authenticated
  with check (exists (select 1 from public.images i where i.id = image_id and i.survey_id = votes.survey_id));

-- surveys keeps its existing owner-scoped insert/update/delete policies

alter table public.surveys enable row level security;
alter table public.images enable row level security;
alter table public.votes enable row level security;
