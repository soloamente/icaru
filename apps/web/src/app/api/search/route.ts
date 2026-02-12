/**
 * Proxy for Laravel global search: POST /api/search with { query: string }.
 * Forwards to backend Laravel and returns its response to avoid CORS and to
 * use server-side API_BASE_URL. Requires Authorization header from the client.
 */

import { NextResponse } from "next/server";

const BACKEND_BASE =
	process.env.API_BASE_URL ??
	"https://web-production-7ff544.up.railway.app/api";

export async function POST(request: Request): Promise<NextResponse> {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return NextResponse.json(
			{ message: "Token di autorizzazione mancante." },
			{ status: 401 }
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ message: "Body deve essere JSON con query." },
			{ status: 400 }
		);
	}

	const { query } =
		typeof body === "object" && body !== null && "query" in body
			? (body as { query: unknown })
			: { query: undefined };

	const trimmed = typeof query === "string" ? query.trim() : "";
	if (trimmed.length < 2) {
		return NextResponse.json(
			{ message: "La query deve avere almeno 2 caratteri." },
			{ status: 422 }
		);
	}

	const url = `${BACKEND_BASE}/search`;
	let res: Response;
	try {
		res = await fetch(url, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: authHeader,
			},
			body: JSON.stringify({ query: trimmed }),
		});
	} catch (err) {
		const msg =
			err instanceof Error ? err.message : "Errore di connessione al backend.";
		return NextResponse.json({ message: msg }, { status: 502 });
	}

	const contentType = res.headers.get("content-type") ?? "";
	const isJson = contentType.includes("application/json");
	const text = await res.text();
	let data: unknown;
	if (isJson && text) {
		try {
			data = JSON.parse(text) as unknown;
		} catch {
			data = { message: "Risposta backend non valida." };
		}
	} else {
		data = {
			message:
				res.status >= 500
					? "Errore del server di ricerca. Riprova più tardi."
					: text.slice(0, 300) || "Errore sconosciuto.",
		};
	}

	return NextResponse.json(data, { status: res.status });
}
