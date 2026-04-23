/**
 * Persistent per-card emit settings stored in ~/.oit-kanban/state.json.
 * Simple JSON file keyed by cardId. Created on first write.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const STATE_DIR = join(homedir(), ".oit-kanban");
const STATE_FILE = join(STATE_DIR, "state.json");

interface OitState {
	emit_disabled: Record<string, boolean>;
}

async function readState(): Promise<OitState> {
	try {
		const raw = await readFile(STATE_FILE, "utf8");
		const parsed = JSON.parse(raw) as Partial<OitState>;
		return {
			emit_disabled: parsed.emit_disabled ?? {},
		};
	} catch {
		return { emit_disabled: {} };
	}
}

async function writeState(state: OitState): Promise<void> {
	await mkdir(STATE_DIR, { recursive: true });
	await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export async function getEmitDisabled(cardId: string): Promise<boolean> {
	const state = await readState();
	return state.emit_disabled[cardId] ?? false;
}

export async function setEmitDisabled(cardId: string, disabled: boolean): Promise<void> {
	const state = await readState();
	state.emit_disabled[cardId] = disabled;
	await writeState(state);
}
