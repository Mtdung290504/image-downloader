// @ts-check
import HTMLElementBuilder from './builders/HTML-element-builder.v2.js';
import {
	AnchorBuilder,
	ButtonBuilder,
	ImageBuilder,
	InputBuilder,
	MediaBuilder,
	SelectBuilder,
	TextAreaBuilder,
} from './builders/specialized-builders.js';

/**
 * Create a builder from a tag name with automatic type mapping
 *
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName
 * @returns {K extends 'a'
 * 	? AnchorBuilder
 * 	: K extends 'img'
 * 		? ImageBuilder
 * 		: K extends 'audio'
 * 			? MediaBuilder
 * 			: K extends 'video'
 * 				? MediaBuilder
 * 				: K extends 'input'
 * 					? InputBuilder
 * 					: K extends 'button'
 * 						? ButtonBuilder
 * 						: K extends 'textarea'
 * 							? TextAreaBuilder
 * 							: K extends 'select'
 * 								? SelectBuilder
 * 								: HTMLElementBuilder<HTMLElementTagNameMap[K], {}>}
 */
export function createBuilder(tagName) {
	// @ts-expect-error: TypeScript can't narrow generic K, but runtime is correct
	return _createBuilder(tagName);
}

/**
 * Internal helper - creates the appropriate builder without generic constraints
 * @param {keyof HTMLElementTagNameMap} tagName
 * @returns {HTMLElementBuilder | AnchorBuilder | ImageBuilder | MediaBuilder | InputBuilder | ButtonBuilder | TextAreaBuilder | SelectBuilder}
 */
function _createBuilder(tagName) {
	switch (tagName) {
		case 'a':
			return new AnchorBuilder(document.createElement('a'));
		case 'img':
			return new ImageBuilder(document.createElement('img'));
		case 'audio':
		case 'video':
			return new MediaBuilder(document.createElement(tagName));
		case 'input':
			return new InputBuilder(document.createElement('input'));
		case 'button':
			return new ButtonBuilder(document.createElement('button'));
		case 'textarea':
			return new TextAreaBuilder(document.createElement('textarea'));
		case 'select':
			return new SelectBuilder(document.createElement('select'));
		default:
			return new HTMLElementBuilder(document.createElement(tagName));
	}
}

/**
 * Create a builder from an existing element with automatic type detection
 *
 * @template {HTMLElement} T
 * @param {T} element
 * @returns {T extends HTMLAnchorElement
 * 	? AnchorBuilder
 * 	: T extends HTMLImageElement
 * 		? ImageBuilder
 * 		: T extends HTMLAudioElement
 * 			? MediaBuilder
 * 			: T extends HTMLVideoElement
 * 				? MediaBuilder
 * 				: T extends HTMLInputElement
 * 					? InputBuilder
 * 					: T extends HTMLButtonElement
 * 						? ButtonBuilder
 * 						: T extends HTMLTextAreaElement
 * 							? TextAreaBuilder
 * 							: T extends HTMLSelectElement
 * 								? SelectBuilder
 * 								: HTMLElementBuilder<HTMLElement, {}>
 * }
 */
export function createBuilderFrom(element) {
	// @ts-expect-error: TypeScript can't narrow generic T, but runtime is correct
	return _createBuilderFrom(element);
}

/**
 * Internal helper for fromElement
 * @param {HTMLElement} element
 * @returns {HTMLElementBuilder | AnchorBuilder | ImageBuilder | MediaBuilder | InputBuilder | ButtonBuilder | TextAreaBuilder | SelectBuilder}
 */
function _createBuilderFrom(element) {
	if (!(element instanceof HTMLElement)) {
		throw new Error('Expected an instance of HTMLElement');
	}

	if (element instanceof HTMLAnchorElement) return new AnchorBuilder(element);
	if (element instanceof HTMLImageElement) return new ImageBuilder(element);
	if (element instanceof HTMLAudioElement || element instanceof HTMLVideoElement) return new MediaBuilder(element);
	if (element instanceof HTMLInputElement) return new InputBuilder(element);
	if (element instanceof HTMLButtonElement) return new ButtonBuilder(element);
	if (element instanceof HTMLTextAreaElement) return new TextAreaBuilder(element);
	if (element instanceof HTMLSelectElement) return new SelectBuilder(element);

	return new HTMLElementBuilder(element);
}
