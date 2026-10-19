CREATE TYPE "public"."attempt_mode" AS ENUM('exam', 'practice');--> statement-breakpoint
CREATE TYPE "public"."exam_kind" AS ENUM('full', 'mini', 'hard', 'ibt');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('vnpay', 'momo', 'manual');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."plan_task_kind" AS ENUM('vocab', 'grammar', 'practice', 'mini_test', 'writing');--> statement-breakpoint
CREATE TYPE "public"."question_format" AS ENUM('multiple_choice', 'constructed');--> statement-breakpoint
CREATE TYPE "public"."skill" AS ENUM('listening', 'reading', 'writing', 'speaking');--> statement-breakpoint
CREATE TYPE "public"."srs_item_type" AS ENUM('word', 'grammar', 'question');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'premium_6m', 'premium_1y', 'lifetime');--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"code" text NOT NULL,
	"skill" "skill" NOT NULL,
	"type_group" text NOT NULL,
	"range_from" integer NOT NULL,
	"range_to" integer NOT NULL,
	"name_vi" text NOT NULL,
	"subskill" text,
	"allowed_subskills" text[] DEFAULT '{}'::text[] NOT NULL,
	"typical_difficulty_min" smallint,
	"typical_difficulty_max" smallint,
	"paired" boolean DEFAULT false NOT NULL,
	"char_min" integer,
	"char_max" integer,
	"format" "question_format" DEFAULT 'multiple_choice' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"distractor_note_vi" text,
	"trap" text,
	"position" smallint DEFAULT 0 NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"program_id" uuid NOT NULL,
	"kind" "exam_kind" NOT NULL,
	"title" text NOT NULL,
	"source" text,
	"published" boolean DEFAULT false NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grammar_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"program_id" uuid,
	"pattern" text NOT NULL,
	"meaning_vi" text NOT NULL,
	"level" smallint,
	"function" text,
	"compare_group" text,
	"body_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hanja_syllables" (
	"syllable" text NOT NULL,
	"hanja" text NOT NULL,
	"han_viet" text NOT NULL,
	CONSTRAINT "hanja_syllables_syllable_hanja_pk" PRIMARY KEY("syllable","hanja")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"pillar" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body_mdx" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"group_key" text,
	"section_id" uuid,
	"passage_md" text,
	"audio_url" text,
	"image_url" text,
	"transcript_ko" text,
	"transcript_vi" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_tags" (
	"question_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "question_tags_question_id_tag_id_pk" PRIMARY KEY("question_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"group_id" uuid,
	"program_id" uuid NOT NULL,
	"type_code" text NOT NULL,
	"number" smallint,
	"subskill" text NOT NULL,
	"stem" text NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'original' NOT NULL,
	"authored_by" text,
	"reviewed_at" date,
	"difficulty" smallint NOT NULL,
	"explanation_vi" text NOT NULL,
	"reviewed_by" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_difficulty_range" CHECK ("questions"."difficulty" between 3 and 6),
	CONSTRAINT "questions_external_id_fmt" CHECK ("questions"."external_id" ~ '^[lrw][0-9]{2}-[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"skill" "skill" NOT NULL,
	"position" smallint NOT NULL,
	"duration_sec" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "word_syllables" (
	"word_id" uuid NOT NULL,
	"syllable_index" smallint NOT NULL,
	"syllable" text NOT NULL,
	"hanja" text NOT NULL,
	CONSTRAINT "word_syllables_word_id_syllable_index_pk" PRIMARY KEY("word_id","syllable_index")
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text,
	"program_id" uuid,
	"hangul" text NOT NULL,
	"hanja" text,
	"han_viet" text,
	"meaning_vi" text NOT NULL,
	"pos" text,
	"level" smallint,
	"example_ko" text,
	"example_vi" text,
	"false_friend" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"register" text,
	"task" text,
	"blanks" jsonb,
	"required_points" jsonb,
	"char_min" integer,
	"char_max" integer,
	"model_answers" jsonb,
	"expression_bank" jsonb,
	"outline_vi" text,
	"scoring_notes_vi" text,
	"common_mistakes_vi" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "writing_tasks_question_id_unique" UNIQUE("question_id")
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"choice_id" uuid,
	"is_correct" boolean,
	"time_spent_ms" integer DEFAULT 0 NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"exam_id" uuid,
	"practice_type" text,
	"mode" "attempt_mode" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"score_json" jsonb,
	CONSTRAINT "attempts_target_chk" CHECK ("attempts"."exam_id" is not null or "attempts"."practice_type" is not null)
);
--> statement-breakpoint
CREATE TABLE "placement_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"estimated_level" smallint,
	"weak_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"day" date NOT NULL,
	"kind" "plan_task_kind" NOT NULL,
	"ref_id" text,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"program_id" uuid,
	"display_name" text,
	"target_level" smallint,
	"exam_date" date,
	"minutes_per_day" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "srs_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_type" "srs_item_type" NOT NULL,
	"item_id" uuid NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stability" real DEFAULT 0 NOT NULL,
	"difficulty" real DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_review_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "plan_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"attempt_id" uuid,
	"text" text NOT NULL,
	"char_count" integer NOT NULL,
	"rule_checks_json" jsonb,
	"ai_score_json" jsonb,
	"ai_feedback_json" jsonb,
	"model_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"expires_at" timestamp with time zone,
	"provider" "payment_provider",
	"provider_txn_id" text,
	"device_limit" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"ai_gradings" integer DEFAULT 0 NOT NULL,
	"practice_questions" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "usage_counters_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "question_types" ADD CONSTRAINT "question_types_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "choices" ADD CONSTRAINT "choices_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_points" ADD CONSTRAINT "grammar_points_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_group_id_question_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."question_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_type_fk" FOREIGN KEY ("program_id","type_code") REFERENCES "public"."question_types"("program_id","code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_syllables" ADD CONSTRAINT "word_syllables_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_syllables" ADD CONSTRAINT "word_syllables_hanja_fk" FOREIGN KEY ("syllable","hanja") REFERENCES "public"."hanja_syllables"("syllable","hanja") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_tasks" ADD CONSTRAINT "writing_tasks_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_choice_id_choices_id_fk" FOREIGN KEY ("choice_id") REFERENCES "public"."choices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_results" ADD CONSTRAINT "placement_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_results" ADD CONSTRAINT "placement_results_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_plan_id_study_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writing_submissions" ADD CONSTRAINT "writing_submissions_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "programs_code_uq" ON "programs" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "question_types_program_code_uq" ON "question_types" USING btree ("program_id","code");--> statement-breakpoint
CREATE INDEX "question_types_skill_idx" ON "question_types" USING btree ("program_id","skill");--> statement-breakpoint
CREATE INDEX "question_types_group_idx" ON "question_types" USING btree ("program_id","type_group");--> statement-breakpoint
CREATE UNIQUE INDEX "choices_question_label_uq" ON "choices" USING btree ("question_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "choices_one_correct_uq" ON "choices" USING btree ("question_id") WHERE "choices"."is_correct";--> statement-breakpoint
CREATE UNIQUE INDEX "exams_external_id_uq" ON "exams" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "exams_program_kind_idx" ON "exams" USING btree ("program_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "grammar_points_external_id_uq" ON "grammar_points" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "grammar_points_compare_group_idx" ON "grammar_points" USING btree ("compare_group");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_program_slug_uq" ON "lessons" USING btree ("program_id","slug");--> statement-breakpoint
CREATE INDEX "lessons_program_pillar_idx" ON "lessons" USING btree ("program_id","pillar","position");--> statement-breakpoint
CREATE UNIQUE INDEX "question_groups_program_key_uq" ON "question_groups" USING btree ("program_id","group_key");--> statement-breakpoint
CREATE INDEX "question_groups_section_idx" ON "question_groups" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "question_tags_tag_idx" ON "question_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_external_id_uq" ON "questions" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "questions_type_code_idx" ON "questions" USING btree ("program_id","type_code");--> statement-breakpoint
CREATE INDEX "questions_group_idx" ON "questions" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "questions_subskill_idx" ON "questions" USING btree ("subskill");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_exam_position_uq" ON "sections" USING btree ("exam_id","position");--> statement-breakpoint
CREATE INDEX "word_syllables_hanja_idx" ON "word_syllables" USING btree ("syllable","hanja");--> statement-breakpoint
CREATE UNIQUE INDEX "words_external_id_uq" ON "words" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "words_hangul_idx" ON "words" USING btree ("hangul");--> statement-breakpoint
CREATE INDEX "words_level_idx" ON "words" USING btree ("program_id","level");--> statement-breakpoint
CREATE UNIQUE INDEX "answers_attempt_question_uq" ON "answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "answers_attempt_idx" ON "answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "answers_question_idx" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_user_started_idx" ON "attempts" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "attempts_exam_idx" ON "attempts" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "placement_results_user_idx" ON "placement_results" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "plan_tasks_plan_day_idx" ON "plan_tasks" USING btree ("plan_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "srs_cards_user_item_uq" ON "srs_cards" USING btree ("user_id","item_type","item_id");--> statement-breakpoint
CREATE INDEX "srs_cards_user_due_idx" ON "srs_cards" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "study_plans_user_status_idx" ON "study_plans" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "writing_submissions_user_idx" ON "writing_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_user_expires_idx" ON "subscriptions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_txn_uq" ON "subscriptions" USING btree ("provider","provider_txn_id");