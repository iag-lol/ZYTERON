begin;
-- Isolated test intents only. No relationship to Quote, Sale, invoices or stock.
create table if not exists public.zyteron_sandbox_payment_pilot (
 id uuid primary key default gen_random_uuid(), access_hash text not null unique check(length(access_hash)=64),
 account_fingerprint text not null check(length(account_fingerprint)=64), amount integer not null default 1000 check(amount=1000),
 currency text not null default 'CLP' check(currency='CLP'), payer_email text not null,
 state text not null default 'NOT_STARTED' check(state in('NOT_STARTED','CREATING','CREATE_UNKNOWN','PENDING','CONFIRMED','REJECTED','CANCELLED','REVIEW_REQUIRED')),
 attempt_key text, flow_order bigint unique, token_hash text unique, token_ciphertext text, checkout_url text,
 callback_received_at timestamptz, verified_at timestamptz, paid_at timestamptz,
 email_state text not null default 'NOT_SENT' check(email_state in('NOT_SENT','SENDING','UNKNOWN','ACCEPTED','REVIEW_REQUIRED')),
 email_lease uuid, email_lease_until timestamptz, email_first_attempt_at timestamptz, email_provider_id text,
 expires_at timestamptz not null default now()+interval '2 hours', created_at timestamptz not null default now()
);
alter table public.zyteron_sandbox_payment_pilot enable row level security;
revoke all on public.zyteron_sandbox_payment_pilot from public,anon,authenticated;
grant all on public.zyteron_sandbox_payment_pilot to service_role;

create or replace function public.zyteron_pilot_claim(p_id uuid,p_key text,p_account text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.zyteron_sandbox_payment_pilot%rowtype;
begin
 select * into r from public.zyteron_sandbox_payment_pilot where id=p_id for update;
 if r.id is null or r.expires_at<=now() or r.account_fingerprint is distinct from p_account then raise exception 'PILOT_ACCESS_DENIED';end if;
 if r.state<>'NOT_STARTED' then return jsonb_build_object('created',false,'intent',to_jsonb(r));end if;
 if p_key is null or p_key!~'^[A-Za-z0-9_-]{16,80}$' then raise exception 'PILOT_KEY_INVALID';end if;
 update public.zyteron_sandbox_payment_pilot set state='CREATING',attempt_key=p_key where id=p_id returning * into r;
 return jsonb_build_object('created',true,'intent',to_jsonb(r));
end$$;

create or replace function public.zyteron_pilot_apply(p_id uuid,p_account text,p_order bigint,p_amount integer,p_currency text,p_commerce text,p_state text,p_paid timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.zyteron_sandbox_payment_pilot%rowtype;
begin
 select * into r from public.zyteron_sandbox_payment_pilot where id=p_id for update;
 if r.id is null or r.flow_order is null or p_order is null or p_order<=0 or r.state in('NOT_STARTED','CREATING','CREATE_UNKNOWN') or r.account_fingerprint is distinct from p_account or r.id::text is distinct from p_commerce or r.amount is distinct from p_amount or r.currency is distinct from p_currency or r.flow_order is distinct from p_order then raise exception 'PILOT_PAYMENT_MISMATCH';end if;
 if p_state is null or p_state not in('PENDING','CONFIRMED','REJECTED','CANCELLED') or (p_state='CONFIRMED' and p_paid is null) then raise exception 'PILOT_PAYMENT_EVIDENCE_MISSING';end if;
 -- A delayed pending notification cannot revoke a confirmed observation.
 if r.state='CONFIRMED' then return to_jsonb(r);end if;
 update public.zyteron_sandbox_payment_pilot set state=p_state,verified_at=now(),paid_at=case when p_state='CONFIRMED' then p_paid else null end where id=p_id returning * into r;
 return to_jsonb(r);
end$$;

create or replace function public.zyteron_pilot_claim_email(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.zyteron_sandbox_payment_pilot%rowtype;
begin
 select * into r from public.zyteron_sandbox_payment_pilot where id=p_id for update;
 if r.id is null or r.state<>'CONFIRMED' or r.verified_at is null or r.paid_at is null or r.email_state in('ACCEPTED','REVIEW_REQUIRED') or r.email_lease_until>now() then return null;end if;
 if r.email_first_attempt_at<now()-interval '23 hours' then update public.zyteron_sandbox_payment_pilot set email_state='REVIEW_REQUIRED' where id=p_id;return null;end if;
 update public.zyteron_sandbox_payment_pilot set email_state='SENDING',email_lease=gen_random_uuid(),email_lease_until=now()+interval '2 minutes',email_first_attempt_at=coalesce(email_first_attempt_at,now()) where id=p_id returning * into r;
 return to_jsonb(r);
end$$;
create or replace function public.zyteron_pilot_finish_email(p_id uuid,p_lease uuid,p_provider text) returns void language plpgsql security definer set search_path='' as $$begin
 update public.zyteron_sandbox_payment_pilot set email_state=case when p_provider is null then 'UNKNOWN' else 'ACCEPTED' end,email_provider_id=p_provider,email_lease_until=null where id=p_id and email_lease=p_lease and email_state='SENDING';
 if not found then raise exception 'PILOT_EMAIL_LEASE_LOST';end if;
end$$;
revoke all on function public.zyteron_pilot_claim(uuid,text,text),public.zyteron_pilot_apply(uuid,text,bigint,integer,text,text,text,timestamptz),public.zyteron_pilot_claim_email(uuid),public.zyteron_pilot_finish_email(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.zyteron_pilot_claim(uuid,text,text),public.zyteron_pilot_apply(uuid,text,bigint,integer,text,text,text,timestamptz),public.zyteron_pilot_claim_email(uuid),public.zyteron_pilot_finish_email(uuid,uuid,text) to service_role;
commit;
