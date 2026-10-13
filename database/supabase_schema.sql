-- ==========================================================
-- TYPnex PostgreSQL / Supabase Production Database Schema
-- Includes RLS (Row Level Security), Foreign Keys & Indexes
-- ==========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER', -- 'USER', 'EMPLOYEE', 'ADMIN'
    "isVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMPTZ,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"("email");
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User"("role");
CREATE INDEX IF NOT EXISTS "idx_user_deleted" ON "User"("deletedAt");

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "themePreference" TEXT NOT NULL DEFAULT 'light',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BLOCKED USERS
CREATE TABLE IF NOT EXISTS "BlockedUser" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "blockedById" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "reason" TEXT,
    "blockedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_blocked_user" ON "BlockedUser"("userId");

-- 4. EMPLOYEES & PERMISSIONS
CREATE TABLE IF NOT EXISTS "Employee" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "department" TEXT NOT NULL DEFAULT 'Support',
    "canVerifyUsers" BOOLEAN NOT NULL DEFAULT FALSE,
    "canBlockUsers" BOOLEAN NOT NULL DEFAULT FALSE,
    "canDeleteMessages" BOOLEAN NOT NULL DEFAULT FALSE,
    "canViewAnalytics" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_employee_deleted" ON "Employee"("deletedAt");

-- 5. EMPLOYEE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS "EmployeeAssignment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employeeId" UUID NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
    "customerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "unique_employee_customer" UNIQUE ("employeeId", "customerId")
);

CREATE INDEX IF NOT EXISTS "idx_assignment_emp" ON "EmployeeAssignment"("employeeId");
CREATE INDEX IF NOT EXISTS "idx_assignment_cust" ON "EmployeeAssignment"("customerId");

-- 6. CONVERSATIONS
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL DEFAULT 'Support Chat',
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_conversation_user" ON "Conversation"("userId");
CREATE INDEX IF NOT EXISTS "idx_conversation_activity" ON "Conversation"("lastActivityAt");
CREATE INDEX IF NOT EXISTS "idx_conversation_deleted" ON "Conversation"("deletedAt");

-- 7. MESSAGES
CREATE TABLE IF NOT EXISTS "Message" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "conversationId" UUID NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
    "senderId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "senderRole" TEXT NOT NULL DEFAULT 'USER',
    "content" TEXT NOT NULL,
    "translatedContent" TEXT,
    "originalLanguage" TEXT DEFAULT 'en',
    "deliveryState" TEXT NOT NULL DEFAULT 'SENT', -- 'SENT', 'DELIVERED', 'READ'
    "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_message_conv" ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS "idx_message_sender" ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "idx_message_created" ON "Message"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_message_deleted" ON "Message"("deletedAt");

-- 8. ATTACHMENTS
CREATE TABLE IF NOT EXISTS "Attachment" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "messageId" UUID NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT UNIQUE NOT NULL,
    "fileKey" TEXT UNIQUE NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "isAudio" BOOLEAN NOT NULL DEFAULT FALSE,
    "protectedFromOwner" BOOLEAN NOT NULL DEFAULT FALSE,
    "checksum" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_attachment_msg" ON "Attachment"("messageId");
CREATE INDEX IF NOT EXISTS "idx_attachment_user" ON "Attachment"("userId");
CREATE INDEX IF NOT EXISTS "idx_attachment_deleted" ON "Attachment"("deletedAt");

-- 9. AUDIO MESSAGES
CREATE TABLE IF NOT EXISTS "AudioMessage" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "messageId" UUID UNIQUE NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "waveform" TEXT,
    "audioUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. DAILY USAGE (IST Cycle Quotas)
CREATE TABLE IF NOT EXISTS "DailyUsage" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "dateKey" TEXT NOT NULL, -- 'YYYY-MM-DD' in Asia/Kolkata
    "chatCount" INTEGER NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "lastActionAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "unique_user_datekey" UNIQUE ("userId", "dateKey")
);

CREATE INDEX IF NOT EXISTS "idx_daily_usage_user_date" ON "DailyUsage"("userId", "dateKey");

-- 11. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS "SystemSettings" (
    "id" TEXT PRIMARY KEY DEFAULT 'global',
    "dailyChatLimit" INTEGER NOT NULL DEFAULT 100,
    "dailyFileLimit" INTEGER NOT NULL DEFAULT 20,
    "maxFileSizeMB" INTEGER NOT NULL DEFAULT 20,
    "allowedExtensions" TEXT NOT NULL DEFAULT 'png,jpg,jpeg,gif,webp,svg,pdf,doc,docx,txt,csv,xlsx,ppt,pptx,zip,rar,mp3,wav,ogg,m4a',
    "disallowedExtensions" TEXT NOT NULL DEFAULT 'mp4,mov,avi,mkv,webm,3gp,flv,wmv,exe,bat,cmd,ps1,sh,dll,scr,apk,msi,jar,vbs',
    "adGateEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "adGateDurationSec" INTEGER NOT NULL DEFAULT 5,
    "interstitialIntervalHours" INTEGER NOT NULL DEFAULT 12,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT FALSE,
    "announcementText" TEXT,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUDIT LOGS
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "actorId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_audit_actor" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_created" ON "AuditLog"("createdAt");

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_notif_user" ON "Notification"("userId");

-- 14. TRANSLATION CACHE
CREATE TABLE IF NOT EXISTS "TranslationCache" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sourceHash" TEXT UNIQUE NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- User Policies: Users can only see their own profile; Admins/Employees can view customers
CREATE POLICY "user_view_own" ON "User"
    FOR SELECT USING (auth.uid() = "id" OR EXISTS (
        SELECT 1 FROM "User" u WHERE u."id" = auth.uid() AND u."role" IN ('ADMIN', 'EMPLOYEE')
    ));

CREATE POLICY "profile_user_access" ON "Profile"
    FOR ALL USING (auth.uid() = "userId" OR EXISTS (
        SELECT 1 FROM "User" u WHERE u."id" = auth.uid() AND u."role" IN ('ADMIN', 'EMPLOYEE')
    ));

-- Conversation Policies: Users can only view/insert in their own conversations
CREATE POLICY "conversation_user_access" ON "Conversation"
    FOR ALL USING ("userId" = auth.uid() OR EXISTS (
        SELECT 1 FROM "User" u WHERE u."id" = auth.uid() AND u."role" IN ('ADMIN', 'EMPLOYEE')
    ));

-- Message Policies: Users can access messages only within their own conversation
CREATE POLICY "message_conversation_access" ON "Message"
    FOR ALL USING (EXISTS (
        SELECT 1 FROM "Conversation" c WHERE c."id" = "conversationId" AND (
            c."userId" = auth.uid() OR EXISTS (
                SELECT 1 FROM "User" u WHERE u."id" = auth.uid() AND u."role" IN ('ADMIN', 'EMPLOYEE')
            )
        )
    ));

-- Attachment Policies: Authorized access only
CREATE POLICY "attachment_access" ON "Attachment"
    FOR ALL USING ("userId" = auth.uid() OR EXISTS (
        SELECT 1 FROM "User" u WHERE u."id" = auth.uid() AND u."role" IN ('ADMIN', 'EMPLOYEE')
    ));

-- Audit Log Policy: Only Administrators can view audit logs
CREATE POLICY "audit_admin_only" ON "AuditLog"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM "User" u WHERE u."id" = auth.uid() AND u."role" = 'ADMIN'
    ));
