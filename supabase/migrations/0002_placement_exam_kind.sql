-- Test trình độ: thêm loại đề `placement` vào enum exam_kind. IF NOT EXISTS để chạy lại được.
ALTER TYPE "public"."exam_kind" ADD VALUE IF NOT EXISTS 'placement';
