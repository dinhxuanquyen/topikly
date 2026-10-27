import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublicExam } from "@/lib/exam/types";
import { ExamIntro } from "./exam-intro";
import { listeningAudioStatus } from "./exam-state";
import { EXAM, LISTENING_EXAM, WRITING_EXAM, withAudio } from "./test-fixtures";

function renderIntro(exam: PublicExam) {
  return render(
    <ExamIntro exam={exam} ready lastResult={null} onStart={vi.fn()} onViewLastResult={vi.fn()} />,
  );
}

const ONCE = "Mỗi bài nghe chỉ phát một lần, không tua.";

describe("ExamIntro: audio của câu Nghe", () => {
  it("đề Nghe chưa có audio: thông báo nổi bật nói rõ lời thoại sẽ hiện thay, không nêu quy chế phát một lần", () => {
    renderIntro(LISTENING_EXAM);
    const notice = screen.getByTestId("audio-missing-notice");
    expect(notice).toHaveAccessibleName("Đề này chưa có audio");
    expect(notice).toHaveTextContent("Cả 4 câu Nghe chưa có audio");
    expect(notice).toHaveTextContent("Lời thoại tiếng Hàn sẽ hiện thay cho phần nghe");
    expect(notice).toHaveTextContent("chỉ mang tính tham khảo");
    expect(screen.queryByText(ONCE)).toBeNull();
    // Đề Nghe: 4 câu, 25 phút, một kỹ năng nên không liệt kê từng phần.
    expect(screen.getByText("4 câu · 25 phút")).toBeInTheDocument();
  });

  it("thông báo đứng trước nút Bắt đầu để người học thấy trước khi làm", () => {
    renderIntro(LISTENING_EXAM);
    const notice = screen.getByTestId("audio-missing-notice");
    const start = screen.getByRole("button", { name: /Bắt đầu làm bài/ });
    expect(notice.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("đề Nghe có đủ audio: không cảnh báo, ghi chú quy chế phát một lần không tua", () => {
    renderIntro(withAudio(LISTENING_EXAM));
    expect(screen.queryByTestId("audio-missing-notice")).toBeNull();
    expect(screen.getByText(ONCE)).toBeInTheDocument();
  });

  it("thiếu một phần: nêu số câu thiếu, vẫn giữ ghi chú phát một lần cho các câu có audio", () => {
    const exam = withAudio(LISTENING_EXAM, (id) => (id === "l11-0001" ? "" : `/audio/${id}.mp3`));
    expect(listeningAudioStatus(exam)).toEqual({ listening: 4, missing: 1 });
    renderIntro(exam);
    expect(screen.getByTestId("audio-missing-notice")).toHaveTextContent(
      "1/4 câu Nghe chưa có audio",
    );
    expect(screen.getByText(ONCE)).toBeInTheDocument();
  });

  it("đề Đọc: không thông báo audio và không ghi chú phát một lần", () => {
    renderIntro(EXAM);
    expect(screen.queryByTestId("audio-missing-notice")).toBeNull();
    expect(screen.queryByText(ONCE)).toBeNull();
  });
});

describe("listeningAudioStatus", () => {
  it("khối dùng chung bài nghe tính theo audio của câu đầu khối", () => {
    const exam = withAudio(LISTENING_EXAM);
    // Câu 4 vẫn có audio_url riêng nhưng khối chỉ phát audio của câu 3 -> cả hai câu thiếu.
    exam.sections[0]!.blocks[1]!.questions[0]!.question.audio_url = null;
    expect(listeningAudioStatus(exam)).toEqual({ listening: 4, missing: 2 });
  });

  it("đề Đọc không có câu Nghe", () => {
    expect(listeningAudioStatus(EXAM)).toEqual({ listening: 0, missing: 0 });
  });
});

describe("ExamIntro: đề Viết", () => {
  it("nêu Viết 4 câu 50 phút kèm ghi chú tự chấm bằng bài mẫu, chưa chấm AI", () => {
    renderIntro(WRITING_EXAM);
    expect(screen.getByText("4 câu · 50 phút")).toBeInTheDocument();
    expect(screen.getByTestId("writing-self-score-note")).toHaveTextContent(
      "Phần Viết tự chấm bằng bài mẫu, chưa chấm AI.",
    );
    expect(screen.getByText(/Số ký tự tính cả khoảng trắng/)).toBeInTheDocument();
    expect(screen.getByText("Câu Viết bỏ trống được tính 0 điểm khi tự chấm.")).toBeInTheDocument();
    expect(screen.queryByTestId("audio-missing-notice")).toBeNull();
    expect(screen.queryByText(ONCE)).toBeNull();
    // Mini test vẫn giải thích cấp là ước lượng.
    expect(screen.getByText(/cấp hiển thị ở kết quả là ước lượng/)).toBeInTheDocument();
  });

  it("đề trắc nghiệm không có ghi chú tự chấm", () => {
    renderIntro(EXAM);
    expect(screen.queryByTestId("writing-self-score-note")).toBeNull();
    expect(screen.getByText(/Mỗi câu chỉ có một đáp án đúng/)).toBeInTheDocument();
  });
});
