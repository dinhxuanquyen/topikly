import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicQuestion } from "@/lib/practice/types";
import { QuestionMaterial } from "./question-material";

const LISTENING: PublicQuestion = {
  id: "l10-0001",
  program: "topik-ii",
  type_code: "L10",
  skill: "listening",
  subskill: "dialogue_gist",
  difficulty: 4,
  stem: "다음을 듣고 알맞은 것을 고르십시오.",
  transcript_ko: "여자: 이 원피스 좀 맡기려고요.\n남자: 네, 그럼요.",
  speakers: [
    { label: "여자", gender: "female" },
    { label: "남자", gender: "male" },
  ],
  audio_url: null,
  choices: [
    { label: "①", text: "하나" },
    { label: "②", text: "둘" },
    { label: "③", text: "셋" },
    { label: "④", text: "넷" },
  ],
};

describe("QuestionMaterial", () => {
  it("phương án là biểu đồ: không hiện khung 'tranh đang được vẽ' cho mô tả chung của câu", () => {
    const chart = {
      chart_type: "bar" as const,
      title: "자전거로 출퇴근하는 이유",
      unit: "%",
      series: [{ name: "비율", points: [{ x: "건강 관리", y: 47 }] }],
    };
    render(
      <QuestionMaterial
        question={{
          ...LISTENING,
          image_desc: "Bốn biểu đồ cùng bố cục.",
          choices: LISTENING.choices.map((c) => ({ ...c, text: "", chart_data: [chart] })),
        }}
      />,
    );
    expect(screen.queryByText("Bốn biểu đồ cùng bố cục.")).toBeNull();
  });

  it("không có audio: vẫn hiện lời thoại kèm ghi chú, kể cả khi audioMode là exam", () => {
    const { rerender } = render(<QuestionMaterial question={LISTENING} />);
    expect(screen.getByText("Chế độ luyện: chưa có audio, đọc lời thoại.")).toBeInTheDocument();
    expect(screen.getByText("이 원피스 좀 맡기려고요.")).toBeInTheDocument();
    expect(document.querySelector("audio")).toBeNull();

    rerender(<QuestionMaterial question={LISTENING} audioMode="exam" />);
    expect(screen.getByText("이 원피스 좀 맡기려고요.")).toBeInTheDocument();
  });

  it("không có audio, chế độ thi: ghi chú đề nháp, không nói 'Chế độ luyện'", () => {
    render(<QuestionMaterial question={LISTENING} audioMode="exam" />);
    expect(screen.getByText(/^Đề nháp: chưa có audio\./)).toHaveTextContent(
      "Lời thoại hiện thay cho phần nghe, nên kết quả chỉ mang tính tham khảo.",
    );
    expect(screen.queryByText(/Chế độ luyện/)).toBeNull();
    expect(screen.getByText("이 원피스 좀 맡기려고요.")).toBeInTheDocument();
  });

  it("không có audio, xem lại kết quả: ghi chú trung tính; noAudioNote={null} bỏ ghi chú", () => {
    const { rerender } = render(<QuestionMaterial question={LISTENING} noAudioNote="review" />);
    expect(screen.getByText("Chưa có audio, đọc lời thoại.")).toBeInTheDocument();
    rerender(<QuestionMaterial question={LISTENING} noAudioNote={null} />);
    expect(screen.queryByText(/chưa có audio/i)).toBeNull();
  });

  it("không có audio + transcriptVi nhưng không bật inlineTranslation: không in bản dịch (Luyện tập có khối dịch riêng)", () => {
    render(<QuestionMaterial question={LISTENING} transcriptVi="Tôi muốn gửi chiếc váy này." />);
    expect(screen.queryByText("Tôi muốn gửi chiếc váy này.")).toBeNull();
  });

  it("không có audio + transcriptVi + inlineTranslation: bản dịch hiện dưới từng lượt thoại", () => {
    render(
      <QuestionMaterial
        question={LISTENING}
        noAudioNote="review"
        inlineTranslation
        transcriptVi={"Tôi muốn gửi chiếc váy này.\nVâng, được ạ."}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("이 원피스 좀 맡기려고요.");
    expect(items[0]).toHaveTextContent("Tôi muốn gửi chiếc váy này.");
    expect(items[1]).toHaveTextContent("Vâng, được ạ.");
  });

  it("có audio, mặc định luyện: trình phát tự dựng, lời thoại ẩn cho tới khi bật", () => {
    render(<QuestionMaterial question={{ ...LISTENING, audio_url: "/audio/l10-0001.mp3" }} />);
    expect(document.querySelector("audio")).not.toHaveAttribute("controls");
    expect(screen.getByRole("slider", { name: "Thanh tua audio" })).toBeInTheDocument();
    expect(screen.queryByText("이 원피스 좀 맡기려고요.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xem lời thoại" }));
    expect(screen.getByText("이 원피스 좀 맡기려고요.")).toBeInTheDocument();
  });

  it("có audio, chế độ thi: chỉ nút Phát, không lời thoại, không tua", () => {
    render(
      <QuestionMaterial
        audioMode="exam"
        question={{ ...LISTENING, audio_url: "/audio/l10-0001.mp3" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Phát" })).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByText("이 원피스 좀 맡기려고요.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xem lời thoại" })).not.toBeInTheDocument();
  });

  it("transcriptVi (sau khi nộp) bật tuỳ chọn hiện bản dịch", () => {
    render(
      <QuestionMaterial
        question={{ ...LISTENING, audio_url: "/audio/l10-0001.mp3" }}
        transcriptVi={"Nữ: Cháu muốn gửi chiếc váy này.\nNam: Vâng, được chứ."}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Xem lời thoại" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Hiện bản dịch tiếng Việt" }));
    expect(screen.getByText("Nữ: Cháu muốn gửi chiếc váy này.")).toBeInTheDocument();
  });
});
