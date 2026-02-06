import type { SVGProps } from "react";

export interface DashboardIconProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

/**
 * Home/dashboard icon for navigation.
 */
export function DashboardIcon({ size = 20, ...props }: DashboardIconProps) {
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
			<path
				d="m16.163,5.273l-5.082-3.267c-.655-.421-1.504-.422-2.163,0l-5.081,3.267h0c-1.15.74-1.837,1.998-1.837,3.365v5.362c0,2.206,1.794,4,4,4h2v-4c0-1.105.895-2,2-2s2,.895,2,2v4h2c2.206,0,4-1.794,4-4v-5.362c0-1.367-.687-2.625-1.837-3.365Z"
				fill="currentColor"
				strokeWidth="0"
			/>
		</svg>
	);
}
