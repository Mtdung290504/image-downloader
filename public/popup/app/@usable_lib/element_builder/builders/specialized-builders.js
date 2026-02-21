// @ts-check
import HTMLElementBuilder from './HTML-element-builder.v2.js'

/**
 * @extends {HTMLElementBuilder<HTMLAnchorElement, {}>}
 */
export class AnchorBuilder extends HTMLElementBuilder {
	/**
	 * @param {this['element']['href']} href
	 */
	href = (href) => {
		this._element.href = href
		return this
	}

	/**
	 * @param {this['element']['target']} target
	 */
	target = (target) => {
		this._element.target = target
		return this
	}
}

/**
 * @extends {HTMLElementBuilder<HTMLImageElement, {}>}
 */
export class ImageBuilder extends HTMLElementBuilder {
	/**
	 * @param {this['element']['src']} src
	 */
	src = (src) => {
		this._element.src = src
		return this
	}

	/**
	 * @param {this['element']['alt']} alt
	 */
	alt = (alt) => {
		this._element.alt = alt
		return this
	}
}

/**
 * @extends {HTMLElementBuilder<HTMLAudioElement | HTMLVideoElement, {}>}
 */
export class MediaBuilder extends HTMLElementBuilder {
	source = {
		/**
		 * @param {string} src
		 */
		add: (src) => {
			const source = document.createElement('source')
			source.src = src
			this._element.appendChild(source)
			return this
		},

		/**
		 * @param {string} src
		 */
		remove: (src) => {
			const source = this._element.querySelector(`source[src="${src}"]`)
			if (source) {
				this._element.removeChild(source)
			} else {
				console.warn(`Source not found: "${src}", ignore remove`)
			}
			return this
		},
	}

	/**
	 * @param {this['element']['controls']} controls
	 */
	controls = (controls) => {
		this._element.controls = controls
		return this
	}

	/**
	 * @param {this['element']['autoplay']} autoplay
	 */
	autoplay = (autoplay) => {
		this._element.autoplay = autoplay
		return this
	}
}

/**
 * @extends {HTMLElementBuilder<HTMLInputElement, {}>}
 */
export class InputBuilder extends HTMLElementBuilder {
	/**
	 * @param {this['element']['type']} type
	 */
	type = (type) => {
		this._element.type = type
		return this
	}

	/**
	 * @param {this['element']['value']} value
	 */
	value = (value) => {
		this._element.value = value
		return this
	}

	/**
	 * @param {this['element']['placeholder']} placeholder
	 */
	placeholder = (placeholder) => {
		this._element.placeholder = placeholder
		return this
	}

	/**
	 * @param {this['element']['disabled']} disabled
	 */
	disabled = (disabled) => {
		this._element.disabled = disabled
		return this
	}
}

/**
 * @extends {HTMLElementBuilder<HTMLButtonElement, {}>}
 */
export class ButtonBuilder extends HTMLElementBuilder {
	/**
	 * @param {this['element']['type']} type
	 */
	type = (type) => {
		this._element.type = type
		return this
	}

	/**
	 * @param {this['element']['disabled']} disabled
	 */
	disabled = (disabled) => {
		this._element.disabled = disabled
		return this
	}
}

/**
 * @extends {HTMLElementBuilder<HTMLTextAreaElement, {}>}
 */
export class TextAreaBuilder extends HTMLElementBuilder {
	/**
	 * @param {this['element']['value']} value
	 */
	value = (value) => {
		this._element.value = value
		return this
	}

	/**
	 * @param {this['element']['placeholder']} placeholder
	 */
	placeholder = (placeholder) => {
		this._element.placeholder = placeholder
		return this
	}

	/**
	 * @param {this['element']['disabled']} disabled
	 */
	disabled = (disabled) => {
		this._element.disabled = disabled
		return this
	}

	/**
	 * @param {this['element']['rows']} rows
	 */
	rows = (rows) => {
		this._element.rows = rows
		return this
	}

	/**
	 * @param {this['element']['cols']} cols
	 */
	cols = (cols) => {
		this._element.cols = cols
		return this
	}
}

/**
 * @extends {HTMLElementBuilder<HTMLSelectElement, {}>}
 */
export class SelectBuilder extends HTMLElementBuilder {
	/**
	 * @param {this['element']['disabled']} disabled
	 */
	disabled = (disabled) => {
		this._element.disabled = disabled
		return this
	}

	/**
	 * @param {this['element']['multiple']} multiple
	 */
	multiple = (multiple) => {
		this._element.multiple = multiple
		return this
	}
}
