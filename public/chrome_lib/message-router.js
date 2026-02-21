/**
 * @typedef {Object} Message
 * @property {string} type
 * @property {any} data
 */

/**
 * @callback MessageHandler
 * @param {any} data
 * @param {chrome.runtime.MessageSender} sender
 * @param {(data: any) => void} response
 * @returns {void | Promise<any>}
 */

class MessageListener {
	/**
	 * @private
	 * @type {Map<string, MessageHandler>}
	 */
	_handlers = new Map();

	/**
	 * Đăng ký handler cho một message type
	 *
	 * @param {string} route
	 * @param {MessageHandler} handler
	 */
	on(route, handler) {
		this._handlers.set(route, handler);
		return this;
	}

	/**
	 * @param {boolean} [asyncResponse=true]
	 */
	export(asyncResponse = true) {
		/**
		 * @param {any} message
		 * @param {chrome.runtime.MessageSender} sender
		 * @param {(response?: any) => void} sendResponse
		 */
		return (message, sender, sendResponse) => {
			const handler = this._handlers.get(message.route);
			if (!handler) return false;

			handler(message.data, sender, sendResponse);
			return asyncResponse;
		};
	}
}

/**
 * Tạo MessageRouter mới
 *
 * @returns {MessageListener}
 */
export function createMessageListener() {
	return new MessageListener();
}

/**
 * Gửi message tới background / extension
 *
 * @param {string} route
 * @param {any} [data]
 */
export function message(route, data) {
	return { route, data };
}
