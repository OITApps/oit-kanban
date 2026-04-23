import { describe, expect, it } from "vitest";
import { classifyUrl } from "../adapters/url-router.js";

describe("classifyUrl", () => {
	it("classifies a ClickUp task URL", () => {
		expect(classifyUrl("https://app.clickup.com/t/ABC-123")).toEqual({
			tracker: "clickup",
			id: "ABC-123",
			url: "https://app.clickup.com/t/ABC-123",
		});
	});

	it("classifies a ClickUp URL with workspace prefix", () => {
		expect(classifyUrl("https://app.clickup.com/12345/v/l/t/ABC-123")).toEqual({
			tracker: "clickup",
			id: "ABC-123",
			url: "https://app.clickup.com/12345/v/l/t/ABC-123",
		});
	});

	it("classifies a GitHub issue URL", () => {
		expect(classifyUrl("https://github.com/OITApps/ucdata/issues/456")).toEqual({
			tracker: "gh-issue",
			id: "OITApps/ucdata#456",
			url: "https://github.com/OITApps/ucdata/issues/456",
		});
	});

	it("classifies a GitHub PR URL", () => {
		expect(classifyUrl("https://github.com/OITApps/ucdata/pull/789")).toEqual({
			tracker: "gh-pr",
			id: "OITApps/ucdata#789",
			url: "https://github.com/OITApps/ucdata/pull/789",
		});
	});

	it("returns null for an unrecognized URL", () => {
		expect(classifyUrl("https://example.com/foo/bar")).toBeNull();
	});

	it("returns null for non-URL input", () => {
		expect(classifyUrl("not a url")).toBeNull();
	});
});
