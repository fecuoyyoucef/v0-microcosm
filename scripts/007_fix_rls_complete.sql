-- إصلاح كامل لسياسات RLS لتجنب التكرار اللانهائي
-- يجب تشغيل هذا السكريبت لإصلاح مشكلة إنشاء المجموعات

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_admin" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_admin" ON group_members;
DROP POLICY IF EXISTS "groups_select_member" ON groups;
DROP POLICY IF EXISTS "groups_insert_auth" ON groups;
DROP POLICY IF EXISTS "groups_update_admin" ON groups;
DROP POLICY IF EXISTS "groups_delete_admin" ON groups;
DROP POLICY IF EXISTS "messages_select_member" ON messages;
DROP POLICY IF EXISTS "messages_insert_member" ON messages;

-- إنشاء دالة للتحقق من العضوية بدون RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_group_member(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = check_group_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من صلاحية الأدمن
CREATE OR REPLACE FUNCTION is_group_admin(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = check_group_id AND user_id = check_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على معرفات المجموعات للمستخدم
CREATE OR REPLACE FUNCTION get_user_group_ids(check_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  result UUID[];
BEGIN
  SELECT ARRAY_AGG(group_id) INTO result
  FROM group_members 
  WHERE user_id = check_user_id;
  RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- سياسات المجموعات الجديدة
CREATE POLICY "groups_select_member" ON groups FOR SELECT TO authenticated
  USING (is_group_member(id, auth.uid()));

CREATE POLICY "groups_insert_auth" ON groups FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_update_admin" ON groups FOR UPDATE TO authenticated
  USING (is_group_admin(id, auth.uid()));

CREATE POLICY "groups_delete_admin" ON groups FOR DELETE TO authenticated
  USING (is_group_admin(id, auth.uid()));

-- سياسات أعضاء المجموعات الجديدة (بدون تكرار)
-- يمكن للمستخدم رؤية عضويته الخاصة أو عضويات مجموعاته
CREATE POLICY "group_members_select_own" ON group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR group_id = ANY(get_user_group_ids(auth.uid())));

-- يمكن للأدمن إضافة أعضاء، أو يمكن لأي شخص الانضمام كأول عضو (مؤسس)
CREATE POLICY "group_members_insert" ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    is_group_admin(group_id, auth.uid())
    OR (
      user_id = auth.uid() 
      AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id)
    )
  );

-- يمكن للمستخدم حذف نفسه أو يمكن للأدمن حذف الآخرين
CREATE POLICY "group_members_delete" ON group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_group_admin(group_id, auth.uid()));

-- سياسات الرسائل الجديدة
CREATE POLICY "messages_select_member" ON messages FOR SELECT TO authenticated
  USING (
    is_group_member(group_id, auth.uid())
    AND (
      layer != 'shadow'
      OR sender_id = auth.uid()
      OR auth.uid() = ANY(visible_to)
      OR visible_to IS NULL
    )
  );

CREATE POLICY "messages_insert_member" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    is_group_member(group_id, auth.uid())
    AND auth.uid() = sender_id
  );

-- تحديث سياسات باقي الجداول لاستخدام الدوال الجديدة
DROP POLICY IF EXISTS "conversation_nodes_select" ON conversation_nodes;
DROP POLICY IF EXISTS "conversation_nodes_insert" ON conversation_nodes;
DROP POLICY IF EXISTS "conversation_nodes_update" ON conversation_nodes;

CREATE POLICY "conversation_nodes_select" ON conversation_nodes FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "conversation_nodes_insert" ON conversation_nodes FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "conversation_nodes_update" ON conversation_nodes FOR UPDATE TO authenticated
  USING (is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "notebook_pages_select" ON notebook_pages;
DROP POLICY IF EXISTS "notebook_pages_insert" ON notebook_pages;
DROP POLICY IF EXISTS "notebook_pages_update" ON notebook_pages;

CREATE POLICY "notebook_pages_select" ON notebook_pages FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "notebook_pages_insert" ON notebook_pages FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "notebook_pages_update" ON notebook_pages FOR UPDATE TO authenticated
  USING (is_group_member(group_id, auth.uid()) AND (NOT is_locked OR locked_by = auth.uid()));

DROP POLICY IF EXISTS "daily_summaries_select" ON daily_summaries;
DROP POLICY IF EXISTS "daily_summaries_insert" ON daily_summaries;
DROP POLICY IF EXISTS "daily_summaries_update" ON daily_summaries;

CREATE POLICY "daily_summaries_select" ON daily_summaries FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "daily_summaries_insert" ON daily_summaries FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()));

CREATE POLICY "daily_summaries_update" ON daily_summaries FOR UPDATE TO authenticated
  USING (is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "memory_triggers_select" ON memory_triggers;
DROP POLICY IF EXISTS "memory_triggers_insert" ON memory_triggers;

CREATE POLICY "memory_triggers_select" ON memory_triggers FOR SELECT TO authenticated
  USING (is_group_member(group_id, auth.uid()));

CREATE POLICY "memory_triggers_insert" ON memory_triggers FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id, auth.uid()));
