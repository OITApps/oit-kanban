// SYNC NOTE: mirrored from src/adapters/oit/adapters/url-router.ts — keep in sync.
// Duplicated here to avoid fighting Vite resolution across the web-ui / Node boundary.

export interface ClassifiedUrl {
	tracker: "clickup" | "gh-issue" | "gh-pr";
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
			// match[1] is always present when the pattern matched (capture group 1)
			return { tracker: "clickup", id: match[1]!, url };
		}
	}

	const issueMatch = GH_ISSUE_PATTERN.exec(url);
	if (issueMatch) {
		return {
			tracker: "gh-issue",
			// capture groups 1-3 are always present when the pattern matched
			id: `${issueMatch[1]!}/${issueMatch[2]!}#${issueMatch[3]!}`,
			url,
		};
	}

	const prMatch = GH_PR_PATTERN.exec(url);
	if (prMatch) {
		return {
			tracker: "gh-pr",
			id: `${prMatch[1]!}/${prMatch[2]!}#${prMatch[3]!}`,
			url,
		};
	}

	return null;
}
