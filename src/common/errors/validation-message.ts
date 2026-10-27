import type { z } from "zod";

function expectedType(expected: string): string {
  const names: Record<string, string> = {
    string: "matn",
    number: "son",
    int: "butun son",
    boolean: "mantiqiy qiymat",
    object: "obyekt",
    array: "ro‘yxat",
    date: "sana",
  };
  return names[expected] ?? "mos qiymat";
}

export function validationMessageUz(issue: z.ZodIssue): string {
  switch (issue.code) {
    case "invalid_type":
      return `${expectedType(issue.expected)} yuboring.`;
    case "too_small":
      if (issue.origin === "string")
        return `Kamida ${issue.minimum} ta belgi kiriting.`;
      if (issue.origin === "array")
        return `Kamida ${issue.minimum} ta element yuboring.`;
      return `Qiymat ${issue.minimum} dan kichik bo‘lmasligi kerak.`;
    case "too_big":
      if (issue.origin === "string")
        return `Ko‘pi bilan ${issue.maximum} ta belgi kiriting.`;
      if (issue.origin === "array")
        return `Ko‘pi bilan ${issue.maximum} ta element yuboring.`;
      return `Qiymat ${issue.maximum} dan katta bo‘lmasligi kerak.`;
    case "invalid_format":
      if (issue.format === "url") return "To‘g‘ri URL kiriting.";
      if (issue.format === "email") return "To‘g‘ri email manzilini kiriting.";
      return "Qiymat talab qilingan formatga mos emas.";
    case "invalid_value":
      return `Ruxsat etilgan qiymatlardan birini yuboring: ${issue.values.join(", ")}.`;
    case "unrecognized_keys":
      return `Noma’lum maydon: ${issue.keys.join(", ")}.`;
    case "not_multiple_of":
      return `Qiymat ${issue.divisor} ga karrali bo‘lishi kerak.`;
    case "custom":
      return issue.message;
    default:
      return "Qiymat noto‘g‘ri.";
  }
}
