-- إصلاح نهائي لسياسات RLS
-- يجب تشغيل هذا السكريبت لحل مشكلة "infinite recursion"

-- حذف جميع السياسات القديمة على group_members
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_select_own" ON group_members;
DROP POLICY IF EXISTS "group_members_select_same_group" ON group_members;
DROP POLICY IF EXISTS "group_members_insert" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_admin" ON group_members;
DROP POLICY IF EXISTS "group_members_delete" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_admin" ON group_members;

-- حذف السياسات القديمة على groups
DROP POLICY IF EXISTS "groups_select" ON groups;
DROP POLICY IF EXISTS "groups_select_member" ON groups;
DROP POLICY IF EXISTS "groups_insert" ON groups;
DROP POLICY IF EXISTS "groups_insert_auth" ON groups;
DROP POLICY IF EXISTS "groups_update" ON groups;
DROP POLICY IF EXISTS "groups_update_admin" ON groups;
DROP POLICY IF EXISTS "groups_delete" ON groups;
DROP POLICY IF EXISTS "groups_delete_admin" ON groups;

-- إنشاء الدوال المساعدة بـ SECURITY DEFINER لتجاوز RLS
CREATE OR REPLACE FUNCTION check_group_membership(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = check_group_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION check_group_admin(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = check_group_id AND user_id = check_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_groups(check_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT group_id FROM public.group_members WHERE user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- سياسات group_members الجديدة (بدون أي استعلامات فرعية على نفس الجدول)
-- 1. المستخدم يمكنه رؤية عضويته الخاصة
CREATE POLICY "group_members_select_own" ON group_members 
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 2. المستخدم يمكنه رؤية أعضاء المجموعات التي ينتمي إليها
CREATE POLICY "group_members_select_same_group" ON group_members 
FOR SELECT TO authenticated
USING (group_id IN (SELECT get_user_groups(auth.uid())));

-- 3. إدراج عضو جديد: إما أدمن يضيف عضو، أو المستخدم يضيف نفسه لمجموعة جديدة
CREATE POLICY "group_members_insert" ON group_members 
FOR INSERT TO authenticated
WITH CHECK (
  -- المستخدم يضيف نفسه فقط
  user_id = auth.uid()
  AND (
    -- إما هو أدمن في المجموعة
    check_group_admin(group_id, auth.uid())
    -- أو المجموعة فارغة (أول عضو = مؤسس)
    OR NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id)
  )
);

-- 4. حذف: المستخدم يحذف نفسه أو الأدمن يحذف الآخرين
CREATE POLICY "group_members_delete" ON group_members 
FOR DELETE TO authenticated
USING (
  user_id = auth.uid() 
  OR check_group_admin(group_id, auth.uid())
);

-- سياسات groups الجديدة
CREATE POLICY "groups_select_member" ON groups 
FOR SELECT TO authenticated
USING (check_group_membership(id, auth.uid()));

CREATE POLICY "groups_insert_auth" ON groups 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_update_admin" ON groups 
FOR UPDATE TO authenticated
USING (check_group_admin(id, auth.uid()));

CREATE POLICY "groups_delete_admin" ON groups 
FOR DELETE TO authenticated
USING (check_group_admin(id, auth.uid()));
