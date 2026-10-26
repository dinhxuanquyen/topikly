import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer } from "./audio-player";
import { ExamAudioProvider } from "./exam-audio-context";

const TRANSCRIPT = "여자: 안녕하세요.\n남자: 네, 안녕하세요.";
const TRANSLATION = "Nữ: Xin chào.\nNam: Vâng, xin chào.";
const SPEAKERS = [
  { label: "여자", gender: "female" as const },
  { label: "남자", gender: "male" as const },
];

let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** jsdom không có media thật: ghép duration/currentTime ghi được lên phần tử. */
function wire(duration = 60): HTMLAudioElement {
  const audio = document.querySelector("audio")!;
  let time = 0;
  Object.defineProperty(audio, "duration", { configurable: true, get: () => duration });
  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    get: () => time,
    set: (value: number) => {
      time = value;
    },
  });
  act(() => {
    fireEvent.loadedMetadata(audio);
  });
  return audio;
}

function tick(audio: HTMLAudioElement, seconds: number) {
  audio.currentTime = seconds;
  act(() => {
    fireEvent.timeUpdate(audio);
  });
}

describe("AudioPlayer chế độ luyện", () => {
  it("không dùng điều khiển gốc và hiện thời lượng sau khi tải metadata", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    const audio = wire(150);
    expect(audio).not.toHaveAttribute("controls");
    expect(screen.getByTestId("audio-time")).toHaveTextContent("00:00 / 02:30");
    expect(screen.getByRole("slider", { name: "Thanh tua audio" })).toHaveAttribute("max", "150");
  });

  it("metadata đã tải xong trước khi mount (sự kiện bị lỡ) vẫn hiện thời lượng", () => {
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(
      HTMLMediaElement.HAVE_METADATA,
    );
    vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockReturnValue(17);
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    expect(screen.getByTestId("audio-time")).toHaveTextContent("00:00 / 00:17");
    expect(screen.getByRole("slider", { name: "Thanh tua audio" })).toBeEnabled();
  });

  it("phát rồi tạm dừng theo sự kiện của <audio>", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    const audio = wire();
    fireEvent.click(screen.getByRole("button", { name: "Phát" }));
    expect(play).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.play(audio);
    });
    expect(screen.getByText("Đang phát.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tạm dừng" }));
    expect(pause).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.pause(audio);
    });
    expect(screen.getByRole("button", { name: "Phát" })).toBeInTheDocument();
    expect(screen.getByText("Đã tạm dừng.")).toBeInTheDocument();
  });

  it("đổi tốc độ đặt playbackRate", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    const audio = wire();
    const group = screen.getByRole("radiogroup", { name: "Tốc độ phát" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "1×" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "0.75×" }));
    expect(audio.playbackRate).toBe(0.75);
    fireEvent.click(screen.getByRole("radio", { name: "1.25×" }));
    expect(audio.playbackRate).toBe(1.25);
    expect(screen.getByRole("radio", { name: "1.25×" })).toBeChecked();
  });

  it("tua ±5 giây và kẹp trong [0, duration]", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    const audio = wire(12);
    const back = screen.getByRole("button", { name: "Lùi 5 giây" });
    const forward = screen.getByRole("button", { name: "Tiến 5 giây" });

    tick(audio, 3);
    fireEvent.click(back);
    expect(audio.currentTime).toBe(0);

    tick(audio, 8);
    fireEvent.click(forward);
    expect(audio.currentTime).toBe(12);

    tick(audio, 6);
    fireEvent.click(forward);
    expect(audio.currentTime).toBe(11);
    fireEvent.click(back);
    expect(audio.currentTime).toBe(6);
  });

  it("thanh tua đặt currentTime và có giá trị đọc được", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    const audio = wire(150);
    const slider = screen.getByRole("slider", { name: "Thanh tua audio" });
    fireEvent.change(slider, { target: { value: "65" } });
    expect(audio.currentTime).toBe(65);
    expect(slider).toHaveAttribute("aria-valuetext", "01:05 trên 02:30");
  });

  it("phát lại từ đầu", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    const audio = wire(60);
    tick(audio, 40);
    fireEvent.click(screen.getByRole("button", { name: "Phát lại từ đầu" }));
    expect(audio.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("kết thúc thì báo đã phát xong và phát tiếp quay về đầu", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    const audio = wire(60);
    act(() => {
      fireEvent.play(audio);
    });
    tick(audio, 60);
    act(() => {
      fireEvent.ended(audio);
    });
    expect(screen.getByText("Đã phát xong.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Phát" }));
    expect(audio.currentTime).toBe(0);
    expect(play).toHaveBeenCalled();
  });

  it("bật tắt lời thoại và bản dịch (chỉ khi có bản dịch)", () => {
    const { rerender } = render(
      <AudioPlayer src="/a.mp3" id="l01" transcriptKo={TRANSCRIPT} speakers={SPEAKERS} />,
    );
    expect(screen.queryByText("안녕하세요.")).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Xem lời thoại" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Ẩn lời thoại" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("안녕하세요.").closest("[lang]")).toHaveAttribute("lang", "ko");
    expect(screen.getByText("여자")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    rerender(
      <AudioPlayer
        src="/a.mp3"
        id="l01"
        transcriptKo={TRANSCRIPT}
        speakers={SPEAKERS}
        transcriptVi={TRANSLATION}
      />,
    );
    expect(screen.queryByText("Nữ: Xin chào.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Hiện bản dịch tiếng Việt" }));
    expect(screen.getByText("Nữ: Xin chào.")).toBeInTheDocument();
    expect(screen.getByText("Nam: Vâng, xin chào.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ẩn lời thoại" }));
    expect(screen.queryByText("안녕하세요.")).not.toBeInTheDocument();
  });

  it("lỗi tải: báo thân thiện và tự hiện lời thoại làm dự phòng", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" transcriptKo={TRANSCRIPT} speakers={SPEAKERS} />);
    const audio = wire();
    act(() => {
      fireEvent.error(audio);
    });
    expect(
      screen.getByText("Không tải được audio. Bạn có thể đọc lời thoại bên dưới."),
    ).toBeInTheDocument();
    expect(screen.getByText("안녕하세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Phát" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });

  it("vùng trạng thái aria-live polite", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" />);
    expect(screen.getByText("Sẵn sàng phát.").closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});

describe("AudioPlayer chế độ thi", () => {
  it("chỉ có một nút Phát: không tua, không tốc độ, không lời thoại", () => {
    render(
      <AudioPlayer
        src="/a.mp3"
        id="l01"
        mode="exam"
        transcriptKo={TRANSCRIPT}
        speakers={SPEAKERS}
        transcriptVi={TRANSLATION}
      />,
    );
    wire();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByText("안녕하세요.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /lời thoại/i })).not.toBeInTheDocument();
  });

  it("phát đúng một lần: đang phát khoá nút, tiến trình chỉ đọc, xong thì khoá vĩnh viễn", () => {
    const onPlayed = vi.fn();
    render(<AudioPlayer src="/a.mp3" id="l01" mode="exam" onPlayed={onPlayed} />);
    const audio = wire(100);
    const button = screen.getByRole("button", { name: "Phát" });

    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.play(audio);
    });
    expect(onPlayed).toHaveBeenCalledWith("l01");

    const playingButton = screen.getByRole("button", { name: "Đang phát…" });
    expect(playingButton).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(playingButton);
    expect(play).toHaveBeenCalledTimes(1);

    tick(audio, 25);
    const bar = screen.getByRole("progressbar", { name: "Tiến trình audio" });
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    // Tạm dừng từ ngoài (phím media) không dừng được: tự phát tiếp.
    act(() => {
      fireEvent.pause(audio);
    });
    expect(play).toHaveBeenCalledTimes(2);

    tick(audio, 100);
    act(() => {
      fireEvent.ended(audio);
    });
    const done = screen.getByRole("button", { name: "Đã phát xong" });
    expect(done).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Đã phát xong.")).toBeInTheDocument();
    fireEvent.click(done);
    expect(play).toHaveBeenCalledTimes(2);
    expect(onPlayed).toHaveBeenCalledTimes(1);
  });

  it("không cho đổi tốc độ khi đang phát", () => {
    render(<AudioPlayer src="/a.mp3" id="l01" mode="exam" />);
    const audio = wire();
    act(() => {
      fireEvent.play(audio);
    });
    audio.playbackRate = 1.5;
    act(() => {
      fireEvent.rateChange(audio);
    });
    expect(audio.playbackRate).toBe(1);
  });

  it("controlled: `played` từ ngoài giữ khoá khi mount lại và không còn <audio>", () => {
    const { unmount } = render(
      <AudioPlayer src="/a.mp3" id="l01" mode="exam" played onPlayed={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Đã phát xong" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(document.querySelector("audio")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đã phát xong" }));
    expect(play).not.toHaveBeenCalled();
    unmount();
  });

  it("qua ExamAudioProvider: trạng thái đã phát sống sau khi unmount rồi mount lại", () => {
    function Harness() {
      const [played, setPlayed] = useState<Record<string, true>>({});
      const [visible, setVisible] = useState(true);
      return (
        <ExamAudioProvider
          value={{ played, markPlayed: (id) => setPlayed((prev) => ({ ...prev, [id]: true })) }}
        >
          <button type="button" onClick={() => setVisible((v) => !v)}>
            đổi khối
          </button>
          {visible ? <AudioPlayer src="/a.mp3" id="l01" mode="exam" /> : null}
        </ExamAudioProvider>
      );
    }
    render(<Harness />);
    const audio = wire();
    act(() => {
      fireEvent.play(audio);
    });
    act(() => {
      fireEvent.ended(audio);
    });
    expect(screen.getByRole("button", { name: "Đã phát xong" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "đổi khối" }));
    expect(screen.queryByRole("button", { name: "Đã phát xong" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "đổi khối" }));

    const locked = screen.getByRole("button", { name: "Đã phát xong" });
    expect(locked).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(locked);
    expect(play).not.toHaveBeenCalled();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("đã bắt đầu phát rồi unmount giữa chừng vẫn tính là đã phát", () => {
    function Harness() {
      const [played, setPlayed] = useState<Record<string, true>>({});
      const [visible, setVisible] = useState(true);
      return (
        <ExamAudioProvider
          value={{ played, markPlayed: (id) => setPlayed((prev) => ({ ...prev, [id]: true })) }}
        >
          <button type="button" onClick={() => setVisible((v) => !v)}>
            đổi khối
          </button>
          {visible ? <AudioPlayer src="/a.mp3" id="l01" mode="exam" /> : null}
        </ExamAudioProvider>
      );
    }
    render(<Harness />);
    const audio = wire();
    act(() => {
      fireEvent.play(audio);
    });
    fireEvent.click(screen.getByRole("button", { name: "đổi khối" }));
    fireEvent.click(screen.getByRole("button", { name: "đổi khối" }));
    expect(screen.getByRole("button", { name: "Đã phát xong" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("lỗi tải: báo lỗi, không tính lượt nghe, cho thử lại; không có lời thoại dự phòng", () => {
    const onPlayed = vi.fn();
    render(
      <AudioPlayer
        src="/a.mp3"
        id="l01"
        mode="exam"
        transcriptKo={TRANSCRIPT}
        speakers={SPEAKERS}
        onPlayed={onPlayed}
      />,
    );
    const audio = wire();
    act(() => {
      fireEvent.error(audio);
    });
    expect(
      screen.getByText(
        "Không tải được audio. Kiểm tra kết nối rồi thử lại; lượt nghe của bạn chưa bị tính.",
      ),
    ).toBeInTheDocument();
    expect(onPlayed).not.toHaveBeenCalled();
    expect(screen.queryByText("안녕하세요.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });
});
