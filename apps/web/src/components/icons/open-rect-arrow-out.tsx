import type { SVGProps } from "react";

export interface OpenRectArrowOutIconProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

/**
 * Logout icon - arrow out of rectangle.
 */
export function OpenRectArrowOutIcon({
	size = 20,
	...props
}: OpenRectArrowOutIconProps) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			viewBox="0 0 20 20"
			width={size}
			x="0px"
			xmlns="http://www.w3.org/2000/svg"
			y="0px"
			{...props}
		>
			<polyline
				fill="none"
				points="7 14 3 10 7 6"
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
				x1="12"
				x2="3"
				y1="10"
				y2="10"
			/>
			<path
				d="m11,3h3c1.657,0,3,1.343,3,3v8c0,1.657-1.343,3-3,3h-3"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}
