import { describe, expect, it } from "vitest";
import { pageCount, parsePagination } from "./pagination";

describe("pagination", () => {
  it("has no fixed catalog size and caps the page length", () => {
    expect(parsePagination({ page: "3", pageSize: "1000" }, 24)).toEqual({
      page: 3,
      pageSize: 48,
      offset: 96,
    });
    expect(pageCount(1000, 24)).toBe(42);
  });
});
