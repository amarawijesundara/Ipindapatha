# Multi-Tenant Monastery Booking System - User Guide

## Table of Contents
- [Getting Started](#getting-started)
- [User Types & Access](#user-types--access)
- [Monastery User Guide](#monastery-user-guide)
- [Tenant Admin Guide](#tenant-admin-guide)
- [Super Admin Guide](#super-admin-guide)
- [Booking System](#booking-system)
- [Account Management](#account-management)
- [Troubleshooting](#troubleshooting)

## Getting Started

### System Overview
The Monastery Booking System is a multi-tenant platform where each monastery operates independently with their own subdomain, users, and booking system. The platform supports different user roles with varying levels of access and permissions.

### Accessing the System

#### For Monastery Users
1. **Visit your monastery's subdomain**: `your-monastery.example.com`
2. **Register or Login** with your monastery-specific account
3. **Access Features**: View and create bookings within your monastery

#### For Super Admins
1. **Visit the main admin panel**: `example.com/admin`
2. **Login** with your super admin credentials
3. **Manage Platform**: Access all monasteries and platform settings

## User Types & Access

### Role Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                 Super Admin                         │
│  📋 Manage all monasteries                          │
│  👥 Cross-tenant user management                    │
│  ⚙️  Platform settings                              │
│  📊 Global analytics                                │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                Tenant Admin                         │
│  🏛️  Full monastery management                      │
│  👥 User management (monastery only)                │
│  📅 Booking management                              │
│  ⚙️  Monastery settings                             │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               Tenant Manager                        │
│  📅 Booking approval/management                     │
│  👥 Limited user management                         │
│  📊 Monastery reports                               │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                    User                             │
│  📅 Create and view own bookings                    │
│  👤 Manage personal profile                         │
│  🔍 View monastery information                      │
└─────────────────────────────────────────────────────┘
```

### Default Credentials
- **Super Admin**: `admin@example.com` / `SuperAdmin123!`
- **Sample Monastery**: Visit test-monastery.localhost:3000 (development)

## Monastery User Guide

### Registration Process

1. **Visit Your Monastery's Website**
   - Navigate to `your-monastery.example.com/register`
   - You'll automatically be registered within your monastery's system

2. **Fill Registration Form**
   ```
   Username: [Choose unique username]
   Email: [Your email address]
   Password: [Minimum 6 characters]
   Phone: [Optional contact number]
   Address: [Optional address]
   ```

3. **Account Verification**
   - Your account will be automatically linked to your monastery
   - Login immediately after registration

### Daily Operations

#### Dashboard Access
1. **Login** at `your-monastery.example.com/login`
2. **Dashboard Overview**:
   - Recent bookings
   - Upcoming events
   - Monastery announcements
   - Quick booking access

#### Creating a Booking

1. **Access Booking System**
   - Click "New Booking" from dashboard
   - Or navigate to booking section

2. **Select Date & Time**
   ```
   📅 Date: [Choose available date]
   🕒 Time: [Select from available slots]
   📝 Event Details: [Optional description]
   ```

3. **Submit Booking**
   - Review booking details
   - Submit for approval (if required)
   - Receive confirmation

#### Managing Your Bookings

1. **View Bookings**
   - Access "My Bookings" section
   - Filter by status: Pending, Confirmed, Cancelled
   - Sort by date or status

2. **Booking Actions**
   - **View Details**: Click on any booking
   - **Cancel**: Available up to cancellation deadline
   - **Modify**: Contact monastery admin for changes

#### Profile Management

1. **Access Profile**
   - Click profile icon → "Profile Settings"
   - Update personal information

2. **Editable Fields**
   ```
   Personal Information:
   - Username (unique within monastery)
   - Email address
   - Phone number
   - Address
   
   Security:
   - Change password
   - View login history
   ```

### Booking Status Understanding

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| **Pending** | Awaiting monastery approval | Cancel |
| **Confirmed** | Approved by monastery | Cancel (within deadline) |
| **Cancelled** | Booking cancelled | None |

## Tenant Admin Guide

### Accessing Admin Panel

1. **Login** to your monastery: `your-monastery.example.com/login`
2. **Access Admin**: Navigate to admin section (tenant admins see admin menu)
3. **Admin Dashboard**: Overview of monastery operations

### User Management

#### Viewing Users
1. **Users List**
   - Access "User Management" section
   - View all monastery users
   - Search and filter users
   - See user statistics and activity

2. **User Information**
   - Username and email
   - Registration date
   - Booking history
   - Account status

#### Managing Users
1. **User Actions**
   - **View Details**: Complete user profile and history
   - **Edit User**: Modify user information
   - **Change Role**: Promote to manager or admin
   - **Enable/Disable**: Activate or deactivate accounts

2. **Adding New Users**
   - Manual user creation (optional)
   - Users typically self-register
   - Assign appropriate roles

### Booking Management

#### Booking Overview
1. **All Bookings View**
   - Complete monastery booking list
   - Filter by status, date, user
   - Export booking reports

2. **Booking Details**
   - User information
   - Event details
   - Booking history
   - Status changes

#### Booking Actions
1. **Approval Process**
   - Review pending bookings
   - Approve or reject with reasons
   - Send notifications to users

2. **Booking Modifications**
   - Change booking status
   - Modify date/time (if needed)
   - Add internal notes

### Availability Management

#### Setting Availability
1. **Calendar Management**
   - Define available time slots
   - Set recurring availability
   - Block unavailable dates

2. **Capacity Management**
   - Set maximum bookings per slot
   - Configure overbooking rules
   - Manage waiting lists

### Monastery Settings

#### General Settings
1. **Monastery Information**
   ```
   Basic Details:
   - Monastery name
   - Description
   - Contact information
   - Address details
   ```

2. **Booking Rules**
   ```
   Booking Configuration:
   - Advance booking period (days)
   - Minimum notice required (hours)
   - Maximum bookings per user
   - Cancellation deadline
   - Auto-approval settings
   ```

#### Business Hours
1. **Operating Hours**
   ```
   Weekly Schedule:
   Monday:    09:00 - 17:00 ✓
   Tuesday:   09:00 - 17:00 ✓
   Wednesday: 09:00 - 17:00 ✓
   Thursday:  09:00 - 17:00 ✓
   Friday:    09:00 - 17:00 ✓
   Saturday:  09:00 - 17:00 ✗
   Sunday:    09:00 - 17:00 ✗
   ```

2. **Time Slots**
   - Define available time slots
   - Set duration for each booking
   - Configure break times

### Reports and Analytics

#### Monastery Statistics
1. **Dashboard Metrics**
   - Total users
   - Total bookings
   - Recent activity
   - Popular time slots

2. **Detailed Reports**
   - User activity reports
   - Booking trend analysis
   - Revenue reports (if applicable)
   - Cancellation analysis

## Super Admin Guide

### Platform Administration

#### Accessing Super Admin Panel
1. **Login**: Visit `example.com/admin`
2. **Credentials**: Use super admin account
3. **Dashboard**: Platform-wide overview

#### Platform Dashboard
```
📊 Platform Statistics:
├── Total Monasteries: 15
├── Active Users: 1,247
├── Total Bookings: 3,892
├── System Health: ✓ Healthy
└── Recent Activity: [Activity feed]
```

### Tenant Management

#### Creating New Monasteries
1. **Add Monastery**
   - Click "Add Tenant" button
   - Fill monastery details:
   ```
   Monastery Information:
   - Name: "St. Joseph's Monastery"
   - Subdomain: "st-josephs" (becomes st-josephs.example.com)
   - Custom Domain: [optional]
   - Description: "Brief description"
   
   Subscription Settings:
   - Plan: Basic/Professional/Enterprise
   - Max Users: [number]
   - Max Bookings: [number]
   ```

2. **Monastery Setup**
   - Automatic database setup
   - Default settings creation
   - Admin account creation
   - Notification to monastery

#### Managing Existing Monasteries
1. **Monastery List**
   - View all monasteries
   - See statistics for each
   - Filter by status, plan, activity

2. **Monastery Actions**
   - **View Details**: Complete monastery information
   - **Edit Monastery**: Update basic information
   - **Manage Subscription**: Change plans and limits
   - **Enable/Disable**: Activate or deactivate monastery
   - **Access**: Login as monastery admin for support

### Cross-Tenant User Management

#### User Overview
1. **All Users View**
   - Users from all monasteries
   - Filter by monastery, role, status
   - Search across all users

2. **User Information**
   - Personal details
   - Monastery affiliation
   - Role and permissions
   - Activity history

#### User Management Actions
1. **User Operations**
   - **View Profile**: Complete user information
   - **Change Role**: Modify user permissions
   - **Change Monastery**: Move user between monasteries
   - **Enable/Disable**: Account status management

2. **Bulk Operations**
   - Mass email communications
   - Role changes for multiple users
   - Account status updates

### Platform-Wide Booking Management

#### Booking Overview
1. **All Bookings**
   - Cross-monastery booking view
   - Advanced filtering options
   - Export comprehensive reports

2. **Booking Analytics**
   - Platform-wide booking trends
   - Monastery performance comparison
   - Peak time analysis

#### Booking Operations
1. **Booking Management**
   - View any booking details
   - Modify booking status
   - Handle escalated issues
   - Generate reports

### Platform Settings

#### Global Configuration
1. **System Settings**
   ```
   Platform Configuration:
   - Platform Name: "Monastery Booking Platform"
   - Maintenance Mode: OFF
   - User Registration: ENABLED
   - Email Verification: OPTIONAL
   - Session Timeout: 24 hours
   ```

2. **Limits and Quotas**
   ```
   Platform Limits:
   - Max Monasteries per Day: 5
   - Max Users per Monastery: 100 (default)
   - Max Bookings per User: 10 (default)
   - File Upload Size: 10MB
   ```

3. **Feature Toggles**
   ```
   Platform Features:
   - Audit Logging: ✓ ENABLED
   - Email Notifications: ✓ ENABLED
   - SMS Notifications: ✗ DISABLED
   - API Access: ✓ ENABLED
   - Advanced Reporting: ✓ ENABLED
   ```

#### Security Settings
1. **Authentication**
   - Password requirements
   - Session management
   - Two-factor authentication (if enabled)

2. **Access Control**
   - IP restrictions (if configured)
   - Login attempt limits
   - Account lockout policies

### System Monitoring

#### Health Checks
1. **System Status**
   ```
   System Health:
   ├── Database: ✓ Connected
   ├── API Services: ✓ Healthy
   ├── Email Service: ✓ Working
   ├── File Storage: ✓ Available
   └── Background Jobs: ✓ Running
   ```

2. **Performance Metrics**
   - Response times
   - Database performance
   - Memory usage
   - Active connections

#### Audit Logs
1. **Admin Activity**
   - All super admin actions
   - Monastery admin activities
   - System changes
   - Security events

2. **Log Analysis**
   - Filter by user, action, date
   - Export audit reports
   - Security monitoring

## Booking System

### Understanding the Booking Process

#### For Users
1. **Browse Availability**
   - Calendar view of available dates
   - Time slot selection
   - Real-time availability

2. **Create Booking**
   - Select date and time
   - Add event details
   - Submit request

3. **Booking Lifecycle**
   ```
   User Creates Booking
           ↓
   Status: PENDING
           ↓
   Admin Reviews → APPROVED/REJECTED
           ↓
   Status: CONFIRMED
           ↓
   Event Date → Status: COMPLETED
   ```

#### For Admins
1. **Review Process**
   - Receive notification of new bookings
   - Review booking details
   - Approve or reject with reason

2. **Management Tools**
   - Bulk approval options
   - Calendar overview
   - Conflict resolution

### Availability Management

#### Setting Up Availability
1. **Time Slots**
   ```
   Example Schedule:
   Morning:   09:00, 10:00, 11:00
   Afternoon: 14:00, 15:00, 16:00, 17:00
   Duration:  1 hour per slot
   Capacity:  1 booking per slot (default)
   ```

2. **Recurring Schedules**
   - Set weekly patterns
   - Define holiday exceptions
   - Seasonal adjustments

#### Capacity Management
1. **Slot Capacity**
   - Single booking per slot (default)
   - Multiple bookings (if event allows)
   - Overbooking protection

2. **Waiting Lists**
   - Enable for popular slots
   - Automatic notification system
   - Priority management

### Notification System

#### Email Notifications
1. **User Notifications**
   - Booking confirmation
   - Status changes
   - Reminders
   - Cancellation notices

2. **Admin Notifications**
   - New booking alerts
   - Daily summaries
   - System alerts

#### Customization
1. **Message Templates**
   - Customize email content
   - Add monastery branding
   - Multiple language support (if configured)

## Account Management

### Profile Settings

#### Personal Information
1. **Basic Details**
   ```
   Profile Information:
   - Username: [Unique within monastery]
   - Email: [Contact email]
   - Full Name: [Display name]
   - Phone: [Contact number]
   - Address: [Optional location]
   ```

2. **Preferences**
   - Notification settings
   - Language preferences (if available)
   - Time zone settings

#### Security Settings
1. **Password Management**
   - Change password
   - Password strength requirements
   - Password history (prevents reuse)

2. **Login History**
   - Recent login attempts
   - Device information
   - Location tracking

### Privacy and Data

#### Data Access
1. **Personal Data**
   - View all stored information
   - Export personal data
   - Data usage summary

2. **Booking History**
   - Complete booking records
   - Export booking data
   - Archive old bookings

#### Privacy Controls
1. **Visibility Settings**
   - Profile visibility
   - Contact information sharing
   - Activity status display

## Troubleshooting

### Common Issues and Solutions

#### Login Problems

**Problem**: Cannot login to monastery site
```
Solution Steps:
1. Verify you're on the correct subdomain
2. Check username/email spelling
3. Try password reset
4. Clear browser cache and cookies
5. Contact monastery admin if issues persist
```

**Problem**: "Invalid tenant" error
```
Solution Steps:
1. Verify subdomain is correct
2. Check if monastery is active
3. Try accessing via direct URL
4. Contact support for monastery status
```

#### Booking Issues

**Problem**: No available time slots showing
```
Solution Steps:
1. Check if you're viewing correct date range
2. Verify monastery has set availability
3. Try different dates
4. Contact monastery admin about availability
```

**Problem**: Booking request stuck in "Pending"
```
Solution Steps:
1. Check monastery's approval process
2. Contact monastery admin
3. Verify booking complies with monastery rules
4. Wait for admin review (check notification settings)
```

#### Profile and Settings

**Problem**: Cannot update profile information
```
Solution Steps:
1. Check required fields are filled
2. Verify email format is correct
3. Ensure username is unique within monastery
4. Try refreshing the page
5. Contact administrator for help
```

**Problem**: Not receiving email notifications
```
Solution Steps:
1. Check spam/junk folder
2. Verify email address is correct
3. Check notification settings in profile
4. Test with password reset email
5. Contact admin about email configuration
```

### Getting Help

#### Support Channels

1. **Monastery Users**
   - Contact your monastery admin first
   - Use contact form on monastery website
   - Check monastery announcements

2. **Monastery Admins**
   - Contact platform support
   - Check documentation and guides
   - Use admin help resources

3. **Super Admins**
   - Technical documentation
   - System logs and monitoring
   - Platform vendor support

#### Emergency Procedures

1. **System Outages**
   - Check system status page
   - Contact emergency support
   - Communicate with affected monasteries

2. **Data Issues**
   - Contact technical support immediately
   - Document the issue thoroughly
   - Preserve system logs

3. **Security Incidents**
   - Change affected passwords immediately
   - Contact security team
   - Review audit logs
   - Implement additional security measures

### Best Practices

#### For Users
- Keep profile information updated
- Use strong passwords
- Log out from shared computers
- Report suspicious activity
- Follow monastery booking guidelines

#### For Admins
- Regular data backups
- Monitor user activity
- Keep software updated
- Review security logs
- Train users on proper system use

#### For Super Admins
- Regular system monitoring
- Proactive maintenance
- Security best practices
- Documentation maintenance
- User training programs

---

This user guide provides comprehensive instructions for all user types in the multi-tenant monastery booking system. For technical information, refer to the [Architecture Documentation](./ARCHITECTURE.md) and [Developer Guide](./DEVELOPER.md).