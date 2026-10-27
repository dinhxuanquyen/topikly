import { isProgramOpen, PROGRAMS } from "@/components/config/programs";
import { requireProgram } from "@/components/config/route-guards";
import { ComingSoon } from "@/components/placeholder/coming-soon";

// Ghi chú về `export const instant = false` ở các page trong [program]:
// segment lạ phải trả đúng mã 404 nên ta `await params` ngay, không bọc Suspense
// (bọc thì 404 chỉ hiện sau khi stream đã bắt đầu và trả mã 200). Các trang
// placeholder chưa có dữ liệu động nên không mất gì; khi làm trang thật, cân nhắc
// lại: tách phần cần params vào Suspense và để layout kiểm tra segment.
// Mã 404 ngay lần gọi đầu còn cần `partialPrefetching: false` (xem next.config.ts).

export function generateStaticParams() {
  return PROGRAMS.map((program) => ({ program: program.slug }));
}

/**
 * Layout chung cho mọi trang trong một chương trình thi.
 * - Segment lạ (/khong-ton-tai/...) trả 404.
 * - Chương trình chưa mở (TOPIK I, EPS-TOPIK) hiện màn "sắp ra mắt" thay cho trang con.
 */
export default async function ProgramLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ program: string }>;
}) {
  const { program: slug } = await params;
  const program = requireProgram(slug);

  if (!isProgramOpen(program)) {
    return <ComingSoon program={program} />;
  }

  return children;
}
