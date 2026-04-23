import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DropZone } from "../DropZone.js";

// Render helper mirroring the pattern in use-runtime-project-config.test.tsx
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => {
		root.unmount();
	});
	container.remove();
});

describe("DropZone", () => {
	it("fires onImport with a ClickUp URL when one is pasted", () => {
		const onImport = vi.fn();

		act(() => {
			root.render(
				<DropZone onImport={onImport}>
					<div data-testid="child">child</div>
				</DropZone>,
			);
		});

		const paste = new Event("paste", { bubbles: true });
		Object.defineProperty(paste, "clipboardData", {
			value: {
				getData: (type: string) => (type === "text/plain" ? "https://app.clickup.com/t/ABC-123" : ""),
			},
		});
		window.dispatchEvent(paste);

		expect(onImport).toHaveBeenCalledWith([expect.objectContaining({ tracker: "clickup", id: "ABC-123" })]);
	});

	it("ignores pastes that are not URLs", () => {
		const onImport = vi.fn();

		act(() => {
			root.render(
				<DropZone onImport={onImport}>
					<div />
				</DropZone>,
			);
		});

		const paste = new Event("paste", { bubbles: true });
		Object.defineProperty(paste, "clipboardData", {
			value: { getData: () => "not a url" },
		});
		window.dispatchEvent(paste);

		expect(onImport).not.toHaveBeenCalled();
	});
});
