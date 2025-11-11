-- Upgrade existing user to super_admin
UPDATE user_roles 
SET role = 'super_admin' 
WHERE user_id = 'df084269-427f-49e4-8c22-020fd5725191';