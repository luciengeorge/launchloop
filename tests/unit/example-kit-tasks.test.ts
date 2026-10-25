import { describe, expect, it } from "vitest";
import { EXAMPLE_KIT } from "@/lib/example-kit";
import { buildTasks, EXAMPLE_KIT_CTA } from "@/lib/tasks";

const kit = EXAMPLE_KIT;
const briefStep = (example: boolean) =>
  buildTasks({ content: kit.content!, checklist: kit.checklist!, locked: false, brief: kit.brief, example }).find((t) => t.id === "brief.review")!;

describe("the example kit's brief step", () => {
  it("ends in a CTA to start your own preview, never the 'regenerate a preview' hint", () => {
    const step = briefStep(true);
    expect(step.hint).toBeUndefined();
    expect(step.cta).toEqual({ text: "This is a sample kit. Want one for your product?", label: "Get my free preview" });
    expect(JSON.stringify(step)).not.toMatch(/regenerate|Skim the brief/);
  });

  it("a real kit keeps its hint and has no CTA", () => {
    const step = briefStep(false);
    expect(step.hint).toMatch(/regenerate a preview/);
    expect(step.cta).toBeUndefined();
  });

  it("the CTA copy has no em-dashes", () => {
    expect(Object.values(EXAMPLE_KIT_CTA).join(" ")).not.toMatch(/[—–]/);
  });
});
