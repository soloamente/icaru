import fs from "node:fs";
import path from "node:path";

const indexPath = path.join(
	import.meta.dirname,
	"continual-learning-index.json"
);
const root =
	"C:/Users/adgv/.cursor/projects/c-Users-adgv-Documents-Projects-icaru/agent-transcripts";

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const indexed = index.transcripts || {};

function norm(p) {
	return p.replace(/\\/g, "/").toLowerCase();
}

const indexByNorm = {};
for (const k of Object.keys(indexed)) {
	indexByNorm[norm(k)] = indexed[k];
}

function walk(d, acc = []) {
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		const p = path.join(d, e.name);
		if (e.isDirectory()) {
			walk(p, acc);
		} else if (e.name.endsWith(".jsonl")) {
			acc.push(p);
		}
	}
	return acc;
}

const files = walk(root);
const toRead = [];
for (const f of files) {
	const st = fs.statSync(f);
	const mtimeMs = st.mtimeMs;
	const ent = indexByNorm[norm(f)];
	if (!ent || mtimeMs > ent.mtimeMs + 1) {
		toRead.push({ f, mtimeMs, reason: ent ? "mtime" : "new" });
	}
}

console.log(
	JSON.stringify(
		{ total: files.length, toRead: toRead.length, paths: toRead },
		null,
		2
	)
);
