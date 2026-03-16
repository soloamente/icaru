import type { SVGProps } from "react";

/** Props for the circle-with-arrow-up-right icon. */
export interface IconCircleOpenArrowUpRightProps
	extends SVGProps<SVGSVGElement> {
	size?: string;
}

/**
 * Circle with open arrow up-right (20×20).
 * Used on team cards to indicate navigability to the detail page.
 */
export function IconCircleOpenArrowUpRight({
	size = "20px",
	...props
}: IconCircleOpenArrowUpRightProps) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			viewBox="0 0 20 20"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<polyline
				data-color="color-2"
				fill="none"
				points="7.879 7.879 12.121 7.879 12.121 12.121"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
			/>
			<line
				data-color="color-2"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				x1="5.05"
				x2="12.121"
				y1="14.95"
				y2="7.879"
			/>
			<path
				d="m5.05,14.95c-2.734-2.734-2.734-7.166,0-9.899s7.166-2.734,9.899,0,2.734,7.166,0,9.899c-1.682,1.682-4.007,2.329-6.184,1.941"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
			/>
		</svg>
	);
}

export default IconCircleOpenArrowUpRight;
