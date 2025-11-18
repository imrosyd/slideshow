-- CreateTable
CREATE TABLE "image_durations" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL DEFAULT 5000,
    "caption" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "video_url" TEXT,
    "video_duration_ms" INTEGER,
    "video_status" TEXT NOT NULL DEFAULT 'none',
    "is_video" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "image_durations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideshow_settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideshow_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "page" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "browser_id" TEXT,

    CONSTRAINT "active_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "browser_id" TEXT NOT NULL,
    "browser_info" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (NOW() + '00:02:00'::interval),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "image_durations_filename_key" ON "image_durations"("filename");

-- CreateIndex
CREATE INDEX "image_durations_filename_idx" ON "image_durations"("filename");

-- CreateIndex
CREATE INDEX "image_durations_order_index_idx" ON "image_durations"("order_index");

-- CreateIndex
CREATE INDEX "image_durations_hidden_idx" ON "image_durations"("hidden");

-- CreateIndex
CREATE INDEX "image_durations_is_video_idx" ON "image_durations"("is_video");

-- CreateIndex
CREATE UNIQUE INDEX "slideshow_settings_key_key" ON "slideshow_settings"("key");

-- CreateIndex
CREATE INDEX "slideshow_settings_key_idx" ON "slideshow_settings"("key");

-- CreateIndex
CREATE INDEX "active_sessions_user_id_idx" ON "active_sessions"("user_id");

-- CreateIndex
CREATE INDEX "active_sessions_last_seen_idx" ON "active_sessions"("last_seen");

-- CreateIndex
CREATE INDEX "active_sessions_session_id_idx" ON "active_sessions"("session_id");

-- CreateIndex
CREATE INDEX "active_sessions_browser_id_idx" ON "active_sessions"("browser_id");

-- CreateIndex
CREATE INDEX "login_attempts_user_id_idx" ON "login_attempts"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_status_idx" ON "login_attempts"("status");

-- CreateIndex
CREATE INDEX "login_attempts_expires_at_idx" ON "login_attempts"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_email_idx" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");
