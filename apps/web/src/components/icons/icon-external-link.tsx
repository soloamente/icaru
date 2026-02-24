import type { SVGProps } from "react";

export interface IconExternalLinkProps extends SVGProps<SVGSVGElement> {
	size?: number;
	className?: string;
}

/**
 * External link icon – for actions that navigate to another page (e.g. open negotiation detail).
 */
export function IconExternalLink({
	size = 20,
	className,
	...props
}: IconExternalLinkProps) {
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
			<title>Link esterno</title>
			<polyline
				data-color="color-2"
				fill="none"
				points="12 12 12 8 8 8"
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
				x1={3}
				x2={12}
				y1={17}
				y2={8}
			/>
			<path
				d="m7.95,17h5.05c1.657,0,3-1.343,3-3V6c0-1.657-1.343-3-3-3h-6c-1.657,0-3,1.343-3,3v5.05"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
			/>
		</svg>
	);
}
