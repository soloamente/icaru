import type { SVGProps } from "react";

/** Shared props for compact SVG icons. */
export interface IconArrowUpRightFill12Props extends SVGProps<SVGSVGElement> {
	size?: string;
}

/**
 * Small filled "arrow up right" icon (12×12).
 * Used on team cards to indicate navigability to the detail page.
 * Animates toward top-right on hover.
 */
export function IconArrowUpRightFill12({
	size = "12px",
	...props
}: IconArrowUpRightFill12Props) {
	return (
		<svg
			aria-hidden="true"
			height={size}
			viewBox="0 0 12 12"
			width={size}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="m1.75,11c-.192,0-.384-.073-.53-.22-.293-.293-.293-.768,0-1.061L9.543,1.396c.293-.293.768-.293,1.061,0s.293.768,0,1.061L2.28,10.78c-.146.146-.338.22-.53.22Z"
				data-color="color-2"
				fill="currentColor"
				strokeWidth="0"
			/>
			<path
				d="m10.25,7.25c-.414,0-.75-.336-.75-.75V2.5h-4c-.414,0-.75-.336-.75-.75s.336-.75.75-.75h4.75c.414,0,.75.336.75.75v4.75c0,.414-.336.75-.75.75Z"
				fill="currentColor"
				strokeWidth="0"
			/>
		</svg>
	);
}

export default IconArrowUpRightFill12;
