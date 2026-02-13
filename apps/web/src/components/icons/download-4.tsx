import type React from "react";

export interface Download4Props extends React.SVGProps<SVGSVGElement> {
	size?: number;
}

export default function Download4({ size = 20, ...props }: Download4Props) {
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
				data-color="color-2"
				fill="none"
				points="14 8 10 12 6 8"
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
				x2="10"
				y1="3"
				y2="12"
			/>
			<path
				d="m17,13v1c0,1.657-1.343,3-3,3H6c-1.657,0-3-1.343-3-3v-1"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}
