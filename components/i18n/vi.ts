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
    /** Các mục chưa có, hiện ở hub Lý thuyết dưới dạng "sắp có". */
    planned: [
      "Flashcard SRS: ôn từ vựng theo lịch nhớ thông minh, thêm từ ngay từ đoạn văn đang đọc.",
      "Chiến lược làm bài cho từng dạng câu.",
    ],
    learnHeading: "Học ngay",
    comingHeading: "Sắp có",
    sections: {
      vocab: {
        title: "Từ vựng",
        summary: (n: number) =>
          `${n} từ theo cấp, chủ đề và từ loại. Đánh dấu đã thuộc ngay trên máy.`,
      },
      hanja: {
        title: "Hán tự",
        summary: (n: number) => `${n} chữ Hán: bấm một chữ để xem mọi từ chứa nó, kèm âm Hán-Việt.`,
      },
      grammar: {
        title: "Ngữ pháp",
        summary: (n: number, groups: number) =>
          `${n} điểm ngữ pháp theo cấp và chức năng, ${groups} nhóm so sánh các mẫu gần nghĩa.`,
      },
      falseFriends: {
        title: "Bạn giả Hán-Việt",
        summary: (n: number) =>
          `${n} từ nghe giống Hán-Việt nhưng nghĩa khác hoặc chỉ trùng một phần.`,
      },
    },
    search: {
      heading: "Tìm từ vựng và ngữ pháp",
      label: "Tìm theo hangul, 한자, âm Hán-Việt hoặc nghĩa tiếng Việt",
      placeholder: "Ví dụ: kinh tế, 경제, -느라고",
      searching: "Đang tìm…",
      empty: "Không tìm thấy kết quả nào.",
      error: "Không tìm được lúc này. Kiểm tra mạng rồi thử lại.",
      vocabHeading: "Từ vựng",
      grammarHeading: "Ngữ pháp",
      resultCount: (vocab: number, grammar: number) =>
        `Tìm thấy ${vocab} từ vựng và ${grammar} điểm ngữ pháp.`,
    },
    sourcesLink: "Nguồn và ghi công",
    footerNote: "Nội dung do Topikly tự biên soạn.",
    backToTheory: "Về Lý thuyết",
  },

  lexicon: {
    reviewPending: "Nội dung đang chờ duyệt",
    reviewPendingList: (n: number) =>
      `${n} mục trong danh sách này đang chờ duyệt nội dung: nghĩa, ví dụ và cấp độ có thể còn được chỉnh sửa.`,
    reviewPendingDetail:
      "Mục này đang chờ duyệt nội dung: nghĩa, ví dụ và cấp độ có thể còn được chỉnh sửa.",
    levelLabel: (level: number) => `Cấp ${level}`,
  },

  known: {
    toggleLabel: (hangul: string) => `Đánh dấu đã thuộc: ${hangul}`,
    known: "Đã thuộc",
    unknown: "Chưa thuộc",
    progress: (known: number, total: number) => `Đã thuộc ${known}/${total} từ`,
    progressLabel: "Tiến độ đã thuộc",
    guestNote:
      "Chế độ khách: đánh dấu đã thuộc được lưu trên thiết bị này và chuyển lên tài khoản khi bạn đăng ký.",
    notPersisted:
      "Không lưu được trên thiết bị này (có thể do chế độ riêng tư): đánh dấu chỉ còn trong lần mở trang này.",
  },

  vocab: {
    title: "Từ vựng",
    description:
      "Từ vựng TOPIK II theo cấp, chủ đề và từ loại. Từ gốc Hán có âm Hán-Việt và cây hình vị để học cả họ từ.",
    listLabel: "Danh sách từ vựng",
    filterHeading: "Bộ lọc",
    filters: {
      level: "Cấp",
      levelAll: "Tất cả",
      topic: "Chủ đề",
      topicAll: "Tất cả chủ đề",
      pos: "Từ loại",
      posAll: "Tất cả từ loại",
      falseFriend: (n: number) => `Chỉ bạn giả Hán-Việt (${n})`,
      status: "Trạng thái",
      statusAll: "Tất cả",
      statusUnknown: "Chưa thuộc",
      statusKnown: "Đã thuộc",
      search: "Tìm trong danh sách",
      searchPlaceholder: "Hangul, 한자, âm Hán-Việt hoặc nghĩa",
      clear: "Xóa bộ lọc",
      levelOption: (label: string, count: number) => `${label} (${count})`,
      facetOption: (name: string, count: number) => `${name} (${count})`,
    },
    result: (shown: number, total: number) => `Hiển thị ${shown}/${total} từ`,
    empty: "Không có từ nào khớp bộ lọc.",
    showMore: (n: number) => `Hiện thêm ${n} từ`,
    falseFriendShort: "Bạn giả",
    hanVietLabel: "Âm Hán-Việt",
  },

  vocabDetail: {
    pageTitle: (hangul: string) => `${hangul} · Từ vựng`,
    backToList: "Về danh sách từ vựng",
    meaningHeading: "Nghĩa",
    exampleHeading: "Ví dụ",
    collocationsHeading: "Cụm hay đi cùng",
    noteHeading: "Ghi chú",
    hanVietLine: (hanVietText: string) => `Âm Hán-Việt: ${hanVietText}`,
    pureKorean: "Từ thuần Hàn, không có chữ Hán nên không có cây hình vị.",
    morpheme: {
      heading: "Cây hình vị Hán-Hàn",
      hint: "Bấm một âm tiết để xem các từ khác chứa cùng chữ Hán.",
      tabsLabel: "Các chữ Hán trong từ",
      tab: (ko: string, hanja: string, hv: string) => `${ko} ${hanja} ${hv}`,
      altHv: (list: string) => `Âm Hán-Việt khác của chữ này: ${list}`,
      familyHeading: (hanja: string) => `Các từ khác chứa ${hanja}`,
      familyEmpty: "Chưa có từ nào khác trong kho chứa chữ Hán này.",
      familyWordSound: (ko: string, hv: string) => `${ko} · ${hv}`,
      viewHanja: (hanja: string) => `Xem trang chữ ${hanja}`,
    },
    falseFriend: {
      full: "Bạn giả hoàn toàn",
      partial: "Bạn giả một phần",
      fullBody: "Từ Hán-Việt tương ứng không trùng nghĩa nào. Đừng dịch thẳng từ âm Hán-Việt.",
      partialBody:
        "Từ Hán-Việt tương ứng chỉ trùng một phần nghĩa. Cẩn thận khi dùng theo phản xạ tiếng Việt.",
      viMeaning: (hv: string) => `Trong tiếng Việt, “${hv}” nghĩa là`,
      noteHeading: "Cần nhớ",
    },
  },

  hanja: {
    title: "Hán tự",
    description:
      "Mỗi chữ Hán là một hình vị. Học một chữ để mở ra cả họ từ gốc Hán trong tiếng Hàn.",
    listLabel: "Danh sách chữ Hán",
    wordCount: (n: number) => `${n} từ`,
    itemLabel: (hanja: string, readings: string, count: number) =>
      `${hanja}, ${readings}, ${count} từ`,
    pageTitle: (hanja: string) => `Chữ ${hanja}`,
    pageDescription: (hanja: string, readings: string) =>
      `Chữ Hán ${hanja}: ${readings}. Các từ gốc Hán chứa chữ này.`,
    readingsHeading: "Cách đọc",
    reading: (ko: string, hv: string) => `${ko} · ${hv}`,
    wordsHeading: (hanja: string) => `Các từ chứa ${hanja}`,
    meaningLine: (meaning: string) => `Nghĩa gốc: ${meaning}`,
    altHv: (list: string) => `Âm Hán-Việt khác: ${list}`,
    backToList: "Về danh sách Hán tự",
  },

  grammar: {
    title: "Ngữ pháp",
    description:
      "Điểm ngữ pháp TOPIK II theo cấp và chức năng, kèm nhóm so sánh các mẫu gần nghĩa dễ nhầm.",
    listLabel: "Danh sách điểm ngữ pháp",
    filterHeading: "Bộ lọc",
    filters: {
      level: "Cấp",
      levelAll: "Tất cả",
      function: "Chức năng",
      functionAll: "Tất cả chức năng",
      group: "Nhóm so sánh",
      groupAll: "Tất cả",
      search: "Tìm trong danh sách",
      searchPlaceholder: "Mẫu câu hoặc nghĩa tiếng Việt",
      clear: "Xóa bộ lọc",
    },
    result: (shown: number, total: number) => `Hiển thị ${shown}/${total} điểm ngữ pháp`,
    empty: "Không có điểm ngữ pháp nào khớp bộ lọc.",
    groupsHeading: "Nhóm so sánh các mẫu gần nghĩa",
    groupsHint: "Mở bảng so sánh để chọn đúng mẫu theo văn phong, chủ ngữ và vế sau.",
    groupsListLabel: "Các nhóm so sánh ngữ pháp",
    groupMeta: (count: number, fn: string) => `${count} mẫu · ${fn}`,
    inGroup: "Thuộc nhóm so sánh",
  },

  grammarDetail: {
    pageTitle: (pattern: string) => `${pattern} · Ngữ pháp`,
    backToList: "Về danh sách ngữ pháp",
    variants: "Biến thể",
    meaningHeading: "Nghĩa",
    formHeading: "Cách chia",
    hostNames: {
      V: "Động từ",
      A: "Tính từ",
      N: "Danh từ",
      "V/A": "Động từ và tính từ",
    },
    constraintsHeading: "Ràng buộc khi dùng",
    constraintLabels: {
      register: "Văn phong",
      polarity: "Sắc thái vế sau",
      subject: "Chủ ngữ",
      tense: "Thì",
      mainClause: "Vế sau",
      other: "Lưu ý khác",
    },
    register: { spoken: "Khẩu ngữ", written: "Văn viết", both: "Dùng được cả nói và viết" },
    polarity: {
      any: "Không giới hạn sắc thái",
      negative: "Thường dẫn tới kết quả không tốt",
      positive: "Thường dẫn tới kết quả tốt",
    },
    bodyHeading: "Giải thích",
    examplesHeading: "Ví dụ",
    nonExamplesHeading: "Câu sai thường gặp",
    wrongBadge: "Câu sai",
    fixLabel: "Sửa thành",
    mistakesHeading: "Lỗi người Việt hay mắc",
    relatedHeading: "Điểm ngữ pháp liên quan",
    groupHeading: "Thuộc nhóm so sánh",
    viewGroup: "Xem bảng so sánh cả nhóm",
  },

  compare: {
    pageTitle: (title: string) => `${title} · So sánh ngữ pháp`,
    backToGrammar: "Về danh sách ngữ pháp",
    summaryHeading: "Điểm chung và điểm khác",
    membersHeading: "Các mẫu trong nhóm",
    tableHeading: "Bảng so sánh",
    tableLabel: (title: string) => `Bảng so sánh: ${title}`,
    scrollHint: "Cuộn ngang để xem đủ các cột",
    criterionColumn: "Tiêu chí",
    contrastHeading: "Cùng một tình huống, mỗi mẫu dùng ra sao",
    situation: "Tình huống",
    okBadge: "Đúng",
    notOkBadge: "Sai",
    tipsHeading: "Mẹo chọn đúng mẫu",
    trapsHeading: "Bẫy hay gặp trong đề TOPIK",
    memberMeta: (level: number) => `Cấp ${level}`,
  },

  sources: {
    title: "Nguồn và ghi công",
    description:
      "Từ vựng, Hán tự và ngữ pháp trên Topikly tham chiếu những nguồn nào, dùng ra sao và còn gì chưa chốt.",
    attributionHeading: "Ghi công",
    attribution:
      "Cấp độ tham chiếu: 국제통용 한국어 표준 교육과정 (국립국어원). Từ điển tham khảo: 한국어기초사전 (국립국어원), 표준국어대사전 (국립국어원). Nội dung giải nghĩa, ví dụ do Topikly tự biên soạn.",
    howHeading: "Chúng tôi dùng các nguồn này như thế nào",
    how: [
      "Chỉ để đối chiếu: một từ có thuộc cấp này không, chữ Hán (원어) nào, từ loại gì. Topikly không nhập hàng loạt danh sách hay định nghĩa của nguồn nào.",
      "Nghĩa tiếng Việt, ví dụ, ghi chú, giải thích ngữ pháp và bảng so sánh do Topikly tự biên soạn. Ví dụ tự đặt, không chép từ từ điển hay sách.",
      "Không dùng hình ảnh, âm thanh, phát âm của các từ điển nêu trên, và không dùng danh sách từ vựng, ngữ pháp của sách luyện thi hay nền tảng thương mại.",
      "Âm Hán-Việt theo từ điển Hán-Việt phổ biến và cách dùng thực tế trong tiếng Việt.",
    ],
    sourcesHeading: "Các nguồn tham chiếu",
    sourcesListLabel: "Danh sách nguồn tham chiếu",
    sourceItems: [
      {
        name: "국제통용 한국어 표준 교육과정",
        org: "국립국어원",
        use: "Tham chiếu cấp độ (1급 đến 6급).",
      },
      {
        name: "한국어기초사전",
        org: "국립국어원",
        use: "Từ điển tham khảo: chữ Hán, từ loại.",
      },
      {
        name: "표준국어대사전",
        org: "국립국어원",
        use: "Từ điển tham khảo: chữ Hán, từ loại.",
      },
    ],
    statusHeading: "Tình trạng nội dung",
    status: [
      "Cấp độ của từng mục hiện do người soạn đánh giá, chưa đối chiếu chính thức với danh sách của nguồn nào.",
      "Các mục mang nhãn “Nội dung đang chờ duyệt” chưa được người duyệt xác nhận cuối. Nghĩa, ví dụ và cấp độ có thể còn được chỉnh sửa.",
      "Điều khoản sử dụng của các nguồn tham chiếu đang được xác nhận. Trang này sẽ được cập nhật khi có kết luận.",
    ],
  },

  roadmap: {
    title: "Lộ trình",
    description:
      "Từ test trình độ đến kế hoạch từng ngày, bám theo cấp mục tiêu và ngày thi của bạn.",
    planned: [
      "Nhập ngày thi, cấp mục tiêu và số phút học mỗi ngày để nhận kế hoạch theo ngày.",
      "Mở khoá tuần tự, chuỗi ngày học (streak) và nhắc học.",
      "Tự điều chỉnh khi bỏ lỡ ngày học hoặc điểm Mini test thấp.",
    ],
  },

  placement: {
    title: "Test trình độ",
    description:
      "Làm một bài Đọc ngắn từ dễ đến khó để biết nên bắt đầu học từ cấp nào. Không cần đăng nhập.",
    unavailableTitle: "Test trình độ đang được biên soạn",
    unavailable:
      "Bài test chưa sẵn sàng. Trong lúc chờ, bạn có thể luyện từng dạng câu hoặc làm Mini test để tự đánh giá.",
    unavailablePractice: "Đến trang Luyện tập",
    unavailableRoadmap: "Về Lộ trình",
    card: {
      summary: (questions: number, minutes: number) =>
        `Làm ${questions} câu Đọc trong ${minutes} phút để biết nên bắt đầu học từ cấp nào. Không cần đăng nhập.`,
      unavailable: "Bài test đang được biên soạn, sẽ mở sớm.",
      result: (estimated: string, start: string) =>
        `Trình độ ước lượng: ${estimated} · nên bắt đầu ở ${start}`,
      resultNote: "Ước lượng sơ bộ từ lần làm gần nhất, lưu tạm trên thiết bị này.",
      start: "Làm test ngay",
      retry: "Làm lại",
      retryLabel: "Làm lại Test trình độ",
    },
    intro: {
      note: "Các câu xếp từ dễ đến khó. Kết quả chỉ là ước lượng sơ bộ để gợi ý cấp bắt đầu, không phải điểm thi thật và có thể lệch so với trình độ thực.",
    },
    result: {
      heading: "Kết quả Test trình độ",
      estimatedLabel: "Trình độ ước lượng sơ bộ",
      startLabel: "Nên bắt đầu ở",
      belowLowest:
        "Bạn chưa vững bậc thấp nhất của bài test, nên Lộ trình sẽ bắt đầu từ cấp thấp nhất.",
      ruleWithRatio: (percent: number) =>
        `Một bậc được tính là vững khi bạn làm đúng từ ${percent}% số câu của bậc đó. Trình độ ước lượng là bậc cao nhất mà bạn vững, cùng với mọi bậc thấp hơn.`,
      ruleWithoutRatio:
        "Một bậc được tính là vững khi bạn làm đúng phần lớn số câu của bậc đó. Trình độ ước lượng là bậc cao nhất mà bạn vững, cùng với mọi bậc thấp hơn.",
      disclaimer:
        "Đây là ước lượng sơ bộ: mỗi bậc chỉ có vài câu nên kết quả có thể lệch khoảng một cấp. Dùng nó để gợi ý điểm xuất phát, không phải điểm thi thật.",
      bandsHeading: "Kết quả theo bậc độ khó",
      bandsHint: "Mỗi bậc ứng với cấp TOPIK mà các câu đó phân biệt.",
      bandColumns: { band: "Bậc", correct: "Đúng/tổng", ratio: "Tỉ lệ", status: "Kết quả" },
      band: (difficulty: number) => `${difficulty}급`,
      bandPassed: "Vững",
      bandFailed: "Chưa vững",
      ratioLabel: (percent: number) => `${percent}%`,
      weakHeading: "Kỹ năng nên luyện trước",
      weakHint: "Những kỹ năng con bạn còn sai, yếu nhất đứng trước.",
      weakEmpty: "Từ bài test này chưa có kỹ năng nào cần ưu tiên luyện thêm.",
      roadmapNote:
        "Lộ trình theo ngày sẽ dùng kết quả này để xếp nhiệm vụ cho bạn (sắp có). Kết quả được giữ trên thiết bị này.",
      reviewHidden:
        "Test trình độ không hiện đáp án và lời giải từng câu để lần làm lại vẫn đo đúng trình độ. Muốn xem lời giải, bạn luyện theo dạng ở mục Luyện tập.",
      retry: "Làm lại test",
      backToRoadmap: "Về Lộ trình",
    },
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

  writingSkill: {
    typesHeading: "Chọn dạng câu Viết",
    typeListLabel: "Các dạng câu phần Viết",
    guestNote:
      "Chế độ khách: bài viết nháp của bạn được lưu tạm trên thiết bị này. Phần Viết hiện chưa chấm tự động: bạn viết, rồi xem bài mẫu để tự so sánh.",
    charLimit: (min: number, max: number) => `${min}–${max} ký tự`,
    formatFillBlanks: "Điền vào chỗ trống",
    formatEssay: "Viết bài có giới hạn ký tự",
    promptCount: (n: number) => `${n} đề`,
    empty: "Chưa có dạng câu Viết nào để luyện. Bạn quay lại sau nhé.",
  },

  writing: {
    regionLabel: "Trình luyện Viết",
    promptNav: "Danh sách đề Viết",
    gotoPrompt: (n: number) => `Đề ${n}`,
    promptOf: (n: number, total: number) => `Đề ${n}/${total}`,
    difficulty: (level: number) => `Mức khó: cấp ${level}`,
    passageLabel: "Văn bản cần điền",
    taskLabel: "Nội dung đề",
    blankSrLabel: (label: string) => `Chỗ trống ${label}`,
    blanksLegend: "Điền vào chỗ trống",
    blanksHint: "Mỗi chỗ trống viết đúng một câu hoàn chỉnh, đúng văn phong của đoạn văn.",
    blankInputLabel: (label: string) => `Ô điền ${label}`,
    essayLabel: "Bài viết của bạn",
    essayHint:
      "Số ký tự tính cả khoảng trắng, không tính xuống dòng. Tự viết rồi mới xem bài mẫu sẽ nhớ lâu hơn.",
    essayPlaceholder: "Viết bài của bạn ở đây (bằng tiếng Hàn)…",
    showReveal: "Xem bài mẫu & tự so sánh",
    loadingReveal: "Đang tải bài mẫu…",
    hideReveal: "Ẩn bài mẫu",
    emptyBeforeReveal: "Bạn chưa viết gì. Nên tự viết trước khi xem bài mẫu, nhưng vẫn có thể xem.",
    clear: "Xóa bài viết",
    cleared: "Đã xóa bài viết nháp.",
    confirmClearTitle: "Xóa bài viết?",
    confirmClearBody: "Bản nháp trên thiết bị này cũng bị xóa và không khôi phục được.",
    confirmClearYes: "Xóa",
    confirmClearNo: "Giữ lại",
    draft: {
      idle: "Chế độ khách: bài viết tự lưu nháp trên thiết bị này.",
      restored: "Đã khôi phục bản nháp của bạn từ thiết bị này.",
      saved: "Đã lưu nháp trên thiết bị này.",
      failed:
        "Không lưu được nháp trên thiết bị này (có thể do chế độ riêng tư). Đừng tải lại trang.",
    },
    counter: {
      count: (n: number) => `${n} ký tự`,
      range: (min: number, max: number) => `Khung: ${min}–${max} ký tự`,
      status: {
        below: (min: number) => `Chưa đủ, cần ít nhất ${min} ký tự`,
        within: () => "Trong khung ký tự",
        above: (_min: number, max: number) => `Vượt quá ${max} ký tự`,
      },
    },
    errors: {
      network:
        "Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại. Bài viết của bạn vẫn được giữ.",
      server:
        "Máy chủ chưa tải được bài mẫu. Bài viết của bạn vẫn được giữ, hãy thử lại sau ít phút.",
      retry: "Thử lại",
    },
    reveal: {
      regionLabel: "Bài mẫu và tự so sánh",
      heading: "Bài mẫu & tự so sánh",
      selfCheckNote:
        "Phần Viết chưa được chấm tự động. Hãy đối chiếu bài của bạn với bài mẫu, tự đánh dấu các ý bắt buộc và đọc nhận xét theo ba tiêu chí chấm.",
      loaded: "Đã tải bài mẫu.",
      register: (name: string) => `Văn phong yêu cầu: ${name}.`,
      levelPicker: "Chọn cấp của bài mẫu",
      levelOption: (level: number) => `Cấp ${level}`,
      yourEssay: "Bài của bạn",
      yourEssayEmpty: "Bạn chưa viết gì.",
      modelEssay: (level: number) => `Bài mẫu cấp ${level}`,
      modelMeta: (chars: number, cells: number) => `${chars} ký tự · khoảng ${cells} ô 원고지`,
      modelCovers: "Bài mẫu có bao quát ý này.",
      checklistTitle: "Tự kiểm tra các ý bắt buộc",
      checklistHintData: "Đánh dấu những ý bài của bạn đã có, kèm số liệu đúng.",
      checklistHintQuestions: "Đánh dấu những câu hỏi gợi ý bài của bạn đã trả lời.",
      checklistProgress: (done: number, total: number) => `Bạn đã đánh dấu ${done}/${total} ý`,
      rubricTitle: (level: number) => `Nhận xét bài mẫu cấp ${level} theo 3 tiêu chí`,
      scoringTitle: "Điều kiện đạt mức cao / thấp",
      outlineTitle: "Dàn ý gợi ý",
      expressionsTitle: "Biểu hiện nên dùng",
      mistakesTitle: "Lỗi người Việt hay mắc ở đề này",
      explanationTitle: "Lời giải",
      blankTitle: (label: string) => `Chỗ trống ${label}`,
      yourAnswer: "Câu của bạn",
      yourAnswerEmpty: "Bạn chưa điền.",
      matchNote: {
        accepted: "Trùng một đáp án đạt điểm tối đa.",
        partial: "Trùng một đáp án đúng ý nhưng chưa trọn điểm. Xem lý do bên dưới.",
        rejected: "Trùng một đáp án sai. Xem lý do bên dưới.",
        unknown:
          "Không trùng đáp án nào trong danh sách. Đây chưa phải nhận xét sai: hãy đối chiếu với các yếu tố bắt buộc.",
        empty: "",
      },
      acceptedTitle: "Đáp án đạt điểm tối đa",
      partialTitle: "Đúng ý nhưng chưa trọn điểm",
      rejectedTitle: "Đáp án sai thường gặp",
      requiredElements: "Yếu tố bắt buộc để đạt điểm tối đa",
    },
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

  audio: {
    playerLabel: "Trình phát audio",
    play: "Phát",
    pause: "Tạm dừng",
    replay: "Phát lại từ đầu",
    back5: "Lùi 5 giây",
    forward5: "Tiến 5 giây",
    back5Short: "-5s",
    forward5Short: "+5s",
    seekLabel: "Thanh tua audio",
    seekValue: (current: string, total: string) => `${current} trên ${total}`,
    timeLabel: "Thời gian đã phát",
    speedLabel: "Tốc độ phát",
    speedOption: (rate: number) => `${rate}×`,
    statusIdle: "Sẵn sàng phát.",
    statusPlaying: "Đang phát.",
    statusPaused: "Đã tạm dừng.",
    statusEnded: "Đã phát xong.",
    transcriptShow: "Xem lời thoại",
    transcriptHide: "Ẩn lời thoại",
    showTranslation: "Hiện bản dịch tiếng Việt",
    loadError: "Không tải được audio.",
    loadErrorPractice: "Không tải được audio. Bạn có thể đọc lời thoại bên dưới.",
    loadErrorExam:
      "Không tải được audio. Kiểm tra kết nối rồi thử lại; lượt nghe của bạn chưa bị tính.",
    retry: "Thử lại",
    exam: {
      play: "Phát",
      playing: "Đang phát…",
      played: "Đã phát xong",
      notice: "Chế độ thi: audio chỉ phát một lần, không tạm dừng, không tua.",
      progressLabel: "Tiến trình audio",
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
    listHeading: "Chọn đề",
    listLabel: (kind: string) => `Danh sách đề ${kind}`,
    comingSoon:
      "Loại đề này đang được biên soạn. Trong lúc chờ, bạn có thể luyện từng dạng câu hoặc làm Mini test.",
    guestNote:
      "Chế độ khách: bài làm dở và điểm các lần làm được lưu tạm trên thiết bị này, chuyển lên tài khoản khi bạn đăng ký.",
  },

  examCard: {
    sampleBadge: "Đề mẫu",
    sampleNote: "Đề mẫu đang chờ duyệt nội dung, dùng để thử trình làm bài.",
    questionCount: (n: number) => `${n} câu`,
    minutes: (n: number) => `${n} phút`,
    skillNames: { reading: "Đọc", listening: "Nghe" },
    statusNew: "Chưa làm",
    statusDraft: "Đang làm dở",
    statusLatest: (score: number, max: number, level: string, estimate: boolean) =>
      `Lần gần nhất: ${score}/${max} · ${level}${estimate ? " (ước lượng)" : ""}`,
    attempts: (n: number) => `${n} lần làm`,
  },

  exam: {
    title: (kind: string, title: string) => `${kind} · ${title}`,
    regionLabel: "Trình làm đề thi",
  },

  examIntro: {
    heading: "Trước khi bắt đầu",
    summary: (questions: number, minutes: number) => `${questions} câu · ${minutes} phút`,
    sectionLine: (skill: string, questions: number, minutes: number) =>
      `${skill}: ${questions} câu, ${minutes} phút`,
    rulesHeading: "Quy chế làm bài",
    rules: {
      timer: (minutes: number) =>
        `Thời gian làm bài là ${minutes} phút. Đồng hồ chạy ngay khi bạn bấm Bắt đầu và vẫn chạy nếu bạn tải lại trang.`,
      autoSubmit: "Hết giờ, bài được tự động nộp với những câu bạn đã chọn.",
      noAnswers:
        "Đáp án và lời giải chỉ hiện sau khi nộp bài. Bạn có thể đổi hoặc bỏ chọn đáp án và đánh dấu câu để xem lại bất cứ lúc nào trước khi nộp.",
      blank: "Mỗi câu chỉ có một đáp án đúng. Câu bỏ trống tính là sai, không bị trừ điểm.",
      guest: "Tiến độ làm dở được lưu tạm trên thiết bị này, không cần tài khoản.",
    },
    estimateNote:
      "Mini test chỉ có một kỹ năng nên cấp hiển thị ở kết quả là ước lượng, quy đổi lên thang điểm tổng.",
    start: "Bắt đầu làm bài",
    loading: "Đang kiểm tra bài làm dở…",
    lastResult: "Kết quả lần gần nhất",
    viewLastResult: "Xem kết quả lần gần nhất",
  },

  examRun: {
    timerLabel: "Thời gian còn lại",
    progress: (done: number, total: number) => `Đã làm ${done}/${total}`,
    progressLabel: (done: number, total: number) => `Đã làm ${done} trên ${total} câu`,
    submit: "Nộp bài",
    submitting: "Đang nộp bài…",
    navToggle: "Bảng câu hỏi",
    navLabel: "Bảng số câu",
    gotoQuestion: (n: number, status: string) => `Câu ${n}${status ? `, ${status}` : ""}`,
    statusAnswered: "đã làm",
    statusUnanswered: "chưa làm",
    statusMarked: "đã đánh dấu",
    statusCurrent: "đang xem",
    legendAnswered: "Đã làm",
    legendUnanswered: "Chưa làm",
    legendMarked: "Đánh dấu",
    blockHeading: (first: number, last: number) =>
      first === last ? `Câu ${first}` : `Câu ${first}–${last}`,
    sectionPrefix: (skill: string) => `Phần ${skill}`,
    questionHeading: (n: number) => `Câu ${n}`,
    choicesLabel: (n: number) => `Câu ${n}: chọn đáp án`,
    choiceHint: "Dùng phím mũi tên hoặc phím 1 đến 4 để chọn đáp án của câu đang xem.",
    clear: "Bỏ chọn",
    mark: "Đánh dấu",
    unmark: "Bỏ đánh dấu",
    markHelp: "Đánh dấu câu để xem lại trước khi nộp",
    prevBlock: "Nhóm câu trước",
    nextBlock: "Nhóm câu sau",
    warn5: "Còn 5 phút. Hãy kiểm tra lại các câu chưa làm.",
    warn1: "Chỉ còn 1 phút. Bài sẽ tự động nộp khi hết giờ.",
    timeUp: "Đã hết giờ, đang nộp bài…",
    timeUpFailed: "Đã hết giờ nhưng chưa nộp được bài. Bài làm của bạn vẫn được giữ.",
    resumed: "Đã khôi phục bài làm dở. Đồng hồ vẫn tính từ lúc bạn bắt đầu.",
    saveFailed:
      "Không lưu tạm được bài làm trên thiết bị này (có thể do chế độ riêng tư). Đừng tải lại trang.",
    confirm: {
      title: "Nộp bài?",
      blank: (n: number) => `Còn ${n} câu bỏ trống, sẽ tính là sai.`,
      allAnswered: "Bạn đã chọn đáp án cho tất cả các câu.",
      marked: (n: number) => `Bạn đang đánh dấu ${n} câu để xem lại.`,
      final: "Sau khi nộp bạn không thể sửa đáp án.",
      back: "Quay lại làm bài",
      yes: "Nộp bài",
    },
    errors: {
      network:
        "Không kết nối được tới máy chủ. Bài làm của bạn vẫn được giữ, hãy kiểm tra mạng rồi thử lại.",
      server: "Máy chủ chưa chấm được bài. Bài làm của bạn vẫn được giữ, hãy thử lại sau ít phút.",
      retry: "Thử lại nộp bài",
    },
  },

  examResult: {
    heading: "Kết quả bài làm",
    scoreLabel: "Điểm",
    scoreOf: (score: number, max: number) => `${score}/${max}`,
    levelLabel: "Cấp",
    estimate: "ước lượng",
    estimateNote: (compared: number, max: number) =>
      `Cấp chỉ là ước lượng: điểm phần Đọc được quy đổi lên thang tổng, tương đương ${compared}/${max} điểm.`,
    notEstimate: (compared: number, max: number) => `Tổng điểm so ngưỡng cấp: ${compared}/${max}.`,
    nextLevel: (points: number, max: number, label: string) =>
      `Cần thêm ${points} điểm (thang ${max}) để lên ${label}.`,
    topLevel: "Bạn đã ở cấp cao nhất.",
    timeSpent: (clock: string) => `Thời gian làm bài: ${clock}`,
    timedOut: "Bài được tự động nộp vì hết giờ.",
    sectionsHeading: "Kết quả theo phần",
    sectionColumns: { skill: "Phần", correct: "Đúng/tổng", blank: "Bỏ trống", score: "Điểm" },
    groupHeading: "Theo nhóm dạng câu",
    groupHint: "Chọn nhóm dạng còn yếu để luyện tiếp.",
    group: (code: string) => `Nhóm ${code}`,
    ratio: (correct: number, total: number, percent: number) =>
      `${correct}/${total} câu · ${percent}%`,
    practiceType: "Luyện dạng này",
    practiceTypeLabel: (name: string) => `Luyện dạng này: ${name}`,
    noPractice: "Chưa có câu luyện cho nhóm này",
    subskillHeading: "Theo kỹ năng con",
    subskillHint: "Sắp xếp từ kỹ năng yếu nhất.",
    reviewHeading: "Xem lại từng câu",
    filterLabel: "Lọc câu",
    filterAll: "Tất cả",
    filterWrong: "Sai",
    filterBlank: "Bỏ trống",
    filterCount: (label: string, n: number) => `${label} (${n})`,
    filterEmpty: "Không có câu nào trong mục này.",
    reviewItem: (n: number, code: string) => `Câu ${n} · ${code}`,
    verdict: { correct: "Đúng", wrong: "Sai", blank: "Bỏ trống" },
    yourAnswer: (label: string) => `Bạn chọn ${label}`,
    blankAnswer: "Bạn bỏ trống",
    correctIs: (label: string) => `Đáp án đúng ${label}`,
    explanation: "Lời giải",
    retry: "Làm lại đề",
    backToList: "Về danh sách đề",
    saved: "Kết quả được lưu tạm trên thiết bị này (chế độ khách).",
    unsaved: "Không lưu được kết quả trên thiết bị này (có thể do chế độ riêng tư).",
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
