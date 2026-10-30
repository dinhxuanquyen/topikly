import { DEFAULT_PROGRAM } from "@/components/config/programs";
import { Hero } from "@/components/landing/hero";
import { StartHere } from "@/components/landing/start-here";
import { Reveal } from "@/components/landing/reveal";
import {
  Closing,
  Features,
  FocusSection,
  LandingFooter,
  LatestPosts,
  Levels,
  NumberStrip,
  Pillars,
  Roadmap,
} from "@/components/landing/sections";
import { getBlogPosts } from "@/lib/blog/queries";
import { getExams, getPlacementExam } from "@/lib/exam/queries";
import { getLandingData } from "@/lib/landing/queries";
import "@/components/landing/landing.css";

/** Thời lượng test trình độ hiển thị khi chưa đọc được đề (phút). */
const FALLBACK_PLACEMENT_MINUTES = 15;
/** Số bài blog mới nhất hiện ở trang chủ. */
const LATEST_POST_COUNT = 3;

/**
 * Trang chủ (thiết kế: file Figma "Topikly — Giao diện học sinh sinh viên"). Thứ tự theo hành
 * trình của người học: làm thử một câu ngay → biết Topikly có gì → thấy màn học tập trung →
 * hiểu vì sao học ở đây hiệu quả → lộ trình → năm trụ → mục tiêu theo cấp → bài viết mới → bắt đầu.
 */
export default async function LandingPage() {
  const program = DEFAULT_PROGRAM.slug;
  const [data, placement, posts, exams] = await Promise.all([
    getLandingData(program),
    getPlacementExam(program),
    getBlogPosts(),
    getExams(program, "mini"),
  ]);
  const placementMinutes = placement
    ? Math.round(placement.duration_sec / 60)
    : FALLBACK_PLACEMENT_MINUTES;

  return (
    <div className="lp-root">
      <Reveal />
      <Hero
        program={program}
        question={data?.question ?? null}
        placementMinutes={placementMinutes}
      />
      {data ? (
        <>
          <NumberStrip
            typeCount={data.typeCount}
            trapCount={data.trapCount}
            placementMinutes={placementMinutes}
          />
          <FocusSection question={data.question} />
          <Features program={program} question={data.question} hanja={data.hanja} />
          <Roadmap program={program} />
          <Pillars program={program} />
          <Levels
            levels={data.levels}
            totalMaxScore={data.totalMaxScore}
            sections={data.sections}
          />
        </>
      ) : null}
      <StartHere program={program} placement={placement} exams={exams} />
      <LatestPosts posts={posts.slice(0, LATEST_POST_COUNT)} />
      <Closing program={program} />
      <LandingFooter program={program} />
    </div>
  );
}
