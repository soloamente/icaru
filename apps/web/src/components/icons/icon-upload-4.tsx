import type React from "react";

export interface IconUpload4Props extends React.SVGProps<SVGSVGElement> {
	size?: number;
}

/**
 * Upload icon (arrow up, tray at bottom). 20×20.
 * Used on the "Importa clienti" button in ClientsTable.
 */
export default function IconUpload4({ size = 20, ...props }: IconUpload4Props) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			viewBox="0 0 20 20"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<polyline
				data-color="color-2"
				fill="none"
				points="6 7 10 3 14 7"
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
				y1="12"
				y2="3"
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
