import { expect, test } from "vitest";
import { z } from "zod";
import { contentSchema } from "@/lib/content/schema";
import { SECTIONS } from "./sections";

// Unwrap defaults, arrays and refinements down to the object schema of one entry.
function objectOf(schema: z.ZodType): z.ZodObject {
  let s: z.ZodType = schema;
  for (let i = 0; i < 6; i++) {
    if (s instanceof z.ZodObject) return s;
    if (s instanceof z.ZodDefault || s instanceof z.ZodOptional) s = s.unwrap() as z.ZodType;
    else if (s instanceof z.ZodArray) s = s.element as z.ZodType;
    else break;
  }
  throw new Error("not an object schema");
}

test("every part of the tape has a section, in tape order", () => {
  expect(SECTIONS.map((s) => s.id).sort()).toEqual(Object.keys(contentSchema.shape).sort());
  expect(SECTIONS.map((s) => s.title)).toEqual(["about", "events", "mixtape", "people", "made", "on rotation", "links"]);
});

test("every field the editor offers exists in the schema, and every schema field is offered", () => {
  for (const section of SECTIONS) {
    const shape = objectOf(contentSchema.shape[section.id] as z.ZodType).shape;
    const offered = section.fields.map((f) => f.key).sort();
    const inSchema = Object.keys(shape).filter((k) => k !== "archived").sort();
    expect(offered, section.id).toEqual(inSchema);
  }
});

test("lists know how to start a new entry", () => {
  for (const s of SECTIONS.filter((x) => x.list)) expect(typeof s.blank, s.id).toBe("function");
});
