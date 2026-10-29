/**
 * Kiểm tra nội dung trong content/ (hoặc thư mục truyền vào): câu hỏi, đề thi, từ vựng/ngữ pháp
 * theo content-spec mục 5 và bài blog content/blog/*.md theo docs/blog-spec.md mục 5.
 *   npm run validate:content
 *   npm run validate:content -- path/to/content
 *   npm run validate:content -- --for-import     (reviewed_by null / source khác original = lỗi)
 * Exit code 1 nếu có lỗi; 0 nếu sạch hoặc chưa có nội dung.
 */
import { runValidateContent } from "./lib/validate-content-cli";

process.exit(runValidateContent(process.argv.slice(2)));
