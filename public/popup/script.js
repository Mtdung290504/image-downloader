// @ts-check
import { message } from '../chrome_lib/message-router.js';

let isEnabled = true;

// Load trạng thái từ storage
chrome.storage.local.get(['extensionEnabled'], (result) => {
	isEnabled = result.extensionEnabled !== false;
	updateUI();
});

// Nút Open UI
document.getElementById('openUI')?.addEventListener('click', () => {
	if (!isEnabled) {
		// Flash the toggle button to hint user
		const btn = document.getElementById('toggleExtension');
		if (!btn) return;

		btn.style.outline = '2px solid #f87171';
		setTimeout(() => (btn.style.outline = ''), 800);
		return;
	}
	chrome.runtime.sendMessage(message('open-ui'));
	window.close();
});

// Nút Toggle Extension
document.getElementById('toggleExtension')?.addEventListener('click', () => {
	isEnabled = !isEnabled;

	chrome.storage.local.set({ extensionEnabled: isEnabled });
	chrome.runtime.sendMessage(message('toggle-extension', { enabled: isEnabled }));

	updateUI();

	// Reload active tab khi enable để debugger attach ngay lập tức
	if (isEnabled) {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
		});
		window.close();
	}
});

function updateUI() {
	const toggleBtn = document.getElementById('toggleExtension');
	const dot = document.getElementById('statusDot');
	const statusText = document.getElementById('statusText');

	if (!toggleBtn || !dot || !statusText) return;
	if (isEnabled) {
		toggleBtn.textContent = 'Disable Extension';
		toggleBtn.className = 'btn btn-disable';
		dot.className = 'status-dot active';
		statusText.textContent = 'Active — debugger attached to tabs';
		statusText.className = 'status-text active';
	} else {
		toggleBtn.textContent = 'Enable Extension';
		toggleBtn.className = 'btn btn-enable';
		dot.className = 'status-dot inactive';
		statusText.textContent = 'Inactive — no debugger, no banner';
		statusText.className = 'status-text inactive';
	}
}
