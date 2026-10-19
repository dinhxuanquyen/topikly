import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = { "@": path.resolve(import.meta.dirname, ".") };

// Hai project: logic phía server chạy môi trường node; test component (*.test.tsx)
// chạy jsdom. Test .ts thuần luôn là node; muốn ép jsdom cho một file thì thêm
// `// @vitest-environment jsdom` ở đầu file.
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: ["node_modules/**", ".next/**", ".claude/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude: ["node_modules/**", ".next/**", ".claude/**"],
          setupFiles: ["./tests/setup-dom.ts"],
        },
      },
    ],
  },
});
