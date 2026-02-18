import type { SVGProps } from "react";

export interface IconTargetProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

/** Target icon for "Percentuale di conclusione" dashboard card. Decorative only (no title) to avoid a11y name concatenation with link. */
export function IconTarget({ size = 20, ...props }: IconTargetProps) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			viewBox="0 0 20 20"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<line
				data-color="color-2"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				x1="10"
				x2="14"
				y1="10"
				y2="6"
			/>
			<path
				d="m8.9999,6.6602c-1.4443.4293-2.4999,1.7559-2.4999,3.3398,0,1.933,1.567,3.5,3.5,3.5,1.5839,0,2.9105-1.0557,3.3398-2.4999"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			<path
				d="m10.1302,3.0066c-.0438-.0008-.0862-.0066-.1302-.0066-3.866,0-7,3.134-7,7s3.134,7,7,7,7-3.134,7-7c0-.0439-.0058-.0864-.0066-.1302"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			<polygon
				data-color="color-2"
				fill="currentColor"
				points="13 7 13 5 15 3 15 5 17 5 15 7 13 7"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}
