-- La eliminación con Flow se concilia antes de retirar el registro del listado.
ALTER TABLE public.zyteron_archived_quotes
 ADD COLUMN state text NOT NULL DEFAULT 'ARCHIVED' CHECK(state IN ('PENDING_CANCELLATION','ARCHIVED')),
 ADD COLUMN native_quote_id text REFERENCES public."Quote"(id) ON DELETE RESTRICT;
CREATE INDEX zyteron_pending_quote_archive_idx ON public.zyteron_archived_quotes(native_quote_id) WHERE state='PENDING_CANCELLATION';
GRANT UPDATE(state,reason,actor_id,native_quote_id) ON public.zyteron_archived_quotes TO service_role;
