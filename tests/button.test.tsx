import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("hiển thị nhãn", () => {
    render(<Button>Bắt đầu luyện</Button>);
    expect(screen.getByRole("button", { name: "Bắt đầu luyện" })).toBeInTheDocument();
  });
});
