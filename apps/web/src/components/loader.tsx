import { Loader2 } from "lucide-react";

export default function Loader() {
	return (
		<div
			aria-hidden="true"
			aria-label="Caricamento"
			aria-live="polite"
			className="flex h-full items-center justify-center pt-8"
			role="status"
		>
			<Loader2 aria-hidden className="animate-spin" />
		</div>
	);
}
