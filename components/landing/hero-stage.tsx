"use client";

import { useState } from "react";
import { TopiCat } from "@/components/brand/topi-cat";
import type { LandingQuestion } from "@/lib/landing/queries";
import { LiveQuiz } from "./live-quiz";

/** Minh hoạ màn đầu: mèo Topi bên cạnh câu làm thử; trả lời đúng thì mèo nhún một cái. */
export function HeroStage({ program, question }: { program: string; question: LandingQuestion }) {
  const [hops, setHops] = useState(0);
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -top-6 right-0 hidden size-72 rounded-full bg-sky-100 lg:block"
      />
      <div className="relative lg:pl-24">
        <LiveQuiz
          program={program}
          question={question}
          onResult={(correct) => {
            if (correct) setHops((n) => n + 1);
          }}
        />
      </div>
      <div className="pointer-events-none absolute -bottom-6 -left-8 hidden lg:block">
        <div key={hops} className={hops ? "lp-hop" : undefined}>
          <TopiCat sparkles className="lp-float size-32" />
        </div>
      </div>
    </div>
  );
}
