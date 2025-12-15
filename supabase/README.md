# Membership Management Platform - Supabase Setup Guide

## 📋 Prerequisites

- Access to Supabase Dashboard: https://supabase.com/dashboard
- Project URL: `https://wqhsaarqvvbyhsegpybr.supabase.co`

## 🗄️ Database Schema Setup

### Step 1: Create the Schema

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/schema.sql`
4. Paste and execute the SQL script

This will create:
- ✅ A dedicated `mmp` schema for this project
- ✅ Members table with all required fields
- ✅ Enum types for roles, statuses, departments
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Storage bucket for profile pictures
- ✅ Helper functions

### Step 2: Verify Schema Creation

Run this query to verify:
```sql
SELECT * FROM mmp.members LIMIT 10;
```

## 🔐 Authentication Setup

### Configure Authentication Providers

#### Email/Password Authentication (Default)
Already enabled by default in Supabase.

#### Google OAuth (Optional)
1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Client ID: Your Google OAuth Client ID
   - Client Secret: Your Google OAuth Client Secret
4. Add authorized redirect URL: `https://wqhsaarqvvbyhsegpybr.supabase.co/auth/v1/callback`

#### Magic Link (Optional)
1. Go to **Authentication** → **Providers**
2. Configure **Email** provider
3. Enable "Email Magic Link"
4. Customize email templates if needed

### Configure Site URL
1. Go to **Authentication** → **URL Configuration**
2. Set Site URL: `http://localhost:3000` (development)
3. Add Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - Your production URL when deploying

## 🖼️ Storage Setup

### Profile Pictures Bucket

The schema creates a bucket called `mmp-member-photos`. Verify it:

1. Go to **Storage** in Supabase Dashboard
2. Check if `mmp-member-photos` bucket exists
3. If not, create it manually:
   - Name: `mmp-member-photos`
   - Public: ✅ Yes

### Storage Policies

The schema includes these policies:
- ✅ Public read access to photos
- ✅ Authenticated users can upload
- ✅ Users can update/delete their own photos

## 🔑 Environment Variables

Your `.env.local` is already configured with:
```env
NEXT_PUBLIC_SUPABASE_URL=https://wqhsaarqvvbyhsegpybr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🧪 Testing the Setup

### Test Authentication

```typescript
import { auth } from '@/lib/auth'

// Sign up a new user
const { user, error } = await auth.signUp('test@example.com', 'password123')

// Sign in
const { user, session } = await auth.signInWithPassword('test@example.com', 'password123')
```

### Test Member Creation

```typescript
import { memberService } from '@/lib/members'

// Create a member
const { data, error } = await memberService.createMember({
  first_name: 'John',
  last_name: 'Doe',
  role: 'Core Member',
  status: 'Active',
  department: 'IT&Dev',
  tbc_email: 'john.doe@tum-blockchain.com',
  university: 'TUM',
  semester_joined: 'WS2024',
})
```

## 📊 Database Schema Overview

### Member Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Link to auth.users |
| `first_name` | String | First name |
| `last_name` | String | Last name |
| `role` | Enum | Core Member, Ex-Core Member, Board Member |
| `status` | Enum | Active, Alumni, Advisor, Passive, Kicked out, Left |
| `department` | Enum | Industry, Web3 Talents, Legal & Finance, etc. |
| `current_project_task` | Text | Current work |
| `area_of_expertise` | Array | Skills |
| `picture_url` | String | Profile photo URL |
| `university` | String | University name |
| `degree` | String | Degree program |
| `semester_joined` | String | Join semester |
| `active_semesters` | Integer | Number of active semesters |
| `phone` | String | Phone number |
| `private_email` | String | Personal email |
| `tbc_email` | String | TBC email (@tum-blockchain.com) |
| `linkedin_url` | String | LinkedIn profile |
| `telegram_username` | String | Telegram handle |
| `discord_username` | String | Discord handle |
| `instagram_username` | String | Instagram handle |
| `twitter_username` | String | Twitter/X handle |
| `merch_size` | Enum | XS, S, M, L, XL, XXL |

## 🔒 Security Notes

1. **Row Level Security (RLS)** is enabled on all tables
2. **All members can view** other members
3. **Members can only edit** their own profile
4. **Only Board Members** can add/delete members
5. **Storage policies** protect user photos

## 🚀 Next Steps

1. ✅ Execute `schema.sql` in Supabase SQL Editor
2. ✅ Configure authentication providers
3. ✅ Verify storage bucket
4. ✅ Test authentication flow
5. ✅ Create your first member entry

## 📝 API Usage Examples

See the implementation in:
- `/lib/auth.ts` - Authentication helpers
- `/lib/members.ts` - Member CRUD operations
- `/lib/supabase.ts` - Supabase client configuration
- `/lib/types/database.types.ts` - TypeScript types

## 🆘 Troubleshooting

### Common Issues

**Issue**: "permission denied for schema mmp"
- **Solution**: Make sure you executed the schema.sql as the project owner

**Issue**: "relation 'mmp.members' does not exist"
- **Solution**: Execute the schema.sql script in SQL Editor

**Issue**: Authentication not working
- **Solution**: Check Site URL and Redirect URLs in Authentication settings

**Issue**: Can't upload images
- **Solution**: Verify storage bucket exists and policies are active

## 📞 Support

For issues related to:
- Supabase: Check [Supabase Documentation](https://supabase.com/docs)
- Schema: Review `supabase/schema.sql`
- Auth: Check `lib/auth.ts`
- Members: Check `lib/members.ts`
