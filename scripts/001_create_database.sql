-- إنشاء جدول الملفات الشخصية للمستخدمين
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول المجموعات
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  max_members INTEGER DEFAULT 10,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول أعضاء المجموعات
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- إنشاء جدول الرسائل مع دعم الطبقات الثلاث
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  layer TEXT DEFAULT 'standard' CHECK (layer IN ('upper', 'standard', 'shadow')),
  node_id UUID, -- ربط بالعقدة في الخريطة الذهنية
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  visible_to UUID[] DEFAULT NULL, -- للرسائل المخفية، من يمكنه رؤيتها
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول قراءات الرسائل
CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- إنشاء جدول العقد للخريطة الذهنية
CREATE TABLE IF NOT EXISTS conversation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES conversation_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول صفحات المفكرة
CREATE TABLE IF NOT EXISTS notebook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  page_type TEXT DEFAULT 'text' CHECK (page_type IN ('text', 'list', 'table', 'canvas', 'links')),
  content JSONB DEFAULT '{}',
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول مساهمات المفكرة
CREATE TABLE IF NOT EXISTS notebook_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES notebook_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول تاريخ تعديلات المفكرة
CREATE TABLE IF NOT EXISTS notebook_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES notebook_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_content JSONB,
  new_content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول الملخصات اليومية (الذاكرة الذكية)
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  decisions JSONB DEFAULT '[]',
  ideas JSONB DEFAULT '[]',
  topics JSONB DEFAULT '[]',
  links JSONB DEFAULT '[]',
  pending_items JSONB DEFAULT '[]',
  contributors JSONB DEFAULT '[]',
  raw_message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, summary_date)
);

-- إنشاء جدول الذكريات المحفزة
CREATE TABLE IF NOT EXISTS memory_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('anniversary', 'similar_topic', 'related_idea')),
  related_summary_id UUID REFERENCES daily_summaries(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  trigger_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_layer ON messages(layer);
CREATE INDEX IF NOT EXISTS idx_messages_node_id ON messages(node_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_conversation_nodes_group_id ON conversation_nodes(group_id);
CREATE INDEX IF NOT EXISTS idx_notebook_pages_group_id ON notebook_pages(group_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_group_id ON daily_summaries(group_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(summary_date DESC);
