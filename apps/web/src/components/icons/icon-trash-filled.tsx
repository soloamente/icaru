import type { SVGProps } from "react";

export interface IconTrashFilledProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

/** Filled trash icon used for destructive "Rimuovi" actions on attachments. */
export function IconTrashFilled({ size = 20, ...props }: IconTrashFilledProps) {
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
			<title>Rimuovi</title>
			<rect
				data-color="color-2"
				fill="currentColor"
				height="2"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				width="4"
				x="8"
				y="3"
			/>
			<path
				d="m4.299,8l.358,7.149c.079,1.599,1.396,2.851,2.996,2.851h4.695c1.601,0,2.917-1.252,2.996-2.851l.358-7.149H4.299Z"
				fill="currentColor"
				strokeWidth="0"
			/>
			<line
				data-color="color-2"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				x1="17"
				x2="3"
				y1="5"
				y2="5"
			/>
		</svg>
	);
}
