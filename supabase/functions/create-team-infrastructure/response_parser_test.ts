import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseModelSkillsList } from "./response_parser.ts";

Deno.test("parseModelSkillsList with clean JSON array", () => {
  const input = '["python", "react", "fastapi"]';
  const result = parseModelSkillsList(input);
  assertEquals(result, ["python", "react", "fastapi"]);
});

Deno.test("parseModelSkillsList with uppercase/whitespace normalization", () => {
  const input = '[ "  Python ", " React", "FastAPI  " ]';
  const result = parseModelSkillsList(input);
  assertEquals(result, ["python", "react", "fastapi"]);
});

Deno.test("parseModelSkillsList with markdown code blocks", () => {
  const input = "```json\n[\n  \"python\",\n  \"react\",\n  \"fastapi\"\n]\n```";
  const result = parseModelSkillsList(input);
  assertEquals(result, ["python", "react", "fastapi"]);
});

Deno.test("parseModelSkillsList with surrounding explanation text", () => {
  const input = 'Sure, here is the list of identified skills: ["python", "react", "fastapi"]. Let me know if you need more help!';
  const result = parseModelSkillsList(input);
  assertEquals(result, ["python", "react", "fastapi"]);
});

Deno.test("parseModelSkillsList with empty or null string", () => {
  const resultEmpty = parseModelSkillsList("");
  assertEquals(resultEmpty, ["general-builder"]);

  const resultSpaces = parseModelSkillsList("   ");
  assertEquals(resultSpaces, ["general-builder"]);
});

Deno.test("parseModelSkillsList with non-array JSON object", () => {
  const input = '{"skills": ["python", "react"]}';
  const result = parseModelSkillsList(input);
  assertEquals(result, ["general-builder"]);
});

Deno.test("parseModelSkillsList with completely malformed string", () => {
  const input = "I am a backend developer with python and react experience.";
  const result = parseModelSkillsList(input);
  assertEquals(result, ["general-builder"]);
});
