import { describe, expect, it } from "vitest";

import { nodeMajorVersion, yassa } from "./yassa.js";

describe("yassa", () => {
	it("adds two numbers", () => {
		expect(yassa(1, 2)).toBe(3);
	});

	it("returns a valid current Node major version", () => {
		expect(nodeMajorVersion()).toBeGreaterThan(0);
	});
});
