"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface ExamAudioState {
  /** audioId -> true khi audio đó đã bắt đầu phát trong phiên làm đề này. */
  played: Readonly<Record<string, true>>;
  markPlayed: (audioId: string) => void;
}

const ExamAudioContext = createContext<ExamAudioState | null>(null);

/**
 * Giữ trạng thái "audio đã phát" cho cả phiên làm đề.
 *
 * Trình làm đề (ExamRunner) là bên sở hữu state (kèm lưu nháp IndexedDB để tải lại trang vẫn bị
 * khoá) và bọc các khối câu bằng provider này. Nhờ vậy việc chuyển khối làm AudioPlayer
 * unmount/mount lại không mở khoá lượt nghe. AudioPlayer chế độ thi tự đọc context này; khi không
 * có provider nó dùng prop `played`/`onPlayed` hoặc state cục bộ (xem AudioPlayer).
 */
export function ExamAudioProvider({
  value,
  children,
}: {
  value: ExamAudioState;
  children: ReactNode;
}) {
  return <ExamAudioContext.Provider value={value}>{children}</ExamAudioContext.Provider>;
}

export function useExamAudio(): ExamAudioState | null {
  return useContext(ExamAudioContext);
}
