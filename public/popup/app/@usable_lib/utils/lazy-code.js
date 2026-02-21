/**
 * Lười khai báo biến
 *
 * @template {any[]} const V
 * @template R
 * @param {V} v
 * @param {(...param: V) => R} caller
 * @example console.log(useVars([10, 20], (a, b) => a + b))
 */
export function useVars(v, caller) {
	return caller.apply(this, v);
}
