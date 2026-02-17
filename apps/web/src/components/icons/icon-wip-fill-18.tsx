import type { SVGProps } from "react";

export interface IconWipFill18Props extends SVGProps<SVGSVGElement> {
	size?: number;
}

/** WIP (work in progress) / clock icon for "% Conclusione" dashboard card background. */
export function IconWipFill18({ size = 18, ...props }: IconWipFill18Props) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			role="img"
			viewBox="0 0 18 18"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Work in progress</title>
			<path
				d="m9,17c-4.4111,0-8-3.5889-8-8S4.5889,1,9,1s8,3.5889,8,8-3.5889,8-8,8Zm0-14.5c-3.584,0-6.5,2.916-6.5,6.5s2.916,6.5,6.5,6.5,6.5-2.916,6.5-6.5-2.916-6.5-6.5-6.5Z"
				fill="currentColor"
				strokeWidth="0"
			/>
			<path
				d="m9.2944,4.0269c-.2051-.0127-.4082.0615-.5586.2026-.1504.1416-.2358.3394-.2358.5459v4.1641l-2.7583,2.7583c-.1479.1479-.2275.3506-.2192.5596.0083.2095.1035.4053.2627.541.9077.7749,2.0493,1.2017,3.2148,1.2017,2.7568,0,5-2.2432,5-5,0-2.6318-2.0669-4.8164-4.7056-4.9731Z"
				data-color="color-2"
				fill="currentColor"
				strokeWidth="0"
			/>
		</svg>
	);
}
