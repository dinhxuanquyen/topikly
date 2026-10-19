-- 0001_rls_policies.sql — Row Level Security cho Topikly (viết tay, chạy lại được).
--
-- Nguyên tắc
--  * Bảng dữ liệu người dùng: chủ sở hữu (auth.uid() = user_id) chỉ ĐỌC dữ liệu của mình ở hầu hết bảng.
--    Mọi thao tác ghi quan trọng (chấm điểm, ghi đáp án, quota AI, gói Premium) đi qua server
--    (route handler dùng service role / kết nối trực tiếp, vượt RLS) để client không tự sửa điểm,
--    quota hay gói. Chỉ profiles, study_plans, plan_tasks, srs_cards cho chủ sở hữu ghi trực tiếp.
--  * Bảng nội dung: bật RLS; đọc công khai chỉ với dữ liệu KHÔNG chứa đáp án.
--    `questions`, `choices`, `question_groups` KHÔNG có policy đọc cho anon/authenticated:
--    choices.is_correct, questions.explanation_vi/meta, writing_tasks (bài mẫu) và transcript sẽ lộ đáp án nếu đọc thẳng
--    bằng khoá anon, trái nguyên tắc "chấm ở chế độ thi phía server, không gửi đáp án xuống
--    trước khi nộp". Client lấy câu hỏi qua route handler (đã lược đáp án); service role vẫn đọc được.
--  * Quyền Premium (exams.is_premium, lessons.is_premium) kiểm ở server; policy lessons chỉ
--    công khai bài không Premium.
--
-- Chạy lại nhiều lần an toàn: ENABLE RLS idempotent, mọi policy DROP IF EXISTS trước khi tạo.
-- Cần schema `auth` của Supabase (hàm auth.uid()).

-- ============================================================ Bảng dữ liệu người dùng

-- profiles: chủ sở hữu đọc/ghi hồ sơ của mình.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_owner_all" ON "profiles";
CREATE POLICY "profiles_owner_all" ON "profiles"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- placement_results: chỉ đọc; server ghi sau khi chấm bài test trình độ.
ALTER TABLE "placement_results" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "placement_results_owner_select" ON "placement_results";
CREATE POLICY "placement_results_owner_select" ON "placement_results"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- study_plans: chủ sở hữu đọc/ghi lộ trình của mình.
ALTER TABLE "study_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_plans_owner_all" ON "study_plans";
CREATE POLICY "study_plans_owner_all" ON "study_plans"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- plan_tasks: quyền suy ra từ study_plans cha.
ALTER TABLE "plan_tasks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_tasks_owner_all" ON "plan_tasks";
CREATE POLICY "plan_tasks_owner_all" ON "plan_tasks"
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "study_plans" p
    WHERE p.id = plan_tasks.plan_id AND p.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "study_plans" p
    WHERE p.id = plan_tasks.plan_id AND p.user_id = (SELECT auth.uid())
  ));

-- attempts: chỉ đọc; server tạo/nộp/chấm (score_json không được client sửa).
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attempts_owner_select" ON "attempts";
CREATE POLICY "attempts_owner_select" ON "attempts"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- answers: chỉ đọc, quyền suy ra từ attempts cha. Server ghi (kèm is_correct, time_spent_ms).
ALTER TABLE "answers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "answers_owner_select" ON "answers";
CREATE POLICY "answers_owner_select" ON "answers"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "attempts" a
    WHERE a.id = answers.attempt_id AND a.user_id = (SELECT auth.uid())
  ));

-- writing_submissions: chỉ đọc; server ghi sau khi chạy rule check + chấm AI.
ALTER TABLE "writing_submissions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "writing_submissions_owner_select" ON "writing_submissions";
CREATE POLICY "writing_submissions_owner_select" ON "writing_submissions"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- srs_cards: chủ sở hữu đọc/ghi thẻ ôn của mình.
ALTER TABLE "srs_cards" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "srs_cards_owner_all" ON "srs_cards";
CREATE POLICY "srs_cards_owner_all" ON "srs_cards"
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- subscriptions: chỉ đọc; chỉ webhook/server (service role) ghi.
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_owner_select" ON "subscriptions";
CREATE POLICY "subscriptions_owner_select" ON "subscriptions"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- usage_counters: chỉ đọc; server tăng bộ đếm (không để client tự reset quota).
ALTER TABLE "usage_counters" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_counters_owner_select" ON "usage_counters";
CREATE POLICY "usage_counters_owner_select" ON "usage_counters"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================ Bảng nội dung

-- Công khai hoàn toàn (không chứa đáp án).
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "programs_public_read" ON "programs";
CREATE POLICY "programs_public_read" ON "programs"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "question_types" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "question_types_public_read" ON "question_types";
CREATE POLICY "question_types_public_read" ON "question_types"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_public_read" ON "tags";
CREATE POLICY "tags_public_read" ON "tags"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "words" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "words_public_read" ON "words";
CREATE POLICY "words_public_read" ON "words"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "hanja_syllables" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hanja_syllables_public_read" ON "hanja_syllables";
CREATE POLICY "hanja_syllables_public_read" ON "hanja_syllables"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "word_syllables" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "word_syllables_public_read" ON "word_syllables";
CREATE POLICY "word_syllables_public_read" ON "word_syllables"
  FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE "grammar_points" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grammar_points_public_read" ON "grammar_points";
CREATE POLICY "grammar_points_public_read" ON "grammar_points"
  FOR SELECT TO anon, authenticated USING (true);

-- Đề đã xuất bản (danh sách hiển thị cả đề Premium; nội dung câu hỏi chỉ qua server).
ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exams_public_read" ON "exams";
CREATE POLICY "exams_public_read" ON "exams"
  FOR SELECT TO anon, authenticated USING (published);

ALTER TABLE "sections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sections_public_read" ON "sections";
CREATE POLICY "sections_public_read" ON "sections"
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM "exams" e WHERE e.id = sections.exam_id AND e.published));

-- Bài học đã xuất bản và không Premium (bài Premium đọc qua server sau khi kiểm quyền).
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_public_read" ON "lessons";
CREATE POLICY "lessons_public_read" ON "lessons"
  FOR SELECT TO anon, authenticated USING (published AND NOT is_premium);

-- Bật RLS nhưng KHÔNG có policy cho anon/authenticated -> chỉ service role đọc được
-- (xem ghi chú đầu file về việc không lộ đáp án).
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "choices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_tags" ENABLE ROW LEVEL SECURITY;
-- writing_tasks chứa đáp án chấp nhận và bài mẫu -> chỉ server/AI chấm đọc.
ALTER TABLE "writing_tasks" ENABLE ROW LEVEL SECURITY;

-- Bỏ policy cũ (nếu từng tạo ở phiên bản trước) để trạng thái luôn nhất quán khi chạy lại.
DROP POLICY IF EXISTS "questions_public_read" ON "questions";
DROP POLICY IF EXISTS "choices_public_read" ON "choices";
DROP POLICY IF EXISTS "question_groups_public_read" ON "question_groups";
DROP POLICY IF EXISTS "question_tags_public_read" ON "question_tags";
DROP POLICY IF EXISTS "writing_tasks_public_read" ON "writing_tasks";
