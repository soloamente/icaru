import type { SVGProps } from "react";

export interface CircleXmarkFilledProps extends SVGProps<SVGSVGElement> {
	size?: number;
}

function CircleXmarkFilled({ size = 20, ...props }: CircleXmarkFilledProps) {
	return (
		<svg
			height={size}
			viewBox="0 0 20 20"
			width={size}
			x="0px"
			xmlns="http://www.w3.org/2000/svg"
			y="0px"
			{...props}
		>
			<path
				d="m15.657,4.343c-3.119-3.119-8.195-3.119-11.314,0s-3.119,8.194,0,11.313c1.56,1.56,3.608,2.339,5.657,2.339s4.098-.78,5.657-2.339c3.119-3.119,3.119-8.194,0-11.313Zm-1.95,7.95c.391.391.391,1.023,0,1.414-.195.195-.451.293-.707.293s-.512-.098-.707-.293l-2.293-2.293-2.293,2.293c-.195.195-.451.293-.707.293s-.512-.098-.707-.293c-.391-.391-.391-1.023,0-1.414l2.293-2.293-2.293-2.293c-.391-.391-.391-1.023,0-1.414s1.023-.391,1.414,0l2.293,2.293,2.293-2.293c.391-.391,1.023-.391,1.414,0s.391,1.023,0,1.414l-2.293,2.293,2.293,2.293Z"
				fill="currentColor"
				strokeWidth="0"
			/>
		</svg>
	);
}

export default CircleXmarkFilled;
