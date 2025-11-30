# BroDesk - IT Help Desk Ticketing System

A comprehensive, production-ready IT help desk and ticketing system built with React, TypeScript, and Supabase. BroDesk streamlines issue reporting, ticket management, and team collaboration with intelligent automation and role-based access control.

## 🌐 Live Preview

**URL**: [https://lovable.dev/projects/442ea2ba-2fc1-4a8d-88b3-c46c5d26713f](https://lovable.dev/projects/442ea2ba-2fc1-4a8d-88b3-c46c5d26713f)

## 🔐 Test Credentials

### Super Admin Access
- **Email**: admin@brodesk.com
- **Password**: adminbrodesk
- **Capabilities**: Full system oversight, view all users, roles, and tickets (read-only)

### Student/User Access
- **Email**: student@brodesk.com
- **Password**: studentbrodesk
- **Capabilities**: Submit tickets, track own submissions, upload attachments

### Additional Roles
To test Admin and Team Member roles, create new accounts through the signup flow and assign roles via Super Admin dashboard.

## ✨ Key Features

### 🎯 Smart Ticket Management
- **AI-Powered Ticket Analysis**
  - Automatic category prediction based on issue description
  - Duplicate ticket detection to reduce redundancy
  - Sentiment analysis for priority assessment
  - Intelligent urgency detection

- **Smart Auto-Assignment**
  - Automatic ticket routing based on category
  - Load-balanced assignment (assigns to team member with least open tickets)
  - Department-based routing
  - Real-time availability tracking

- **Multi-File Attachments**
  - Upload images, PDFs, documents during ticket submission
  - Drag-and-drop file upload interface
  - 10MB per file limit
  - Secure storage with Supabase Storage
  - Real-time attachment management

- **Ticket Timeline & History**
  - Complete audit trail of all ticket changes
  - Status updates with timestamps
  - Assignment history tracking
  - Resolution tracking with resolver information

### 👥 Role-Based Access Control

#### Super Admin
- **Dashboard**: Read-only system overview
- **User Management**: View all users and their roles
- **Ticket Oversight**: Monitor all tickets across all departments
- **Analytics**: System-wide metrics and insights
- **Capabilities**: 
  - Cannot submit tickets
  - Cannot assign roles (oversight only)
  - Full visibility across organization

#### Admin
- **Dashboard**: Comprehensive management interface
- **User Management**: Assign roles and manage team members
- **Team Management**: Create and manage departments
- **Category Management**: Configure ticket categories and routing
- **Ticket Management**: View and manage all tickets
- **Analytics**: Department and system performance metrics
- **Capabilities**:
  - Assign roles: student, team_member, admin
  - Create/edit teams and departments
  - Manage ticket categories
  - Cannot submit personal tickets

#### Team Member
- **Dashboard**: Kanban board for assigned tickets
- **Ticket Management**: 
  - View only assigned tickets
  - Update ticket status via drag-and-drop
  - Add comments and updates
  - Request more information from ticket submitters
- **Status Update Dialog**: Optional communication when changing ticket status
- **Capabilities**:
  - Cannot view unassigned tickets
  - Cannot access admin functions
  - Cannot submit personal tickets

#### Student/User
- **Dashboard**: Personal ticket submission and tracking
- **Submit Tickets**: 
  - Full ticket creation with AI assistance
  - Multiple file attachments
  - Anonymous submission option
  - Priority selection
- **Track Tickets**: Monitor status of submitted tickets
- **Capabilities**:
  - Submit and track own tickets only
  - Upload attachments
  - View comments and updates
  - No access to admin features

### 🎨 Interactive Kanban Board
- **Drag-and-Drop Interface**: Intuitive ticket status management
- **Status Columns**: 
  - Open
  - In Progress
  - Awaiting Info
  - Resolved
  - Closed
- **Status Update Dialog**: Optional message when changing status
- **Real-time Updates**: Live synchronization across all users
- **Team-Specific Views**: Team members see only their assigned tickets

### 📊 Analytics & Reporting
- **System Metrics**:
  - Total tickets by status
  - Resolution rates
  - Average response time
  - Team performance metrics
- **Department Analytics**:
  - Category-wise ticket distribution
  - Team workload balancing
  - Priority distribution
- **User Activity Tracking**:
  - Resolution tracking (who resolved which ticket)
  - Activity logs for all actions

### 🔔 Real-time Notifications
- **Live Updates**: Instant notifications for ticket changes
- **Status Change Alerts**: Notified when assigned tickets are updated
- **Comment Notifications**: Real-time comment updates
- **Assignment Notifications**: Alerts when tickets are assigned

### 🔒 Security Features
- **Row-Level Security (RLS)**: Database-level access control
- **Secure Authentication**: Email-based authentication with Supabase Auth
- **Role-Based Permissions**: Granular access control by user role
- **Anonymous Submissions**: Option for anonymous ticket submission
- **Audit Trail**: Complete logging of all system changes

## 🛠️ Technology Stack

### Frontend
- **React 18.3**: Modern React with hooks and functional components
- **TypeScript**: Full type safety across the application
- **Vite**: Lightning-fast build tool and dev server
- **React Router**: Client-side routing with protected routes
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible UI components

### Backend & Infrastructure
- **Supabase**: 
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication & authorization
  - Row-level security
  - Storage for file attachments
  - Edge Functions for AI features

### Key Libraries
- **@tanstack/react-query**: Data fetching and caching
- **@dnd-kit**: Drag-and-drop functionality
- **react-hook-form**: Form management with validation
- **zod**: Schema validation
- **lucide-react**: Icon library
- **sonner**: Toast notifications
- **date-fns**: Date formatting and manipulation

## 📋 Database Schema

### Core Tables
- **tickets**: Main ticket information with auto-assignment
- **categories**: Ticket categorization with team routing
- **teams**: Department/team management
- **user_roles**: Role-based access control (separate table for security)
- **profiles**: User profile information
- **ticket_history**: Complete audit trail
- **ticket_comments**: Threaded discussions
- **ticket_attachments**: File storage metadata

### Key Features
- Foreign key constraints for data integrity
- Automatic timestamp triggers
- Smart auto-routing trigger
- Resolution tracking
- Real-time subscriptions on all tables

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for backend)

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
The project is pre-configured with Supabase credentials. For local development, ensure `.env` contains:
```
VITE_SUPABASE_URL=https://tvxhhnqkhepqaincukch.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

4. **Run Database Migrations**
All migrations are in `supabase/migrations/` and will be auto-applied.

5. **Start Development Server**
```bash
npm run dev
```

6. **Access the Application**
Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── admin/              # Admin-specific components
│   │   │   ├── Analytics.tsx
│   │   │   ├── CategoryRouting.tsx
│   │   │   ├── SuperAdminTicketView.tsx
│   │   │   ├── SuperAdminUserView.tsx
│   │   │   ├── TeamManagement.tsx
│   │   │   ├── TicketManagement.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── dashboard/          # Role-based dashboards
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── SuperAdminDashboard.tsx
│   │   │   └── TeamMemberDashboard.tsx
│   │   ├── kanban/             # Kanban board components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanCard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   └── StatusUpdateDialog.tsx
│   │   ├── layout/             # Layout components
│   │   │   └── DashboardLayout.tsx
│   │   ├── ticket/             # Ticket-related components
│   │   │   ├── TicketActions.tsx
│   │   │   ├── TicketAttachments.tsx
│   │   │   ├── TicketComments.tsx
│   │   │   └── TicketTimeline.tsx
│   │   └── ui/                 # shadcn/ui components
│   ├── pages/                  # Route pages
│   │   ├── AdminPanel.tsx
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Index.tsx
│   │   ├── NotFound.tsx
│   │   ├── SubmitTicket.tsx
│   │   └── TicketDetail.tsx
│   ├── integrations/
│   │   └── supabase/           # Supabase client & types
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utility functions
├── supabase/
│   ├── functions/              # Edge Functions (AI analysis)
│   │   ├── ai-ticket-analysis/
│   │   └── send-notification/
│   └── migrations/             # Database migrations
└── public/                     # Static assets
```

## 🔧 Configuration

### Supabase Setup
1. Database migrations are auto-applied
2. Storage bucket `ticket-attachments` is auto-created
3. Row-level security policies are pre-configured
4. Edge functions are deployed automatically

### Authentication Setup
1. Email confirmation is disabled for faster testing
2. Auto-login after signup is enabled
3. Email templates can be customized in Supabase dashboard

## 🎯 Workflow Examples

### Student Submitting a Ticket
1. Log in as student
2. Click "Submit Ticket" in navigation
3. Enter issue details
4. (Optional) Click "AI Assist" for smart suggestions
5. Upload attachments if needed
6. Submit ticket
7. Ticket is automatically assigned to appropriate team member
8. Track progress in dashboard

### Team Member Managing Tickets
1. Log in as team member
2. View assigned tickets in Kanban board
3. Drag ticket to "In Progress"
4. (Optional) Add message in status update dialog
5. Work on issue and update status
6. Mark as "Resolved" when complete
7. System tracks you as resolver

### Admin Managing System
1. Log in as admin
2. Access Admin Panel
3. Manage users and assign roles
4. Create/edit teams and departments
5. Configure ticket categories
6. View all tickets in table format
7. Monitor analytics and metrics

### Super Admin Oversight
1. Log in as super admin
2. View system-wide dashboard
3. Monitor all users and their roles
4. Oversee all tickets across departments
5. Review system analytics
6. No direct management actions (read-only)

## 🔐 Security Best Practices

- ✅ Roles stored in separate `user_roles` table (prevents privilege escalation)
- ✅ Row-level security (RLS) on all tables
- ✅ Server-side validation with security definer functions
- ✅ No hardcoded credentials in client code
- ✅ Secure file upload with type and size validation
- ✅ Anonymous submission option for sensitive issues
- ✅ Complete audit trail of all actions

## 🐛 Known Issues & Limitations

- Supabase database metadata fetch errors are expected during migration (will auto-resolve)
- Email notifications require RESEND_API_KEY secret to be configured
- AI features require LOVABLE_API_KEY secret

## 📝 Future Enhancements

- SLA (Service Level Agreement) tracking
- Email notification system
- Bulk operations for ticket management
- Advanced reporting and exports
- Mobile app version
- Chatbot integration
- Knowledge base system

## 🤝 Contributing

This project is part of a Lovable project. To contribute:

1. Use Lovable interface for changes
2. Test thoroughly before committing
3. Ensure migrations are backward compatible
4. Follow existing code structure and patterns

## 📄 License

This project is private and proprietary.

## 🙋 Support

For issues or questions:
- Check the [Lovable Documentation](https://docs.lovable.dev/)
- Visit [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
- Contact project administrator

## 🎉 Acknowledgments

- Built with [Lovable](https://lovable.dev)
- UI components by [shadcn/ui](https://ui.shadcn.com)
- Backend powered by [Supabase](https://supabase.com)
- Icons by [Lucide](https://lucide.dev)

---

**Version**: 1.0.0
**Last Updated**: 2025-11-30
**Status**: Production Ready ✅
