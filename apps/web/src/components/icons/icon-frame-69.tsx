import type { SVGProps } from "react";

/** Props for the Frame 69 globe+warning icon. */
export interface IconFrame69Props extends SVGProps<SVGSVGElement> {
	size?: string;
}

/** Parse size string like "40px" or "50" to numeric pixels. */
function parseSizeToPx(size: string): number {
	const trimmed = size.toLowerCase().endsWith("px") ? size.slice(0, -2) : size;
	const n = Number.parseInt(trimmed, 10);
	return Number.isNaN(n) ? 40 : n;
}

/**
 * Globe + warning icon (Frame 69 design).
 * Inlined from Frame 69.svg for pixel-perfect rendering.
 * Used in ClientsTable tooltip when address.geocoding_failed is true.
 */
export function IconFrame69({ size = "40px", ...props }: IconFrame69Props) {
	const px = parseSizeToPx(size);
	return (
		<svg
			aria-hidden
			fill="none"
			height={px}
			viewBox="0 0 176 176"
			width={px}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Geocoding failed – address could not be located on map</title>
			<rect
				fill="none"
				height={171}
				rx={55.5}
				stroke="var(--geocoding-icon-outer-stroke)"
				strokeWidth={5}
				width={171}
				x={2.5}
				y={2.5}
			/>
			<g clipPath="url(#clip0_1366_533)">
				<rect
					fill="var(--geocoding-icon-inner-fill)"
					height={150}
					rx={45}
					width={150}
					x={13}
					y={13}
				/>
				<line
					stroke="var(--geocoding-icon-line-stroke)"
					strokeWidth={3}
					x1={88.5}
					x2={88.5}
					y1={12}
					y2={164}
				/>
				<line
					stroke="var(--geocoding-icon-line-stroke)"
					strokeWidth={3}
					x1={164}
					x2={12}
					y1={88.5}
					y2={88.5}
				/>
				<line
					stroke="var(--geocoding-icon-line-stroke)"
					strokeWidth={3}
					x1={152.939}
					x2={22.9393}
					y1={153.061}
					y2={23.0607}
				/>
				<line
					stroke="var(--geocoding-icon-line-stroke)"
					strokeWidth={3}
					transform="matrix(0.707107 -0.707107 -0.707107 -0.707107 23 151)"
					x1={0}
					x2={178.191}
					y1={-1.5}
					y2={-1.5}
				/>
				<path
					d="M124.869 111.913L111.679 91.0737C110.226 88.7831 107.742 87.4106 105.024 87.4106C102.306 87.4106 99.822 88.7831 98.3685 91.0737L85.1702 111.913C83.6357 114.338 83.5412 117.407 84.9227 119.923C86.3042 122.438 88.9502 124 91.8211 124H105.019H118.218C121.089 124 123.735 122.438 125.116 119.923C126.498 117.407 126.408 114.338 124.869 111.913ZM105.024 119.504C103.161 119.504 101.649 117.992 101.649 116.129C101.649 114.266 103.161 112.754 105.024 112.754C106.887 112.754 108.399 114.266 108.399 116.129C108.399 117.992 106.887 119.504 105.024 119.504ZM108.399 106.005C108.399 107.867 106.887 109.379 105.024 109.379C103.161 109.379 101.649 107.867 101.649 106.005V98.1296C101.649 96.2666 103.161 94.7546 105.024 94.7546C106.887 94.7546 108.399 96.2666 108.399 98.1296V106.005Z"
					fill="var(--geocoding-icon-detail)"
				/>
				<path
					clipRule="evenodd"
					d="M57.3367 81.7156C56.8936 83.7399 56.6601 85.8425 56.6601 87.9996C56.6601 100.294 64.2466 110.825 75.0061 115.151C76.7356 115.846 77.5739 117.811 76.8787 119.541C76.1834 121.27 74.2178 122.108 72.4884 121.413C59.2595 116.095 49.9102 103.143 49.9102 87.9996C49.9102 68.1176 66.0277 52 85.9098 52C103.753 52 118.559 64.9789 121.413 82.0111C121.721 83.8495 120.481 85.5894 118.642 85.8974C116.804 86.2054 115.064 84.9649 114.756 83.1266C113.457 75.3752 109.108 68.6572 102.984 64.2481L96.9527 63.9637C94.732 63.859 93.0368 65.9212 93.5687 68.0794L94.7923 73.045C95.3966 75.4971 94.4152 78.0667 92.3294 79.4912C90.6455 80.6417 88.495 80.8665 86.6093 80.0893L82.4371 78.3697C80.2477 77.4673 77.7482 77.7528 75.8187 79.1256C74.1099 80.3414 73.0481 82.2694 72.9339 84.3634L72.7332 88.0428C76.4429 87.2471 81.5508 86.4792 87.084 89.3525C88.7382 90.2115 89.3829 92.2489 88.524 93.9031C87.665 95.5573 85.6276 96.2017 83.9734 95.3431C81.8169 94.2231 79.8405 93.9585 77.8321 94.0903C78.9227 96.0091 79.6828 98.3941 79.5251 101.192C79.4093 103.248 79.6534 104.227 79.8597 104.697C80.6094 106.404 79.8337 108.395 78.1271 109.144C76.4206 109.894 74.4294 109.118 73.6798 107.412C72.8782 105.587 72.6392 103.415 72.7859 100.812C72.8818 99.11 72.2604 97.6741 71.3216 96.469C70.4745 95.3818 69.4413 94.6443 68.3021 93.9018C63.4658 90.7491 59.8575 86.0715 57.3367 81.7156Z"
					fill="var(--geocoding-icon-detail)"
					fillRule="evenodd"
				/>
				<circle
					cx={88}
					cy={88}
					r={54.5}
					stroke="var(--geocoding-icon-line-stroke)"
					strokeWidth={3}
				/>
			</g>
			<rect
				height={150}
				rx={45}
				stroke="var(--geocoding-icon-line-stroke)"
				strokeWidth={2.5}
				width={150}
				x={13}
				y={13}
			/>
			<defs>
				<clipPath id="clip0_1366_533">
					<rect fill="white" height={150} rx={45} width={150} x={13} y={13} />
				</clipPath>
			</defs>
		</svg>
	);
}

export default IconFrame69;
