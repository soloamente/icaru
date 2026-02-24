import type { SVGProps } from "react";

export interface IconArrowTriangleLineMinimizeDiagonal2Props
	extends SVGProps<SVGSVGElement> {
	size?: number | string;
}

/** Icon for "zoom out" / "see all" map reset — minimize diagonal arrows. */
export function IconArrowTriangleLineMinimizeDiagonal2({
	size = 20,
	...props
}: IconArrowTriangleLineMinimizeDiagonal2Props) {
	const sizePx = typeof size === "string" ? size : `${size}px`;
	return (
		<svg
			aria-hidden="true"
			height={sizePx}
			viewBox="0 0 20 20"
			width={sizePx}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Vedi tutta l&apos;Italia</title>
			<line
				data-color="color-2"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				x1="17"
				x2="13"
				y1="17"
				y2="13"
			/>
			<polygon
				fill="currentColor"
				points="8 3.5 8.5 8.5 3.5 8 8 3.5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			<line
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				x1="3"
				x2="7"
				y1="3"
				y2="7"
			/>
			<polygon
				data-color="color-2"
				fill="currentColor"
				points="12 16.5 11.5 11.5 16.5 12 12 16.5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}
