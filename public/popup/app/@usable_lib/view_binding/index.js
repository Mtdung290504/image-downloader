/**@type {import('./types')['createViewBinding']} */
export function createViewBinding(viewMap) {
	if (typeof viewMap !== 'object' || viewMap === null) {
		throw new Error("'viewMap' param must be a valid object.");
	}

	return {
		viewBinding: {
			/**
			 * @param {HTMLElement | Document | ShadowRoot} target
			 */
			// @ts-expect-error: Proxy return type
			bind(target = document) {
				let elementToKeys = null;
				const bindings = {
					get root() {
						return target;
					},
				};

				const register = (el, key) => {
					if (!elementToKeys.has(el)) elementToKeys.set(el, new Set());
					elementToKeys.get(el).add(key);
				};

				const isElementBoundToKey = (el, key) => elementToKeys.has(el) && elementToKeys.get(el).has(key);

				const performBinding = () => {
					elementToKeys = new WeakMap();

					for (const [key, selectorDef] of Object.entries(viewMap)) {
						const match = /^(.*?)(\?)?\s*(?:=\s*(?:(\w+))?(\[\])?)?$/.exec(selectorDef);
						if (!match) throw new Error(`Invalid selector for key "${key}": ${selectorDef}`);

						const [, rawSelector, optionalMark, tagName, listMark] = match;

						const selector = rawSelector.trim();
						const expectedTag = tagName?.toLowerCase();
						const isRequired = !optionalMark; // mặc định là required, chỉ optional khi có ?
						const isList = Boolean(listMark);

						const result = queryElements(target, selector, expectedTag, isList);

						if (!isRequired && !isList && result === null) bindings[key] = null;
						else if (isRequired && !isList && result === null)
							throw new Error(`Required selector "${selectorDef}" not found for key "${key}".`);
						else {
							bindings[key] = result;
							if (Array.isArray(result)) result.forEach((el) => register(el, key));
							else register(result, key);
						}
					}
				};

				performBinding();
				return new Proxy(bindings, {
					get(_, prop) {
						if (prop === 'rebind') return performBinding;
						if (prop === 'match') return isElementBoundToKey;
						return bindings[prop];
					},
				});
			},
		},

		viewMap,
	};
}

/**@type {import('./types')['queryElements']} */
function queryElements(target, selector, expectedTag, isList) {
	try {
		if (isList) {
			const elements = [...target.querySelectorAll(selector)];
			return expectedTag ? elements.filter((el) => el.tagName.toLowerCase() === expectedTag) : elements;
		} else {
			const el = target.querySelector(selector);
			if (el && expectedTag && el.tagName.toLowerCase() !== expectedTag)
				throw new Error(`Expected <${expectedTag}>, but found <${el.tagName.toLowerCase()}>.`);

			return el;
		}
	} catch (error) {
		throw new Error(`Failed to query "${selector}": ${error.message}`);
	}
}
