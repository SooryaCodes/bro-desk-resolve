## BroDesk Setup & Credentials

### Default Admin Account
**IMPORTANT:** Sign up first, then I'll assign admin role.

- **Email:** `admin@brodesk.com`  
- **Password:** `Admin123!@#`

### Email Verification
Email verification is **DISABLED** by default for faster testing.

To configure email settings in Supabase:
1. Go to https://supabase.com/dashboard/project/tvxhhnqkhepqaincukch/auth/providers
2. Under "Email" provider settings
3. Toggle "Confirm email" to OFF (already configured)

### Accessing Admin Panel
After logging in with admin credentials:
1. Navigate to `/admin` route
2. Or click "Admin Panel" in the navigation menu (visible only to admins)

### User Roles
- **student** - Can submit and view their own tickets
- **team_member** - Can view team tickets, use Kanban board
- **admin** - Can manage users, teams, categories, and view analytics
- **super_admin** - Full system access

### Email Notifications
Email notifications are sent for:
- New user account creation (with credentials)
- Ticket assigned to team member
- Ticket status changes
- New comments on tickets
- Ticket resolved

Make sure your Resend domain is verified at: https://resend.com/domains

### Current Users in Database
You can query users with this SQL:
```sql
SELECT p.email, p.full_name, ur.role, t.name as team
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
LEFT JOIN teams t ON ur.team_id = t.id
ORDER BY p.created_at;
```

### Next Steps
1. Sign up with admin credentials
2. I'll assign the super_admin role to your account
3. Access admin panel at `/admin`
4. Start creating teams, categories, and users
