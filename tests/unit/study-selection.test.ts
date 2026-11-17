import { describe, expect, it } from "vitest";
import { resolveStudySelection, type StudyChoice } from "../../src/modules/education/study-selection";

const first: StudyChoice = { id: "afffffff-0000-4000-8000-000000000000", student: "First", group: "A", period: "2026" };
const second: StudyChoice = { ...first, id: "bfffffff-0000-4000-8000-000000000000", student: "Second" };

describe("study assignment selection", () => {
  it("automatically opens the only assignment and leaves an empty or multiple list unselected", () => {
    expect(resolveStudySelection([], undefined)).toEqual({ selected: undefined, unavailable: false });
    expect(resolveStudySelection([first], undefined).selected).toBe(first);
    expect(resolveStudySelection([first, second], undefined)).toEqual({ selected: undefined, unavailable: false });
  });

  it("honors an accessible link and rejects ambiguous or revoked links without silently opening another assignment", () => {
    expect(resolveStudySelection([first, second], second.id.toUpperCase()).selected).toBe(second);
    for (const requested of [second.id, "", [first.id, second.id]]) {
      expect(resolveStudySelection([first], requested)).toEqual({ selected: undefined, unavailable: true });
    }
  });
});
