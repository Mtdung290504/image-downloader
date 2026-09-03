// @ts-check
import { createMessageListener, message } from './public/chrome_lib/message-router.js';
import ImageDownloader from './background_modules/ImageDownloader.js';

const imageService = new ImageDownloader();

chrome.runtime.onMessage.addListener(
	createMessageListener()
		.on('toggle-extension', async (data, _sender, response) => {
			await imageService.setEnabled(data.enabled);
			response({ success: true });
		})
		.on('open-ui', () => {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, message('open-ui'));
			});
		})
		.on('get-images', async (data, _sender, response) => {
			response(await imageService.getImagesData(data.tabId, data.filters || {}));
		})
		.on('get-image-data', async (data, _sender, response) => {
			try {
				response({ success: true, data: await imageService.getImageData(data.tabId, data.url) });
			} catch (err) {
				response({ success: false, error: String(err) });
			}
		})
		.on('get-active-state', async (_data, _sender, response) => {
			response(
				await new Promise((resolve) => {
					chrome.storage.local.get(['extensionEnabled'], (result) => resolve(result.extensionEnabled !== false));
				}),
			);
		})
		.on('get-current-tab', (_data, sender, response) => {
			response({ tabId: sender.tab?.id });
		})
		.export(),
);
