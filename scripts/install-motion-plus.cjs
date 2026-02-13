"use strict";
/**
 * Installs motion-plus from Motion registry with MOTION_TOKEN from env.
 * Motion's registry requires the token in the URL (400 if missing).
 * This script temporarily adds the token to package.json, runs bun install,
 * then restores package.json so the token is never committed.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
	for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
		const m = line.match(/^\s*MOTION_TOKEN\s*=\s*(.+)\s*$/);
		if (m) process.env.MOTION_TOKEN = m[1].trim().replace(/^["']|["']$/g, "");
	}
}
const token = process.env.MOTION_TOKEN;
const urlBase =
	"https://api.motion.dev/registry.tgz?package=motion-plus&version=2.0.0-alpha.3";

if (!token) {
	console.error(
		"Set MOTION_TOKEN (e.g. in .env). Get your token at https://plus.motion.dev/personal-token"
	);
	process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const urlWithToken = `${urlBase}&token=${token}`;

try {
	pkg.dependencies["motion-plus"] = urlWithToken;
	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
	execSync("bun install", { cwd: root, stdio: "inherit" });
} finally {
	pkg.dependencies["motion-plus"] = urlBase;
	fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
	console.log("Restored package.json (token removed).");
}
