/**
 * Chuỗi giao diện tiếng Việt. Mọi chữ hiển thị cho người học đặt ở đây để sau
 * này thêm ngôn ngữ khác (en.ts…) mà không phải sửa component.
 * Tên riêng của chương trình thi (TOPIK II…) lấy từ components/config/programs.ts.
 */
export const vi = {
  brand: {
    name: "Topikly",
    tagline: "Người thầy TOPIK cho người Việt",
  },

  meta: {
    description: (program: string) =>
      `Học và luyện thi tiếng Hàn cho người Việt, bắt đầu từ ${program}.`,
  },

  a11y: {
    skipToContent: "Bỏ qua điều hướng, tới nội dung chính",
    primaryNav: "Điều hướng chính",
    tabBar: "Thanh điều hướng dưới",
    breadcrumb: "Đường dẫn",
    goHome: "Về trang chủ Topikly",
  },

  nav: {
    pillars: {
      theory: "Lý thuyết",
      roadmap: "Lộ trình",
      practice: "Luyện tập",
      exams: "Đề thi",
      upgrade: "Nâng cấp",
    },
    blog: "Blog",
    account: "Tài khoản",
    programSwitcher: {
      label: "Chương trình",
      choose: "Chọn chương trình thi",
    },
  },

  status: {
    building: "Đang xây dựng",
    soon: "Sắp ra mắt",
    open: "Đang mở",
  },

  common: {
    plannedHeading: "Sẽ có trên trang này",
    exploreHeading: "Khám phá",
    backToProgram: (program: string) => `Về tổng quan ${program}`,
  },

  skills: {
    nghe: { name: "Nghe", ko: "듣기" },
    doc: { name: "Đọc", ko: "읽기" },
    viet: { name: "Viết", ko: "쓰기" },
  },

  examKinds: {
    full: {
      name: "Full test",
      summary: "Trọn bộ Nghe, Viết, Đọc theo đúng thời gian thi.",
    },
    mini: {
      name: "Mini test",
      summary: "Chỉ một kỹ năng, làm gọn trong một buổi.",
    },
    hard: {
      name: "Hard test",
      summary: "Đề nâng độ khó cho người nhắm cấp 5–6.",
    },
    ibt: {
      name: "IBT",
      summary: "Giao diện thi trên máy, gõ Hangul trực tiếp.",
    },
  },

  landing: {
    title: "Học TOPIK như có người thầy bên cạnh",
    lead: (program: string) =>
      `Topikly là nơi luyện thi ${program} dành riêng cho người Việt: lời giải bằng tiếng Việt, phân tích cả phương án nhiễu, và chẩn đoán điểm yếu theo từng dạng câu.`,
    ctaProgram: (program: string) => `Vào ${program}`,
    ctaTry: "Làm thử, không cần tài khoản",
    valuesHeading: "Vì sao khác",
    values: [
      {
        title: "Lời giải đến từng phương án nhiễu",
        body: "Biết vì sao đáp án đúng, và vì sao ba đáp án còn lại sai.",
      },
      {
        title: "Chẩn đoán theo dạng câu",
        body: "Không chỉ “Đọc 42–50”, mà chỉ ra bạn yếu ở thái độ tác giả hay chèn câu.",
      },
      {
        title: "Viết với 원고지 và rubric 3 tiêu chí",
        body: "Đếm ký tự, kiểm tra văn phong và nhận bản sửa theo đúng tiêu chí chấm.",
      },
      {
        title: "Hán-Hàn theo hình vị",
        body: "경제 là “kinh tế”: học một âm tiết, mở ra cả họ từ, kèm cảnh báo bạn giả.",
      },
    ],
    pillarsHeading: "Năm trụ học tập",
    guestNote:
      "Dùng thử không cần tài khoản. Tiến độ lưu tạm trên máy và chuyển lên tài khoản khi bạn đăng ký.",
  },

  pillarSummaries: {
    theory: "Từ vựng, ngữ pháp, Hán-Việt và chiến lược cho từng dạng câu.",
    roadmap: "Test trình độ, cấp mục tiêu, nhiệm vụ mỗi ngày.",
    practice: "Luyện Nghe, Đọc, Viết theo từng dạng câu.",
    exams: "Full, Mini, Hard test và chế độ IBT.",
    upgrade: "Mở khoá phân tích sâu, chấm Viết AI và học offline.",
  },

  programOverview: {
    title: (program: string) => `Tổng quan ${program}`,
    description: (program: string) =>
      `Điểm bắt đầu cho hành trình ${program}: chọn một trụ bên dưới để học, lên kế hoạch, luyện tập hoặc thi thử.`,
  },

  comingSoon: {
    title: (program: string) => `${program} sắp ra mắt`,
    description: (program: string) =>
      `Chúng tôi đang chuẩn bị nội dung cho ${program}. Trong lúc chờ, bạn có thể bắt đầu với chương trình đang mở.`,
    cta: (program: string) => `Sang ${program}`,
  },

  theory: {
    title: "Lý thuyết",
    description: "Từ vựng, ngữ pháp và chiến lược làm bài, sắp xếp theo cấp và theo dạng câu.",
    planned: [
      "Từ vựng theo cấp 3–6 và theo chủ đề, đánh dấu đã thuộc / chưa thuộc, flashcard SRS.",
      "Hán-Việt theo hình vị: bấm một âm tiết để xem mọi từ chứa Hán tự đó, cảnh báo bạn giả.",
      "Ngữ pháp theo cấp và theo chức năng, bảng so sánh các điểm ngữ pháp gần nghĩa.",
      "Chiến lược làm bài cho từng dạng câu.",
    ],
  },

  roadmap: {
    title: "Lộ trình",
    description:
      "Từ test trình độ đến kế hoạch từng ngày, bám theo cấp mục tiêu và ngày thi của bạn.",
    planned: [
      "Test trình độ ngắn (khoảng 10 phút) để gợi ý cấp xuất phát.",
      "Nhập ngày thi, cấp mục tiêu và số phút học mỗi ngày để nhận kế hoạch theo ngày.",
      "Mở khoá tuần tự, chuỗi ngày học (streak) và nhắc học.",
      "Tự điều chỉnh khi bỏ lỡ ngày học hoặc điểm Mini test thấp.",
    ],
  },

  practice: {
    title: "Luyện tập",
    description:
      "Luyện theo từng dạng câu của Nghe, Đọc, Viết, có lời giải tiếng Việt cho mọi phương án.",
    planned: [
      "Thẻ dạng bài: số câu đúng, tỉ lệ đúng và kỹ năng con còn yếu.",
      "Lời giải cho đáp án đúng và cho từng phương án nhiễu.",
      "Trình phát audio: chế độ thi (phát một lần) và chế độ luyện (tua, đổi tốc độ, transcript).",
      "Viết: trình soạn 원고지, đếm ký tự, kiểm tra văn phong và chấm theo rubric.",
    ],
    skillHeading: "Chọn kỹ năng",
  },

  practiceSkill: {
    title: (skill: string) => `Luyện ${skill}`,
    description: (skill: string) =>
      `Các dạng câu của phần ${skill}. Mỗi dạng có thẻ thống kê riêng để bạn biết nên luyện gì tiếp.`,
    planned: [
      "Danh sách thẻ dạng câu cho kỹ năng này, kèm tỉ lệ đúng của bạn.",
      "Gợi ý dạng câu nên luyện tiếp dựa trên kỹ năng con yếu nhất.",
    ],
    sampleTypeHeading: "Ví dụ một dạng câu",
    typesHeading: "Chọn dạng câu",
    typeListLabel: (skill: string) => `Các dạng câu phần ${skill}`,
    questionCount: (n: number) => `${n} câu`,
    groupLabel: (group: string) => `Nhóm ${group}`,
    empty: "Chưa có dạng câu nào để luyện ở phần này. Bạn quay lại sau nhé.",
    guestNote:
      "Chế độ khách: thống kê trên thẻ được lưu tạm trên thiết bị này và chuyển lên tài khoản khi bạn đăng ký.",
  },

  guestStats: {
    notDone: "Chưa làm",
    loading: "Đang tải thống kê",
    summary: (correct: number, attempted: number, ratePercent: number) =>
      `Đúng ${correct}/${attempted} câu · ${ratePercent}%`,
    progress: (attempted: number, total: number) => `Đã làm ${attempted}/${total} câu`,
  },

  practiceType: {
    title: (code: string) => `Dạng ${code}`,
    description: (skill: string) =>
      `Luyện từng câu thuộc dạng này trong phần ${skill}, xem lời giải ngay sau mỗi câu.`,
    planned: [
      "Trình làm bài trắc nghiệm: đoạn văn, bảng, hình, chọn đáp án và đánh dấu câu cần xem lại.",
      "Lời giải tiếng Việt, kèm ghi chú vì sao từng phương án nhiễu sai.",
      "Làm thử không cần đăng nhập, tiến độ lưu tạm trên máy.",
    ],
    pageTitle: (code: string, name: string) => `${code} · ${name}`,
    backToSkill: (skill: string) => `Về danh sách dạng câu ${skill}`,
  },

  runner: {
    regionLabel: "Trình làm bài",
    questionOf: (n: number, total: number) => `Câu ${n}/${total}`,
    questionNav: "Danh sách câu",
    gotoQuestion: (n: number, status: string) => `Câu ${n}${status ? `, ${status}` : ""}`,
    statusDone: "đã làm",
    statusCorrect: "đã làm, đúng",
    statusWrong: "đã làm, sai",
    statusMarked: "đã đánh dấu",
    prev: "Câu trước",
    next: "Câu sau",
    choicesLabel: "Chọn đáp án",
    choiceHint: "Dùng phím mũi tên hoặc phím 1 đến 4 để chọn đáp án.",
    submit: "Nộp bài",
    submitting: "Đang chấm…",
    mark: "Đánh dấu",
    markHelp: "Đánh dấu câu để xem lại sau",
    retry: "Làm lại",
    showExplanation: "Xem lời giải",
    loadingExplanation: "Đang tải lời giải…",
    timerLabel: "Thời gian làm câu",
    pause: "Tạm dừng đồng hồ",
    emptyConfirmTitle: "Bạn chưa chọn đáp án.",
    emptyConfirmBody: "Nộp bài trống sẽ tính là sai và hiện lời giải.",
    emptyConfirmYes: "Vẫn nộp",
    emptyConfirmNo: "Quay lại chọn",
    guestSaved: "Kết quả được lưu tạm trên thiết bị này (chế độ khách).",
    guestUnsaved: "Không lưu được tiến độ trên thiết bị này (có thể do chế độ riêng tư).",
    errors: {
      network: "Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.",
      server: "Máy chủ chưa xử lý được yêu cầu. Bạn thử lại sau ít phút nhé.",
      retry: "Thử lại",
    },
    restored: {
      correct: "Bạn đã làm câu này và trả lời đúng.",
      wrong: "Bạn đã làm câu này và trả lời sai.",
      blank: "Bạn đã nộp câu này để trống.",
      yourChoice: (label: string) => `Lựa chọn lần trước của bạn: ${label}.`,
    },
  },

  material: {
    passage: "Ngữ liệu",
    insertSentence: "<보기>",
    insertSentenceHint: "Câu cần chèn vào đoạn văn",
    transcript: "Lời thoại",
    transcriptNoAudio: "Chế độ luyện: chưa có audio, đọc lời thoại.",
    transcriptToggle: "Xem lời thoại",
    imagePending: "Tranh minh hoạ đang được vẽ — mô tả:",
    chartFictional: "Số liệu giả định, chỉ dùng để luyện tập.",
    chart: {
      unit: "단위",
      series: "Nhóm",
      point: "Mục",
      scrollHint: "Cuộn ngang để xem đủ",
      barLabel: "Biểu đồ cột",
      lineLabel: "Biểu đồ đường",
      pieLabel: "Biểu đồ tròn",
      tableLabel: "Bảng số liệu",
    },
  },

  result: {
    regionLabel: "Kết quả câu hỏi",
    correct: "Đúng",
    wrong: "Sai",
    blank: "Bỏ trống",
    correctAnswerIs: (label: string) => `Đáp án đúng là ${label}.`,
    yourChoice: (label: string) => `Bạn chọn ${label}.`,
    blankChoice: "Bạn chưa chọn đáp án nào.",
    explanation: "Lời giải",
    choicesExplanation: "Phân tích từng phương án",
    translation: "Bản dịch lời thoại",
    correctBadge: "Đáp án đúng",
    yourWrongBadge: "Bạn chọn, sai",
    yourCorrectBadge: "Bạn chọn, đúng",
    trap: "Kiểu bẫy",
  },

  exams: {
    title: "Đề thi",
    description: "Thi thử trong điều kiện gần thật: Full test, Mini test, Hard test và chế độ IBT.",
    planned: [
      "Kết quả có điểm từng phần và quy đổi cấp.",
      "Tỉ lệ đúng theo dạng câu và kỹ năng con, danh sách câu sai để làm lại.",
      "Chế độ thi: audio phát đúng một lần, không tua, đáp án chỉ hiện sau khi nộp.",
    ],
    kindHeading: "Chọn loại đề",
  },

  examKind: {
    title: (kind: string) => `Đề thi ${kind}`,
    planned: ["Danh sách đề thuộc loại này, kèm trạng thái đã làm và điểm gần nhất."],
    sampleHeading: "Ví dụ một đề",
    examLabel: (id: string) => `Đề ${id}`,
  },

  exam: {
    title: (kind: string, id: string) => `${kind} · Đề ${id}`,
    description: (kind: string) =>
      `Trình làm bài thi ${kind} sẽ nằm ở đây, mô phỏng đúng thời gian và quy chế phòng thi.`,
    planned: [
      "Đồng hồ đếm ngược theo từng phần thi.",
      "Không lộ đáp án trước khi nộp bài.",
      "Audio phát đúng một lần, không tua.",
    ],
  },

  upgrade: {
    title: "Nâng cấp",
    description: "Mở khoá toàn bộ ngân hàng đề, lời giải phân tích sâu và chấm Viết bằng AI.",
    planned: [
      "So sánh gói miễn phí và Premium.",
      "Thanh toán nội địa (VNPay, MoMo).",
      "Quyền lợi theo gói, đồng bộ nhiều thiết bị và học offline.",
    ],
    note: "Nội dung học không bị popup quảng cáo che, dù bạn dùng gói nào.",
  },

  blog: {
    title: "Blog và tài liệu",
    description: "Kinh nghiệm thi, từ vựng, ngữ pháp và tin tức về kỳ thi TOPIK.",
    planned: [
      "Kinh nghiệm ôn thi và phân tích cấu trúc đề.",
      "Bài viết từ vựng, ngữ pháp theo chủ đề.",
      "Thông báo mới về kỳ thi.",
    ],
  },

  account: {
    title: "Tài khoản",
    description: "Tiến độ học, sổ từ, câu sai và lịch sử bài Viết của bạn.",
    planned: [
      "Đăng nhập bằng Google hoặc email.",
      "Chuyển tiến độ làm thử trên máy lên tài khoản khi đăng ký.",
      "Tiến độ, sổ từ, câu sai cần làm lại và lịch sử bài Viết.",
    ],
    guestNote: "Bạn đang dùng chế độ khách: tiến độ được lưu tạm trên thiết bị này.",
  },

  notFound: {
    title: "Không tìm thấy trang",
    description: "Đường dẫn này không tồn tại hoặc đã được chuyển đi.",
    home: "Về trang chủ",
  },
};

export type Messages = typeof vi;
