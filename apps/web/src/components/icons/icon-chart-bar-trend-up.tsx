import type { SVGProps } from "react";

export interface IconChartBarTrendUpProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

/** Chart bar with trend up for "Importo medio trattative aperte" dashboard card. Decorative only (no title) to avoid a11y name concatenation with link. */
export function IconChartBarTrendUp({
	size = 20,
	...props
}: IconChartBarTrendUpProps) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			viewBox="0 0 20 20"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<rect
				fill="currentColor"
				height="10"
				rx=".5"
				ry=".5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				width="2"
				x="15"
				y="7"
			/>
			<rect
				fill="currentColor"
				height="6"
				rx=".5"
				ry=".5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				width="2"
				x="9"
				y="11"
			/>
			<rect
				fill="currentColor"
				height="2"
				rx=".5"
				ry=".5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				width="2"
				x="3"
				y="15"
			/>
			<polyline
				data-color="color-2"
				fill="none"
				points="6 3 10 3 10 7"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			<line
				data-color="color-2"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				x1="10"
				x2="3"
				y1="3"
				y2="10"
			/>
		</svg>
	);
}
