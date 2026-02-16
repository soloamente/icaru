import {
	forwardRef,
	type InputHTMLAttributes,
	type MutableRefObject,
	type ReactNode,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
} from "react";
import { cn } from "@/lib/utils";
import "@/styles/checkbox.css";

export interface CheckboxNativeProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
	/**
	 * The aria-label for accessibility
	 */
	"aria-label": string;
	/**
	 * Optional className for the label wrapper
	 */
	labelClassName?: string;
	/**
	 * Optional text to display next to the checkbox
	 */
	label?: ReactNode;
	/**
	 * Whether the checkbox is in an indeterminate state (partially checked)
	 */
	indeterminate?: boolean;
}

/**
 * Animated checkbox component with spring animations (uses checkbox.css).
 * Native input + custom visual; same size, ring, and colors as table checkboxes.
 */
const CheckboxNative = forwardRef<HTMLInputElement, CheckboxNativeProps>(
	(
		{
			className,
			labelClassName,
			label,
			"aria-label": ariaLabel,
			indeterminate,
			...props
		},
		ref
	) => {
		const id = useId();
		const inputId = props.id ?? `checkbox-${id}`;
		const inputRef = useRef<HTMLInputElement>(null);

		// Expose the input element to parent via ref
		useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);
		const setRefs = (el: HTMLInputElement | null) => {
			(inputRef as MutableRefObject<HTMLInputElement | null>).current = el;
			if (typeof ref === "function") {
				ref(el);
			} else if (ref) {
				ref.current = el;
			}
		};

		// Sync indeterminate state (native input supports it but not via prop)
		useEffect(() => {
			const input = inputRef.current;
			if (input) {
				input.indeterminate = indeterminate ?? false;
			}
		}, [indeterminate]);

		return (
			<label
				className={cn("checkbox-label cursor-pointer", labelClassName)}
				htmlFor={inputId}
			>
				<input
					aria-label={ariaLabel}
					className={cn("checkbox-input", className)}
					id={inputId}
					ref={setRefs}
					type="checkbox"
					{...props}
				/>
				<span aria-hidden="true" className="checkbox-check">
					<span className="checkbox-fill">
						{/* Checkmark icon (decorative, parent has aria-hidden) */}
						<svg
							aria-hidden
							className="checkbox-checkmark"
							fill="none"
							suppressHydrationWarning
							viewBox="0 0 16 12"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>Check</title>
							<path
								d="M2 6L6 10L14 2"
								pathLength="1"
								stroke="currentColor"
								strokeDasharray="1"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="3"
								suppressHydrationWarning
							/>
						</svg>
						{/* Indeterminate line (decorative, parent has aria-hidden) */}
						<svg
							aria-hidden
							className="checkbox-indeterminate"
							fill="none"
							suppressHydrationWarning
							viewBox="0 0 16 12"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>Indeterminate</title>
							<path
								d="M2 6L14 6"
								pathLength="1"
								stroke="currentColor"
								strokeDasharray="1"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="3"
								suppressHydrationWarning
							/>
						</svg>
					</span>
				</span>
				{label != null && <span className="checkbox-text">{label}</span>}
			</label>
		);
	}
);

CheckboxNative.displayName = "CheckboxNative";

export { CheckboxNative };
