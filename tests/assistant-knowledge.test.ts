import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  rankAssistantKnowledge,
  type AssistantKnowledgeItem,
} from "@/features/assistant/knowledge";

const knowledge: AssistantKnowledgeItem[] = [
  {
    id: "delivery",
    title: "Доставка товаров",
    content: "Условия доставки согласовываются с магазином.",
    source: "database",
  },
  {
    id: "warranty",
    title: "Гарантия и возврат",
    content: "Гарантийные условия указаны в документах товара.",
    source: "database",
  },
];

describe("assistant knowledge ranking", () => {
  it("selects the relevant document despite inflected wording", () => {
    expect(
      rankAssistantKnowledge(knowledge, "Как доставить товар?")[0]?.id,
    ).toBe("delivery");
    expect(
      rankAssistantKnowledge(knowledge, "Какие гарантийные условия?")[0]?.id,
    ).toBe("warranty");
  });

  it("does not send unrelated knowledge to the provider", () => {
    expect(rankAssistantKnowledge(knowledge, "Где находится магазин?")).toEqual(
      [],
    );
  });
});
