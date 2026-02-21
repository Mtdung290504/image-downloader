/**
 * Additional debounce options.
 */
export interface DebounceOptions {
	/**
	 * Whether to execute the function immediately.
	 */
	immediate?: boolean;
}

/**
 * A debounced version of the original function.
 */
export type DebouncedFunction<Fn extends (...args: any[]) => any> = {
	/**
	 * Call the debounced function.
	 */
	(...args: Parameters<Fn>): Promise<ReturnType<Fn>>;

	/**
	 * Cancel any pending function execution.
	 */
	cancel: () => void;

	/**
	 * Immediately invoke the pending function (if any).
	 */
	flush: () => Promise<ReturnType<Fn> | undefined>;
};

/**
 * Creates a debounced version of the provided function.
 *
 * @param fn - The function to debounce.
 * @param wait - The number of milliseconds to delay.
 * @param options - Additional debounce options.
 * @returns A debounced version of the provided function.
 */
export function debounce<Fn extends (...args: any[]) => any>(
	fn: Fn,
	wait: number,
	options?: DebounceOptions
): DebouncedFunction<Fn>;
