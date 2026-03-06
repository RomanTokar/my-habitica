CREATE TYPE "public"."daily_frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."habit_frequency" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('habit', 'daily', 'todo', 'reward');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "task_type" NOT NULL,
	"text" varchar(500) NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"value" real DEFAULT 0 NOT NULL,
	"priority" varchar(4) DEFAULT '1' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"up" boolean DEFAULT true,
	"down" boolean DEFAULT true,
	"counter_up" integer DEFAULT 0,
	"counter_down" integer DEFAULT 0,
	"habit_frequency" "habit_frequency" DEFAULT 'weekly',
	"frequency" "daily_frequency" DEFAULT 'weekly',
	"every_x" integer DEFAULT 1,
	"start_date" timestamp with time zone,
	"repeat" jsonb DEFAULT '{"m":true,"t":true,"w":true,"th":true,"f":true,"s":false,"su":false}'::jsonb,
	"streak" integer DEFAULT 0,
	"is_due" boolean DEFAULT true,
	"completed" boolean DEFAULT false,
	"checklist" jsonb DEFAULT '[]'::jsonb,
	"due_date" timestamp with time zone,
	"date_completed" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(30) NOT NULL,
	"password_hash" text NOT NULL,
	"gold" real DEFAULT 0 NOT NULL,
	"last_cron" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
