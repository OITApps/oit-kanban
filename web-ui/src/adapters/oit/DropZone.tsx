import type { ReactNode } from "react";
import { useEffect } from "react";
import { type ClassifiedUrl, classifyUrl } from "./url-router.js";

export interface DropZoneProps {
	children: ReactNode;
	onImport: (urls: ClassifiedUrl[]) => void;
}

export function DropZone({ children, onImport }: DropZoneProps) {
	useEffect(() => {
		function extractUrls(text: string): ClassifiedUrl[] {
			return text
				.split(/\s+/)
				.map((raw) => classifyUrl(raw))
				.filter((r): r is ClassifiedUrl => r !== null);
		}

		function onPaste(e: Event) {
			const text = (e as ClipboardEvent).clipboardData?.getData("text/plain") ?? "";
			const urls = extractUrls(text);
			if (urls.length > 0) onImport(urls);
		}

		function onDrop(e: Event) {
			e.preventDefault();
			const text = (e as DragEvent).dataTransfer?.getData("text/plain") ?? "";
			const urls = extractUrls(text);
			if (urls.length > 0) onImport(urls);
		}

		function onDragOver(e: Event) {
			e.preventDefault();
		}

		window.addEventListener("paste", onPaste);
		window.addEventListener("drop", onDrop);
		window.addEventListener("dragover", onDragOver);
		return () => {
			window.removeEventListener("paste", onPaste);
			window.removeEventListener("drop", onDrop);
			window.removeEventListener("dragover", onDragOver);
		};
	}, [onImport]);

	return <>{children}</>;
}
