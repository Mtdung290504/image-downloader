// @ts-check

/**
 * @template {HTMLElement} [T=HTMLElement]
 * @template {Record<string, any>} [States={}]
 */
export default class HTMLElementBuilder {
	// States management -------------------------------------------------------------------------------------------

	/**
	 * @private
	 * @type {Map<string, any>}
	 */
	_stateMap = new Map()

	state = {
		/**
		 * Gọi callback với [state, setState]
		 *
		 * @template {Extract<keyof States, string>} K
		 * @param {K} name
		 * @param {(this: this, state: States[K], setState: (newValue: States[K]) => void) => void} callback
		 */
		use: (name, callback) => {
			if (!this._stateMap.has(name)) throw new Error(`State "${name}" is undefined`)

			const value = this._stateMap.get(name)
			const set = /** @param {States[K] | null} newValue */ (newValue) => {
				if (newValue === null) {
					this._stateMap.delete(name)
					return
				}
				this._stateMap.set(name, newValue)
			}
			callback.apply(this, [value, set])

			return this
		},

		/**
		 * Định nghĩa state mới
		 *
		 * @template {string} const K
		 * @template V
		 * @param {K} name
		 * @param {V} value
		 * @returns {Omit<this, keyof HTMLElementBuilder> & HTMLElementBuilder<T, States & Record<K, V>>}
		 */
		define: (name, value) => {
			if (this._stateMap.has(name))
				console.warn(`Ignore override existed state: ${name}, use setter or another name`)
			this._stateMap.set(name, value)
			return /** @type {any} */ (this)
		},

		/**
		 * Xóa một state và trả về phiên bản StateManager
		 * với kiểu đã loại bỏ key đó.
		 *
		 * @template {Extract<keyof States, string>} K
		 * @param {K} name
		 * @returns {Omit<this, keyof HTMLElementBuilder> & HTMLElementBuilder<T, Omit<States, K>>}
		 */
		remove: (name) => {
			this._stateMap.delete(name)
			return /** @type {any} */ (this)
		},
	}

	// HTML Element management -----------------------------------------------------------------------------------

	/**
	 * @protected
	 * @type {T}
	 */
	_element

	/**
	 * @private
	 */
	_eventMap = new WeakMap()

	/**
	 * @param {T} element
	 */
	constructor(element) {
		this._element = element
	}

	/**
	 * @param {string} id
	 * @returns {this}
	 */
	id = (id) => {
		this._element.id = id
		return this
	}

	/** Class list management */
	class = {
		get: () => this._element.classList,

		/**
		 * @param {string[]} tokens
		 */
		add: (...tokens) => {
			this._element.classList.add(...tokens)
			return this
		},

		/**
		 * @param {string[]} tokens
		 */
		remove: (...tokens) => {
			this._element.classList.remove(...tokens)
			return this
		},

		/**
		 * @param {string} token
		 * @param {boolean} [force]
		 */
		toggle: (token, force) => {
			this._element.classList.toggle(token, force)
			return this
		},
	}

	/** Inner HTML management */
	html = {
		get: () => this._element.innerHTML,

		/**
		 * @param {string} innerHTML
		 */
		set: (innerHTML) => {
			this._element.innerHTML = innerHTML
			return this
		},

		/**
		 * @param {string} innerHTML
		 */
		append: (innerHTML) => {
			this._element.innerHTML += innerHTML
			return this
		},
	}

	/** Text content management */
	text = {
		get: () => this._element.textContent,

		/**
		 * @param {string} textContent
		 */
		set: (textContent) => {
			this._element.textContent = textContent
			return this
		},

		/**
		 * @param {string} textContent
		 */
		append: (textContent) => {
			this._element.textContent += textContent
			return this
		},
	}

	/** Attributes management */
	attribute = {
		/**
		 * @template {string} K
		 * @param {...K} qualifiedNames
		 * @returns {{ [I in keyof K]: string | null }}
		 */
		get: (...qualifiedNames) =>
			/** @type {{ [I in keyof K]: string | null }} */ (
				qualifiedNames.map((name) => this._element.getAttribute(name))
			),

		/**
		 * @param {[qualifiedName: string, value: string][]} attributePairs
		 */
		set: (...attributePairs) => {
			for (const [key, value] of attributePairs) this._element.setAttribute(key, value)
			return this
		},

		/**
		 * @param {string[]} qualifiedNames
		 */
		remove: (...qualifiedNames) => {
			for (const key of qualifiedNames) this._element.removeAttribute(key)
			return this
		},
	}

	/** Style management */
	style = {
		/**
		 * @param {Partial<CSSStyleDeclaration> & Record<string, string | number>} style
		 * @returns {this}
		 */
		set: (style) => {
			for (const [prop, value] of Object.entries(style)) {
				if (value == null) continue
				try {
					if (prop in this._element.style) {
						// @ts-ignore dynamic property access
						this._element.style[prop] = value
					} else {
						this._element.style.setProperty(prop, String(value))
					}
				} catch {
					// tránh lỗi nếu gán sai thuộc tính (ví dụ prop sai format)
					this._element.style.setProperty(prop, String(value))
				}
			}
			return this
		},

		/**
		 * @param {...(Extract<keyof CSSStyleDeclaration, string> | (string & {}))} props
		 * @returns {this}
		 */
		remove: (...props) => {
			for (const prop of props) {
				this._element.style.removeProperty(prop)
			}
			return this
		},
	}

	/** Event management */
	event = {
		/**
		 * @template {keyof HTMLElementEventMap} K
		 * @param {K} type
		 * @param {(this: this, ev: HTMLElementEventMap[K]) => any} listener
		 * @param {boolean | AddEventListenerOptions} [options]
		 * @returns {this}
		 */
		on: (type, listener, options) => {
			/**@param {HTMLElementEventMap[K]} ev */
			const bound = (ev) => listener.call(this, ev)

			this._eventMap.set(listener, bound)
			this._element.addEventListener(type, bound, options)

			return this
		},

		/**
		 * @template {keyof HTMLElementEventMap} K
		 * @param {K} type
		 * @param {(ev: HTMLElementEventMap[K]) => any} listener
		 * @param {boolean | EventListenerOptions} [options]
		 * @returns {this}
		 */
		off: (type, listener, options) => {
			const bound = this._eventMap.get(listener)

			if (bound) {
				this._element.removeEventListener(type, bound, options)
				this._eventMap.delete(listener)
			}

			return this
		},
	}

	/**
	 * @param {HTMLElement | HTMLElementBuilder} parent
	 * @returns {this}
	 */
	attach(parent) {
		;(parent instanceof HTMLElementBuilder ? parent.element : parent).appendChild(this._element)
		return this
	}

	/**
	 * @param {...(HTMLElement | HTMLElementBuilder)} elements
	 * @returns {this}
	 */
	append(...elements) {
		elements.forEach((el) =>
			this._element.appendChild(el instanceof HTMLElementBuilder ? el.element : el)
		)
		return this
	}

	/**
	 * @returns {T}
	 */
	get element() {
		return this._element
	}
}
