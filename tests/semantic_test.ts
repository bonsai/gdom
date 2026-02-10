import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { similarity } from "../src/semantic.ts";

Deno.test("Semantic Similarity Test", () => {
  const score1 = similarity("プロジェクト概要", "プロジェクトの概要");
  assertEquals(score1 > 0.8, true, "Should match closely related terms");

  const score2 = similarity("予算", "スケジュール");
  assertEquals(score2 < 0.3, true, "Should not match unrelated terms");
});
