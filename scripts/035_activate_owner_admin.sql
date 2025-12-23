-- تفعيل حساب المالك كـ admin
UPDATE admins 
SET is_active = true, role = 'super_admin'
WHERE id = auth.uid()
RETURNING id, email, role, is_active;

-- إذا لم يكن موجود، أضفه
INSERT INTO admins (id, email, role, is_active, created_at)
SELECT id, email, 'super_admin', true, NOW()
FROM auth.users
WHERE id = auth.uid()
AND id NOT IN (SELECT id FROM admins)
RETURNING id, email, role, is_active;
