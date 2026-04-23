export interface RenderInput {
	policyMarkdown: string;
	templateMarkdown: string;
	trustedVars: Record<string, string | number>;
	untrustedVars: Record<string, string>;
}

export interface RenderOutput {
	rendered: string;
	model: string | null;
}

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/;
const UNTRUSTED_CLOSE_SENTINEL = "[untrusted-close-escaped]";

function neutralizeUntrusted(value: string): string {
	// Prevent the delimiter from being closed from inside user content.
	return value.replace(/<\/untrusted-origin-data>/gi, UNTRUSTED_CLOSE_SENTINEL);
}

function substitute(template: string, values: Record<string, string>): string {
	return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_full, name: string): string => {
		if (Object.hasOwn(values, name)) {
			return values[name] as string;
		}
		return `{{${name}}}`;
	});
}

function parseFrontmatter(md: string): { body: string; fields: Record<string, string> } {
	const match = FRONTMATTER_PATTERN.exec(md);
	if (!match) return { body: md, fields: {} };
	const fields: Record<string, string> = {};
	for (const line of (match[1] ?? "").split("\n")) {
		const idx = line.indexOf(":");
		if (idx === -1) continue;
		const key = line.slice(0, idx).trim();
		const val = line.slice(idx + 1).trim();
		if (key) fields[key] = val;
	}
	return { body: md.slice(match[0].length), fields };
}

export function renderTemplate(input: RenderInput): RenderOutput {
	const { body, fields } = parseFrontmatter(input.templateMarkdown);

	const neutralizedUntrusted: Record<string, string> = {};
	for (const [k, v] of Object.entries(input.untrustedVars)) {
		neutralizedUntrusted[k] = neutralizeUntrusted(v);
	}

	const allVars: Record<string, string> = {};
	for (const [k, v] of Object.entries(input.trustedVars)) {
		allVars[k] = String(v);
	}
	for (const [k, v] of Object.entries(neutralizedUntrusted)) {
		allVars[k] = v;
	}

	const interpolated = substitute(body, allVars);
	const rendered = `${input.policyMarkdown}\n${interpolated}`;

	return {
		rendered,
		model: fields.model ?? null,
	};
}
