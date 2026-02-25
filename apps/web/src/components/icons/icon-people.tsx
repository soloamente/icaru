import type { SVGProps } from "react";

/**
 * IconPeople — people/clients icon (two figures).
 * Used for the Clienti nav item in the sidebar.
 */
export interface IconPeopleProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

export function IconPeople({ size = 20, ...props }: IconPeopleProps) {
	return (
		<svg
			aria-hidden="true"
			fill="currentColor"
			height={size}
			role="img"
			viewBox="0 0 20 20"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Clienti</title>
			{/* Left figure head */}
			<circle cx="5.75" cy="4" fill="currentColor" r="2" strokeWidth="0" />
			{/* Left figure body */}
			<path
				d="m8.25,12H3.25l.444-2.369c.177-.946,1.003-1.631,1.966-1.631h.18c.962,0,1.788.685,1.966,1.631l.444,2.369Z"
				fill="currentColor"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			{/* Left figure legs */}
			<polygon
				fill="currentColor"
				points="6.5 17 5 17 4.5 12.5 7 12.5 6.5 17"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			{/* Right figure head */}
			<circle
				cx="14.25"
				cy="4"
				data-color="color-2"
				fill="currentColor"
				r="2"
				strokeWidth="0"
			/>
			{/* Right figure body */}
			<path
				d="m16.75,14h-5l.533-4.264c.124-.992.967-1.736,1.967-1.736h0c1,0,1.843.744,1.967,1.736l.533,4.264Z"
				data-color="color-2"
				fill="currentColor"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			{/* Right figure legs */}
			<polygon
				data-color="color-2"
				fill="currentColor"
				points="15 17 13.5 17 13 12.5 15.5 12.5 15 17"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
		</svg>
	);
}
