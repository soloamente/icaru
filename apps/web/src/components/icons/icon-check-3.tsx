import type { SVGProps } from "react";

export interface IconCheck3Props extends SVGProps<SVGSVGElement> {
	size?: number;
}

/** Stroke-based checkmark icon (curved tick). */
export function IconCheck3({ size = 20, ...props }: IconCheck3Props) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			viewBox="0 0 20 20"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="m4,10c1.805,1.061,3.083,2.799,4,5,1.932-4.367,4.646-7.634,8-10"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}
