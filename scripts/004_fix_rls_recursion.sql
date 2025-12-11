-- إصلاح مشكلة التكرار اللانهائي في سياسات RLS
-- المشكلة: سياسة group_members_select تحقق من group_members داخل نفسها

-- حذف السياسات القديمة التي تسبب المشكلة
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_insert_admin" ON group_members;
DROP POLICY IF EXISTS "group_members_delete_admin" ON group_members;

-- سياسة جديدة: المستخدم يمكنه رؤية عضويته الخاصة فقط أو جميع الأعضاء في المجموعات التي ينتمي إليها
-- استخدام user_id مباشرة لتجنب التكرار
CREATE POLICY "group_members_select_own" ON group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- سياسة إضافية: يمكن للمستخدم رؤية أعضاء المجموعات التي ينتمي إليها
CREATE POLICY "group_members_select_same_group" ON group_members FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid()
    )
  );

-- إدراج: المنشئ الأول (لا يوجد أعضاء) أو المدير
CREATE POLICY "group_members_insert" ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    -- المستخدم يضيف نفسه كأول عضو (منشئ المجموعة)
    (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id))
    OR
    -- مدير المجموعة يضيف عضو جديد
    (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'))
  );

-- حذف: المستخدم يحذف نفسه أو المدير يحذف أي عضو
CREATE POLICY "group_members_delete" ON group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );
