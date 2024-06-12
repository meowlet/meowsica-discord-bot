CREATE SCHEMA "app";
--> statement-breakpoint
CREATE SCHEMA "logs";
--> statement-breakpoint
CREATE TYPE "public"."tts_provider" AS ENUM('basic', 'wavenet');--> statement-breakpoint
CREATE TYPE "public"."command_log_status" AS ENUM('success', 'error', 'quota_limit');--> statement-breakpoint
CREATE TABLE "app"."guild_settings" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"ui_locale" text,
	"tts_language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"ui_locale" text,
	"tts_provider" "tts_provider" DEFAULT 'wavenet' NOT NULL,
	"tts_language" text,
	"tts_voice_id" text,
	"tts_speed" real DEFAULT 1 NOT NULL,
	"tts_pitch" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_prefs_speed_range" CHECK ("app"."user_preferences"."tts_speed" BETWEEN 0.25 AND 4.0),
	CONSTRAINT "user_prefs_pitch_range" CHECK ("app"."user_preferences"."tts_pitch" BETWEEN -20.0 AND 20.0)
);
--> statement-breakpoint
CREATE TABLE "app"."user_usage" (
	"user_id" text NOT NULL,
	"period" date NOT NULL,
	"chars_used" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_usage_user_id_period_pk" PRIMARY KEY("user_id","period"),
	CONSTRAINT "user_usage_chars_nonneg" CHECK ("app"."user_usage"."chars_used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "logs"."command_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "logs"."command_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"guild_id" text,
	"guild_name" text,
	"channel_id" text,
	"command" text NOT NULL,
	"input" jsonb,
	"model" text,
	"status" "command_log_status" NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_usage_period_idx" ON "app"."user_usage" USING btree ("period");--> statement-breakpoint
CREATE INDEX "command_logs_at_idx" ON "logs"."command_logs" USING btree ("at");--> statement-breakpoint
CREATE INDEX "command_logs_user_at_idx" ON "logs"."command_logs" USING btree ("user_id","at");--> statement-breakpoint
CREATE INDEX "command_logs_guild_at_idx" ON "logs"."command_logs" USING btree ("guild_id","at");--> statement-breakpoint
CREATE INDEX "command_logs_status_at_idx" ON "logs"."command_logs" USING btree ("status","at");