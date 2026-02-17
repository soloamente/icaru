import type { SVGProps } from "react";

export interface IconUTurnToLeftProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

/** U-turn arrow to the left — used for "back to list" on edit pages (e.g. trattative aperte). */
export function IconUTurnToLeft({ size = 20, ...props }: IconUTurnToLeftProps) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			role="img"
			viewBox="0 0 20 20"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Torna indietro</title>
			<path
				d="m10,16h3c2.209,0,4-1.791,4-4h0c0-2.209-1.791-4-4-4H3"
				data-color="color-2"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			<polyline
				fill="none"
				points="7 4 3 8 7 12"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}
