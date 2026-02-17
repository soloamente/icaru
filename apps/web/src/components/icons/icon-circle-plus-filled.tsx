import type { SVGProps } from "react";

export interface IconCirclePlusFilledProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

/** Circle with plus icon for "Aperte" / open status (dashboard card and trattative status pills). */
export function IconCirclePlusFilled({
	size = 20,
	...props
}: IconCirclePlusFilledProps) {
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
			<title>Circle plus</title>
			<path
				d="m10,2C5.589,2,2,5.589,2,10s3.589,8,8,8,8-3.589,8-8S14.411,2,10,2Zm3.5,9h-2.5v2.5c0,.552-.448,1-1,1s-1-.448-1-1v-2.5h-2.5c-.552,0-1-.448-1-1s.448-1,1-1h2.5v-2.5c0-.552.448-1,1-1s1,.448,1,1v2.5h2.5c.552,0,1,.448,1,1s-.448,1-1,1Z"
				fill="currentColor"
				strokeWidth="0"
			/>
		</svg>
	);
}
