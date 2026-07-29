CREATE TABLE IF NOT EXISTS cm_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  performance_notes TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cm_campaigns_status_check CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  CONSTRAINT cm_campaigns_approval_check CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected'))
);

CREATE TABLE IF NOT EXISTS cm_posts (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES cm_campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'post',
  tone TEXT NOT NULL DEFAULT 'friendly',
  status TEXT NOT NULL DEFAULT 'draft',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  color_label TEXT NOT NULL DEFAULT 'violet',
  headline TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cta TEXT NOT NULL DEFAULT '',
  hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  emoji_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_ideas JSONB NOT NULL DEFAULT '[]'::jsonb,
  timing_suggestion TEXT NOT NULL DEFAULT '',
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_prompt TEXT NOT NULL DEFAULT '',
  conversation_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  CONSTRAINT cm_posts_status_check CHECK (status IN ('draft', 'scheduled', 'published_manual', 'archived')),
  CONSTRAINT cm_posts_approval_check CHECK (approval_status IN ('draft', 'pending_review', 'approved', 'rejected', 'exported')),
  CONSTRAINT cm_posts_platform_check CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'x', 'story', 'newsletter', 'other'))
);

CREATE TABLE IF NOT EXISTS cm_brand_guidelines (
  id TEXT PRIMARY KEY,
  brand_tone TEXT NOT NULL DEFAULT '',
  vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_expressions JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_expressions JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_audiences JSONB NOT NULL DEFAULT '[]'::jsonb,
  communication_principles JSONB NOT NULL DEFAULT '[]'::jsonb,
  writing_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cm_library_items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  platform TEXT,
  campaign_id TEXT REFERENCES cm_campaigns(id) ON DELETE SET NULL,
  post_id TEXT REFERENCES cm_posts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cm_library_category_check CHECK (
    category IN (
      'template',
      'approved_post',
      'rejected_post',
      'reusable_paragraph',
      'cta',
      'hashtag',
      'campaign'
    )
  ),
  CONSTRAINT cm_library_status_check CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_cm_posts_scheduled_for ON cm_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_cm_posts_approval_status ON cm_posts(approval_status);
CREATE INDEX IF NOT EXISTS idx_cm_posts_platform ON cm_posts(platform);
CREATE INDEX IF NOT EXISTS idx_cm_posts_campaign_id ON cm_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cm_campaigns_status ON cm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_cm_library_category ON cm_library_items(category);
CREATE INDEX IF NOT EXISTS idx_cm_posts_title_search ON cm_posts(title);
