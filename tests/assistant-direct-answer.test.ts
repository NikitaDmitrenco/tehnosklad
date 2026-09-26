import { describe, expect, it } from "vitest";

import { answerDirectQuestion } from "@/features/assistant/direct-answer";
import type { PublicSiteSettings } from "@/features/catalog/types";
import type { LegalOperatorConfig } from "@/lib/env/legal";

const settings: PublicSiteSettings = {
  phoneDisplay: "+373 69 166 172",
  phoneHref: "tel:+37369166172",
  address: "ул. Победы, 97, Комрат",
  openDays: "Вторник–воскресенье",
  openTime: "08:00–16:00",
  closedDay: "Понедельник — выходной",
  contactText: "Позвоните нам.",
};

const operator: LegalOperatorConfig = {
  name: "Example SRL",
  idno: "123456789",
  legalAddress: "Legal address",
  privacyEmail: "privacy@example.test",
  responsiblePerson: "Responsible Person",
  missing: [],
};

describe("assistant direct answers", () => {
  it("answers Russian address, phone and schedule questions from settings", () => {
    expect(
      answerDirectQuestion("ru", "Где находится магазин?", settings, operator)
        ?.answer,
    ).toContain(settings.address);
    expect(
      answerDirectQuestion(
        "ru",
        "На какой номер мне позвонить?",
        settings,
        operator,
      )?.answer,
    ).toContain(settings.phoneDisplay);
    expect(
      answerDirectQuestion("ru", "Когда вы работаете?", settings, operator)
        ?.answer,
    ).toContain(settings.openTime);
  });

  it("supports Romanian contact questions", () => {
    expect(
      answerDirectQuestion("ro", "Unde este magazinul?", settings, operator)
        ?.answer,
    ).toContain(settings.address);
    expect(
      answerDirectQuestion("ro", "La ce număr să sun?", settings, operator)
        ?.answer,
    ).toContain(settings.phoneDisplay);
  });

  it("returns public legal details but not unrelated product phone queries", () => {
    expect(
      answerDirectQuestion("ru", "Какой у компании IDNO?", settings, operator)
        ?.answer,
    ).toContain(operator.idno);
    expect(
      answerDirectQuestion("ru", "Покажи телефон Samsung", settings, operator),
    ).toBeNull();
  });

  it("does not invent a missing legal value", () => {
    const incomplete = { ...operator, idno: null, missing: ["IDNO"] };
    const answer = answerDirectQuestion(
      "ru",
      "Какой у компании IDNO?",
      settings,
      incomplete,
    )?.answer;
    expect(answer).toContain("не опубликовано");
    expect(answer).toContain(settings.phoneDisplay);
  });
});
