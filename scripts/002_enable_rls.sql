-- تفعيل RLS على جميع الجداول
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_triggers ENABLE ROW LEVEL SECURITY;

-- سياسات الملفات الشخصية
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- سياسات المجموعات
CREATE POLICY "groups_select_member" ON groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid()));
CREATE POLICY "groups_insert_auth" ON groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_update_admin" ON groups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role = 'admin'));
CREATE POLICY "groups_delete_admin" ON groups FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role = 'admin'));

-- سياسات أعضاء المجموعات
CREATE POLICY "group_members_select" ON group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()));
CREATE POLICY "group_members_insert_admin" ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    OR NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id)
  );
CREATE POLICY "group_members_delete_admin" ON group_members FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

-- سياسات الرسائل
CREATE POLICY "messages_select_member" ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = messages.group_id AND group_members.user_id = auth.uid())
    AND (
      messages.layer != 'shadow'
      OR messages.sender_id = auth.uid()
      OR auth.uid() = ANY(messages.visible_to)
      OR messages.visible_to IS NULL
    )
  );
CREATE POLICY "messages_insert_member" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = messages.group_id AND group_members.user_id = auth.uid())
    AND auth.uid() = sender_id
  );
CREATE POLICY "messages_update_own" ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id);
CREATE POLICY "messages_delete_own" ON messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- سياسات قراءات الرسائل
CREATE POLICY "message_reads_select" ON message_reads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "message_reads_insert" ON message_reads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسات عقد المحادثة
CREATE POLICY "conversation_nodes_select" ON conversation_nodes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = conversation_nodes.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "conversation_nodes_insert" ON conversation_nodes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = conversation_nodes.group_id AND group_members.user_id = auth.uid())
    AND auth.uid() = created_by
  );
CREATE POLICY "conversation_nodes_update" ON conversation_nodes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = conversation_nodes.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "conversation_nodes_delete" ON conversation_nodes FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- سياسات صفحات المفكرة
CREATE POLICY "notebook_pages_select" ON notebook_pages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = notebook_pages.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "notebook_pages_insert" ON notebook_pages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = notebook_pages.group_id AND group_members.user_id = auth.uid())
    AND auth.uid() = created_by
  );
CREATE POLICY "notebook_pages_update" ON notebook_pages FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = notebook_pages.group_id AND group_members.user_id = auth.uid())
    AND (NOT is_locked OR locked_by = auth.uid())
  );
CREATE POLICY "notebook_pages_delete" ON notebook_pages FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- سياسات مساهمات المفكرة
CREATE POLICY "notebook_contributions_select" ON notebook_contributions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM notebook_pages np
    JOIN group_members gm ON gm.group_id = np.group_id
    WHERE np.id = notebook_contributions.page_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "notebook_contributions_insert" ON notebook_contributions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notebook_contributions_update" ON notebook_contributions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "notebook_contributions_delete" ON notebook_contributions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- سياسات تاريخ المفكرة
CREATE POLICY "notebook_history_select" ON notebook_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM notebook_pages np
    JOIN group_members gm ON gm.group_id = np.group_id
    WHERE np.id = notebook_history.page_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "notebook_history_insert" ON notebook_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- سياسات الملخصات اليومية
CREATE POLICY "daily_summaries_select" ON daily_summaries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = daily_summaries.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "daily_summaries_insert" ON daily_summaries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = daily_summaries.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "daily_summaries_update" ON daily_summaries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = daily_summaries.group_id AND group_members.user_id = auth.uid()));

-- سياسات الذكريات المحفزة
CREATE POLICY "memory_triggers_select" ON memory_triggers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = memory_triggers.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "memory_triggers_insert" ON memory_triggers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = memory_triggers.group_id AND group_members.user_id = auth.uid()));
