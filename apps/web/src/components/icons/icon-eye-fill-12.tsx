import type { SVGProps } from "react";

/** Shared props for compact SVG icons. */
export interface IconProps extends SVGProps<SVGSVGElement> {
	size?: string;
}

/**
 * Small filled "eye" icon (12×12).
 * Used inside the "Ha trattative" pill in `ClientsTable` to indicate
 * that at least one negotiation is linked to the client and can be viewed.
 */
export function IconEyeFill12({ size = "12px", ...props }: IconProps) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			role="img"
			viewBox="0 0 12 12"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="m6,1C2.688,1,0,4.025,0,6s2.688,5,6,5,6-3.025,6-5S9.312,1,6,1Zm0,7c-1.103,0-2-.897-2-2s.897-2,2-2,2,.897,2,2-.897,2-2,2Z"
				fill="currentColor"
				strokeWidth="0"
			/>
		</svg>
	);
}

export default IconEyeFill12;
