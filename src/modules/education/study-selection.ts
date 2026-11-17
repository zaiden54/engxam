import { z } from "zod";

export type StudyChoice = { id: string; student: string; group: string; period: string };

export function resolveStudySelection(choices: StudyChoice[], requested: string | string[] | undefined) {
  if (requested === undefined) {
    return { selected: choices.length === 1 ? choices[0] : undefined, unavailable: false };
  }
  const id = z.uuid().safeParse(requested);
  const selected = id.success ? choices.find(choice => choice.id === id.data.toLowerCase()) : undefined;
  return { selected, unavailable: !selected };
}
