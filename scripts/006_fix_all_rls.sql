-- إسقاط جميع السياسات القديمة وإنشاء سياسات جديدة بدون تكرار لانهائي

-- أولاً: إنشاء دوال مساعدة SECURITY DEFINER لتجاوز RLS
CREATE OR REPLACE FUNCTION is_group_member(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_id_param AND user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_group_admin(group_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_id_param AND user_id = user_id_param AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_group_ids(user_id_param UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT group_id FROM group_members WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إسقاط السياسات القديمة للمجموعات
DROP POLICY IF EXISTS "groups_select_member" ON groups;
DROP POLICY IF EXISTS "groups_insert_auth" ON groups;
DROP POLICY IF EXISTS "groups_update_admin" ON groups;
DROP POLICY IF EXISTS "groups_delete_admin" ON groups;

-- إسقاط السياسات القديمة لأعضاء المجموعات
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_admin" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_admin" ON group_members;

-- إسقاط السياسات القديمة للرسائل
DROP POLICY IF EXISTS "messages_select_member" ON messages;
DROP POLICY IF EXISTS "messages_insert_member" ON messages;
DROP POLICY IF EXISTS "messages_update_own" ON messages;
DROP POLICY IF EXISTS "messages_delete_own" ON messages;

-- إسقاط السياسات القديمة لعقد المحادثة
DROP POLICY IF EXISTS "conversation_nodes_select" ON conversation_nodes;
DROP POLICY IF EXISTS "conversation_nodes_insert" ON conversation_nodes;
DROP POLICY IF EXISTS "conversation_nodes_update" ON conversation_nodes;
DROP POLICY IF EXISTS "conversation_nodes_delete" ON conversation_nodes;

-- إسقاط السياسات القديمة لصفحات المفكرة
DROP POLICY IF EXISTS "notebook_pages_select" ON notebook_pages;
DROP POLICY IF EXISTS "notebook_pages_insert" ON notebook_pages;
DROP POLICY IF EXISTS "notebook_pages_update" ON notebook_pages;
DROP POLICY IF EXISTS "notebook_pages_delete" ON notebook_pages;

-- إسقاط السياسات القديمة للملخصات
DROP POLICY IF EXISTS "daily_summaries_select" ON daily_summaries;
DROP POLICY IF EXISTS "daily_summaries_insert" ON daily_summaries;
DROP POLICY IF EXISTS "daily_summaries_update" ON daily_summaries;

-- إسقاط السياسات القديمة للذكريات
DROP POLICY IF EXISTS "memory_triggers_select" ON memory_triggers;
DROP POLICY IF EXISTS "memory_triggers_insert" ON memory_triggers;

-- ========================================
-- سياسات المجموعات (باستخدام الدوال المساعدة)
-- ========================================
CREATE POLICY "groups_select" ON groups FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_group_ids(auth.uid())));

CREATE POLICY "groups_insert" ON groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "groups_update" ON groups FOR UPDATE TO authenticated
  USING (is_group_admin(id, auth.uid()));

CREATE POLICY "groups_delete" ON groups FOR DELETE TO authenticated
  USING (is_group_admin(id, auth.uid()));

-- ========================================
-- سياسات أعضاء المجموعات
-- ========================================
-- يمكن للمستخدم رؤية عضويته الخاصة فقط
CREATE POLICY "group_members_select_own" ON group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- يمكن للمستخدم إضافة نفسه كأول عضو (عند إنشاء مجموعة) أو إذا كان أدمن
CREATE POLICY "group_members_insert" ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    -- المستخدم يضيف نفسه كأول عضو في مجموعة جديدة
    (user_id = auth.uid() AND NOT EXISTS (
      SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id
    ))
    OR
    -- أو المستخدم أدمن في المجموعة
    is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "group_members_delete" ON group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR is_group_admin(group_id, auth.uid())
  );

-- ========================================
-- سياسات الرسائل
-- ========================================
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (
    is_group_member(group_id, auth.uid())
    AND (
      layer != 'shadow'
      OR sender_id = auth.uid()
      OR auth.uid() = ANY(visible_to)
      OR visible_to IS NULL
    )
  );

CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    is_group_member(group_id, auth.uid())
    AND sender_id = auth.uid()
  );

CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "messages_delete" ON messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- ========================================
-- سياسات عقد المحادثة
-- ========================================
CREATE POLICY "conversation_nodes_select" ON conversation_nodes FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "conversation_nodes_insert" ON conversation_nodes FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "conversation_nodes_update" ON conversation_nodes FOR UPDATE TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "conversation_nodes_delete" ON conversation_nodes FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ========================================
-- سياسات صفحات المفكرة
-- ========================================
CREATE POLICY "notebook_pages_select" ON notebook_pages FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "notebook_pages_insert" ON notebook_pages FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "notebook_pages_update" ON notebook_pages FOR UPDATE TO authenticated
  USING (
    is_group_member(group_id, auth.uid())
    AND (NOT is_locked OR locked_by = auth.uid())
  );

CREATE POLICY "notebook_pages_delete" ON notebook_pages FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ========================================
-- سياسات الملخصات اليومية
-- ========================================
CREATE POLICY "daily_summaries_select" ON daily_summaries FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "daily_summaries_insert" ON daily_summaries FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()));

CREATE POLICY "daily_summaries_update" ON daily_summaries FOR UPDATE TO authenticated
  USING (is_group_member(group_id, auth.uid()));

-- ========================================
-- سياسات الذكريات المحفزة
-- ========================================
CREATE POLICY "memory_triggers_select" ON memory_triggers FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "memory_triggers_insert" ON memory_triggers FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()));
