import type { TrackerId } from "../schema/oit-card-extensions.js";

export interface ClassifiedUrl {
	tracker: TrackerId;
	id: string;
	url: string;
}

const CLICKUP_PATTERNS = [
	/^https:\/\/app\.clickup\.com\/t\/([^/?#]+)/,
	/^https:\/\/app\.clickup\.com\/\d+\/v\/l\/t\/([^/?#]+)/,
];

const GH_ISSUE_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;
const GH_PR_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

export function classifyUrl(raw: string): ClassifiedUrl | null {
	const url = raw.trim();
	if (!url.startsWith("http")) return null;

	for (const pattern of CLICKUP_PATTERNS) {
		const match = pattern.exec(url);
		if (match) {
			return { tracker: "clickup", id: match[1], url };
		}
	}

	const issueMatch = GH_ISSUE_PATTERN.exec(url);
	if (issueMatch) {
		return {
			tracker: "gh-issue",
			id: `${issueMatch[1]}/${issueMatch[2]}#${issueMatch[3]}`,
			url,
		};
	}

	const prMatch = GH_PR_PATTERN.exec(url);
	if (prMatch) {
		return {
			tracker: "gh-pr",
			id: `${prMatch[1]}/${prMatch[2]}#${prMatch[3]}`,
			url,
		};
	}

	return null;
}
