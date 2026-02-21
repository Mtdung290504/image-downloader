/**
 * Ép kiểu và kiểm tra nếu `value` là instance của `Type`, nếu không thì ném lỗi.
 *
 * @template T
 * @param {unknown} value
 * @param {new (...args: any[]) => T} Type
 * @returns {T}
 * @throws {TypeError} Khi `value` không phải instance của `Type`
 */
export function asInstanceOf(value, Type) {
	if (value instanceof Type) return value;

	console.error(`Value is not instance of '${Type.name}'`, value);
	throw new TypeError(`Value is not instance of '${Type.name}'`);
}

/**
 * @template {new (...args: any[]) => any} T
 * @param {any} value
 * @param {T} Constructor
 * @returns {value is InstanceType<T>}
 */
export function isInstanceOf(value, Constructor) {
	return value instanceof Constructor;
}

/**
 * @template T
 * @param {T} value
 * @returns {NonNullable<T>}
 * @throws {Error} When value is null or undefined
 */
export function nonNullable(value) {
	if (value === null || value === undefined) throw new Error('Value must not be null or undefined');
	return value;
}

/**
 * @template T
 * @param {T & object} target
 * @param {...Partial<T>} sources
 * @returns {T}
 */
export function objAssign(target, ...sources) {
	return Object.assign(target, ...sources);
}

/**
 * @param {boolean} condition
 * @param {string} [message]
 * @throws {Error} When condition is false
 * @satisfies { (condition: boolean, message?: string) => asserts condition }
 */
export function assert(condition, message) {
	if (!condition) throw new Error(`Assertion failed${message ? `: ${message}` : ''}`);
}
