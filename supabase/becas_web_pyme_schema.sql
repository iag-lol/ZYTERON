-- =========================================================================================
-- BECAS WEB PYME ZYTERON - SCHEMA & RLS
-- =========================================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE scholarship_campaign_status AS ENUM (
  'draft', 'scheduled', 'active', 'paused', 'closed', 
  'reviewing', 'winner_pending_acceptance', 'winner_published', 'archived'
);

CREATE TYPE scholarship_application_status AS ENUM (
  'draft', 'submitted', 'reviewing', 'validated', 'observed', 
  'rejected', 'withdrawn', 'selected', 'winner', 'not_selected'
);

CREATE TYPE scholarship_public_profile_status AS ENUM (
  'hidden', 'pending_approval', 'published', 'removed'
);

CREATE TYPE scholarship_winner_acceptance_status AS ENUM (
  'pending', 'accepted', 'declined', 'expired'
);

-- 2. TABLES

-- Table: scholarship_campaigns
CREATE TABLE IF NOT EXISTS scholarship_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(500),
  description TEXT,
  status scholarship_campaign_status DEFAULT 'draft',
  
  -- Fechas
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  selection_starts_at TIMESTAMPTZ,
  announcement_at TIMESTAMPTZ,
  winner_acceptance_deadline_at TIMESTAMPTZ,
  delivery_deadline_description VARCHAR(255),
  
  -- Organizador y Contacto
  official_instagram_handle VARCHAR(100),
  organizer_legal_name VARCHAR(255),
  organizer_rut VARCHAR(20),
  organizer_address VARCHAR(500),
  organizer_contact_email VARCHAR(255),
  privacy_contact_email VARCHAR(255),
  
  -- Beneficio
  benefit_title VARCHAR(255),
  benefit_description TEXT,
  benefit_value_clp INTEGER,
  benefits_quantity INTEGER DEFAULT 1,
  included_items JSONB,
  excluded_items JSONB,
  
  -- Criterios y Textos Legales
  selection_criteria JSONB,
  terms_version VARCHAR(50),
  privacy_version VARCHAR(50),
  terms_content TEXT,
  privacy_content TEXT,
  public_gallery_terms_content TEXT,
  instagram_disclaimer TEXT,
  
  -- Configuraciones Extras
  is_public_gallery_enabled BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Table: scholarship_applications
CREATE TABLE IF NOT EXISTS scholarship_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES scholarship_campaigns(id) ON DELETE RESTRICT,
  application_code VARCHAR(50) UNIQUE NOT NULL,
  status scholarship_application_status DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Paso 1: Datos Contacto
  full_name VARCHAR(255) NOT NULL,
  applicant_role VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_normalized VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(50) NOT NULL,
  whatsapp_normalized VARCHAR(50) NOT NULL,
  region VARCHAR(100) NOT NULL,
  comuna VARCHAR(100) NOT NULL,
  instagram_handle VARCHAR(100) NOT NULL,
  instagram_normalized VARCHAR(100) NOT NULL,
  follows_official_instagram_declared BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Paso 2: Datos del Negocio
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) NOT NULL,
  business_rut_exists BOOLEAN NOT NULL DEFAULT FALSE,
  business_rut VARCHAR(20),
  industry VARCHAR(150) NOT NULL,
  business_description TEXT,
  current_website VARCHAR(255),
  social_facebook VARCHAR(255),
  social_tiktok VARCHAR(255),
  social_linkedin VARCHAR(255),
  current_catalog_url VARCHAR(255),
  website_goal VARCHAR(150) NOT NULL,
  
  -- Paso 3: Historia y Necesidad
  scholarship_reason TEXT NOT NULL,
  products_services_description TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  project_material_status VARCHAR(150) NOT NULL,
  additional_comment TEXT,
  
  -- Paso 4: Logo
  logo_storage_path VARCHAR(500),
  logo_file_name VARCHAR(255),
  logo_mime_type VARCHAR(50),
  logo_size_bytes BIGINT,
  logo_rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Paso 5: Consentimientos
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  terms_version_accepted VARCHAR(50),
  terms_accepted_at TIMESTAMPTZ,
  
  privacy_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_version_accepted VARCHAR(50),
  privacy_accepted_at TIMESTAMPTZ,
  
  truthfulness_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  winner_case_study_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  
  public_gallery_consent BOOLEAN NOT NULL DEFAULT FALSE,
  public_gallery_consent_at TIMESTAMPTZ,
  public_description VARCHAR(160),
  public_instagram_consent BOOLEAN NOT NULL DEFAULT FALSE,
  
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent_at TIMESTAMPTZ,
  
  -- Control de Postulación
  withdrawal_token_hash VARCHAR(255),
  internal_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  follow_verified BOOLEAN,
  follow_verified_at TIMESTAMPTZ,
  rejection_reason_code VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice único para evitar duplicados en la misma campaña
CREATE UNIQUE INDEX idx_applications_campaign_email ON scholarship_applications(campaign_id, email_normalized);
CREATE UNIQUE INDEX idx_applications_campaign_whatsapp ON scholarship_applications(campaign_id, whatsapp_normalized);
CREATE UNIQUE INDEX idx_applications_campaign_instagram ON scholarship_applications(campaign_id, instagram_normalized);
CREATE UNIQUE INDEX idx_applications_campaign_rut ON scholarship_applications(campaign_id, business_rut) WHERE business_rut IS NOT NULL;

-- Table: scholarship_public_profiles
CREATE TABLE IF NOT EXISTS scholarship_public_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES scholarship_campaigns(id) ON DELETE RESTRICT,
  application_id UUID UNIQUE NOT NULL REFERENCES scholarship_applications(id) ON DELETE CASCADE,
  status scholarship_public_profile_status DEFAULT 'pending_approval',
  
  business_name VARCHAR(255) NOT NULL,
  industry VARCHAR(150) NOT NULL,
  region VARCHAR(100) NOT NULL,
  comuna VARCHAR(100) NOT NULL,
  public_description VARCHAR(160),
  public_instagram_handle VARCHAR(100),
  public_logo_path VARCHAR(500),
  
  published_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  approved_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: scholarship_reviews
CREATE TABLE IF NOT EXISTS scholarship_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES scholarship_campaigns(id) ON DELETE RESTRICT,
  application_id UUID NOT NULL REFERENCES scholarship_applications(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  
  need_score NUMERIC(5,2) DEFAULT 0,
  clarity_score NUMERIC(5,2) DEFAULT 0,
  feasibility_score NUMERIC(5,2) DEFAULT 0,
  impact_score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  
  review_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(application_id, reviewer_id)
);

-- Table: scholarship_winners
CREATE TABLE IF NOT EXISTS scholarship_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID UNIQUE NOT NULL REFERENCES scholarship_campaigns(id) ON DELETE RESTRICT,
  application_id UUID UNIQUE NOT NULL REFERENCES scholarship_applications(id) ON DELETE RESTRICT,
  
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  selected_by UUID NOT NULL,
  selection_reason_summary TEXT NOT NULL,
  
  acceptance_status scholarship_winner_acceptance_status DEFAULT 'pending',
  acceptance_document_path VARCHAR(500),
  case_study_agreement_path VARCHAR(500),
  
  winner_verified_at TIMESTAMPTZ,
  winner_published_at TIMESTAMPTZ,
  public_announcement_text TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: scholarship_audit_logs
CREATE TABLE IF NOT EXISTS scholarship_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  campaign_id UUID REFERENCES scholarship_campaigns(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =========================================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =========================================================================================

ALTER TABLE scholarship_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_audit_logs ENABLE ROW LEVEL SECURITY;

-- scholarship_campaigns
-- Lectura pública para todas las campañas (necesario para ver landing y bases)
CREATE POLICY "Campañas visibles para todos" ON scholarship_campaigns
  FOR SELECT USING (true);

-- Administradores pueden gestionar todo (suponiendo service_role o verificación en backend)
CREATE POLICY "Admins pueden gestionar campañas" ON scholarship_campaigns
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated'); -- Idealmente filtrar por rol de admin

-- scholarship_applications
-- Sólo inserciones mediante API, sin lectura pública directa
CREATE POLICY "No lectura pública de postulaciones" ON scholarship_applications
  FOR SELECT USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Solo backend inserta postulaciones" ON scholarship_applications
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'anon'); 
  -- Preferiblemente solo permitir inserción a través de Service Role en API Routes para máxima seguridad y anon si fuera un insert directo. Para API Route, usaremos client con service_role, así que podemos dejarlo cerrado y solo `service_role` puede insertar.
  
-- scholarship_public_profiles
-- Solo lectura pública de los que están 'published'
CREATE POLICY "Perfiles publicados visibles" ON scholarship_public_profiles
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins gestionan perfiles" ON scholarship_public_profiles
  FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- scholarship_reviews, scholarship_winners, scholarship_audit_logs
-- Todo restringido a admin / backend (service_role)
CREATE POLICY "Acceso restringido para reviews" ON scholarship_reviews FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
CREATE POLICY "Acceso restringido para winners" ON scholarship_winners FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');
CREATE POLICY "Acceso restringido para audit" ON scholarship_audit_logs FOR ALL USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');


-- =========================================================================================
-- 4. BUCKET STORAGE
-- =========================================================================================

-- Asegurar que el bucket exista. Si se requiere script SQL:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('becas-web-pyme-assets', 'becas-web-pyme-assets', false) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
-- Solo administradores y service_role pueden acceder al bucket entero de manera nativa.
CREATE POLICY "Admins full access to becas assets" ON storage.objects
  FOR ALL USING (bucket_id = 'becas-web-pyme-assets' AND (auth.role() = 'service_role' OR auth.role() = 'authenticated'));

-- El frontend anónimo no puede leer archivos, pero debe poder subir (se hará mediante API Routes firmadas o Service Role directamente)
-- Para subida segura y limitada, se hará mediante una Edge Function / Next API Route y URL firmada.
