-- =========================================================================================
-- BECAS WEB PYME ZYTERON - LEGAL VERSIONING & STRICT VALIDATION UPDATES
-- =========================================================================================

-- 1. Create table: scholarship_legal_versions
CREATE TABLE IF NOT EXISTS scholarship_legal_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES scholarship_campaigns(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('terms', 'privacy', 'gallery_terms', 'winner_agreement')),
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  published_at TIMESTAMPTZ NULL,
  effective_from TIMESTAMPTZ NULL,
  effective_until TIMESTAMPTZ NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_by UUID NULL,
  updated_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, document_type, version_number)
);

-- 2. Add columns to scholarship_campaigns
ALTER TABLE scholarship_campaigns 
  ADD COLUMN IF NOT EXISTS current_terms_version_id UUID REFERENCES scholarship_legal_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_privacy_version_id UUID REFERENCES scholarship_legal_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_gallery_terms_version_id UUID REFERENCES scholarship_legal_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_winner_agreement_version_id UUID REFERENCES scholarship_legal_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legal_documents_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_legal_update_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_update_summary TEXT,
  ADD COLUMN IF NOT EXISTS public_results_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS campaign_timezone VARCHAR(100) DEFAULT 'America/Santiago',
  ADD COLUMN IF NOT EXISTS organizer_trade_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS winner_response_days INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS estimated_implementation_time VARCHAR(255),
  ADD COLUMN IF NOT EXISTS intellectual_property_policy TEXT,
  ADD COLUMN IF NOT EXISTS withdrawal_procedure_policy TEXT;

-- 3. Add columns to scholarship_applications for separated timestamp tracking
ALTER TABLE scholarship_applications
  ADD COLUMN IF NOT EXISTS truthfulness_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS logo_rights_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS instagram_confirmed_at TIMESTAMPTZ;

-- 4. Enable RLS on scholarship_legal_versions
ALTER TABLE scholarship_legal_versions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for scholarship_legal_versions
-- Public can read published versions
CREATE POLICY "Public read published legal versions" ON scholarship_legal_versions
  FOR SELECT USING (published_at IS NOT NULL);

-- Admins and service_role can manage all legal versions
CREATE POLICY "Admins manage legal versions" ON scholarship_legal_versions
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_versions_campaign_type ON scholarship_legal_versions(campaign_id, document_type, is_current);
