import type { SVGProps } from "react";

export interface IconCircleInfoSparkleProps extends SVGProps<SVGSVGElement> {
	size?: number;
	className?: string;
}

/**
 * Circle info icon with sparkle – for informational messages (e.g. Spanco O / 100%).
 */
export function IconCircleInfoSparkle({
	size = 20,
	className,
	...props
}: IconCircleInfoSparkleProps) {
	return (
		<svg
			aria-hidden
			className={className}
			height={size}
			viewBox="0 0 20 20"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Informazione</title>
			<line
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				x1={10}
				x2={10}
				y1={14}
				y2={9.5}
			/>
			<path
				d="m10,7.5c-.689,0-1.25-.561-1.25-1.25s.561-1.25,1.25-1.25,1.25.561,1.25,1.25-.561,1.25-1.25,1.25Zm0-1.249h.006-.006Zm0,0h.006-.006Zm0,0h.006-.006Zm0,0h.006-.006Zm0,0h.006-.006Zm0,0h.006-.006Zm0,0h.006-.006Zm0,0h.006-.006Z"
				fill="currentColor"
				strokeWidth={0}
			/>
			<path
				d="m9.648,3.018c-3.701.185-6.648,3.235-6.648,6.982,0,3.866,3.134,7,7,7,3.747,0,6.797-2.946,6.982-6.647"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
			/>
			<polygon
				data-color="color-2"
				fill="currentColor"
				points="16 1 16.75 3.25 19 4 16.75 4.75 16 7 15.25 4.75 13 4 15.25 3.25 16 1"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
			/>
		</svg>
	);
}
