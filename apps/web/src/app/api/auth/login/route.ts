/**
 * Proxy for Laravel login: POST /api/auth/login with { email, password }.
 * Forwards to backend Laravel and returns its response to avoid CORS and to
 * use server-side API_BASE_URL. On 500 from backend, returns JSON with a clear message.
 */

import { NextResponse } from "next/server";

const BACKEND_BASE =
	process.env.API_BASE_URL ??
	"https://web-production-7ff544.up.railway.app/api";

export async function POST(request: Request): Promise<NextResponse> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ message: "Body deve essere JSON con email e password." },
			{ status: 400 }
		);
	}

	const { email, password } =
		typeof body === "object" &&
		body !== null &&
		"email" in body &&
		"password" in body
			? (body as { email: unknown; password: unknown })
			: { email: undefined, password: undefined };

	if (typeof email !== "string" || typeof password !== "string") {
		return NextResponse.json(
			{ message: "email e password sono obbligatori." },
			{ status: 400 }
		);
	}

	const url = `${BACKEND_BASE}/login`;
	let res: Response;
	try {
		res = await fetch(url, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email, password }),
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
		// Backend returned HTML (e.g. Laravel 500 page) or empty body
		data = {
			message:
				res.status >= 500
					? "Errore del server di autenticazione. Riprova più tardi."
					: text.slice(0, 300) || "Errore sconosciuto.",
		};
	}

	return NextResponse.json(data, { status: res.status });
}
