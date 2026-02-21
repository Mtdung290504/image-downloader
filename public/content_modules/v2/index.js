import { createMessageListener } from '../../chrome_lib/message-router.js';
import { createBuilder } from '../../popup/app/@usable_lib/element_builder/index.js';
import { ImageDownloaderApp } from '../../popup/app/v2/app.js';

const cacheUI = true;
const overlay = createBuilder('extension-host')
	.id('template-extension-host')
	.style.set({
		display: 'block',
		inset: '0',
		position: 'fixed',
		width: '100%',
		height: '100%',
		zIndex: '9999999999999',
		top: '50%',
		left: '50%',
		transform: 'translate(-50%, -50%)',
		boxShadow: '1px 1px 5px white',
		transition: '.5s opacity',
		backgroundColor: 'rgba(0, 0, 0, .5)',
		opacity: '0',
		pointerEvents: 'none',
		cursor: 'pointer',
	})
	.attach(document.body);
const shadow = overlay.element.attachShadow({ mode: 'open' });

let isVisible = false;
const prevOverflow = document.body.style.overflow;

const show = () => {
	overlay.style.set({ opacity: '1', pointerEvents: 'all' });
	document.body.style.overflow = 'hidden';
	isVisible = true;

	!cacheUI && init();
};

const hide = () => {
	overlay.style.set({ opacity: '0', pointerEvents: 'none' });
	document.body.style.overflow = prevOverflow;
	isVisible = false;
};

const toggle = () => (isVisible ? hide() : show());

hide();

// Hotkey toggle (Ctrl+Shift+E hoặc Cmd+Shift+E trên Mac)
document.addEventListener('keydown', (e) => {
	if (e.altKey && e.shiftKey && e.key.toUpperCase() === 'E') {
		e.preventDefault();
		toggle();
	}
});

// ESC để đóng
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && isVisible) hide();
});

// Click overlay để đóng (nhưng không click vào iframe)
overlay.element.addEventListener('click', (e) => {
	if (e.target === overlay.element) hide();
});

/**@type {ImageDownloaderApp} */
let app = null;

chrome.runtime.onMessage.addListener(
	createMessageListener()
		.on('open-ui', async () => {
			if (app) {
				show();
				await app.loadImages();
			}
		})
		.export(),
);

init();

async function init() {
	const rootUI = await loadUI();
	shadow.innerHTML = '';
	shadow.append(
		rootUI,
		Object.assign(document.createElement('style'), {
			textContent: /*css*/ `
				@import "${chrome.runtime.getURL('public/popup/app/v2/style.css')}";
                :host { all: initial; }

                .overlay-ui {
                    position: fixed;
                    width: 85%;
                    height: 95%;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    border-radius: 8px;
                    background: #111;
                    box-shadow: 0 8px 40px rgba(0, 0, 0, .6);
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                    background-color: #222;
                    cursor: default;
                }
        `,
		}),
	);

	app = new ImageDownloaderApp(shadow, hide);
}

async function loadUI() {
	const htmlText = await fetch(chrome.runtime.getURL('/public/popup/app/v2/index.html')).then((r) => r.text());

	const template = document.createElement('template');
	template.innerHTML = htmlText;

	// Remove test scripts & css link
	template.content.querySelectorAll('script').forEach((s) => s.remove());
	template.content.querySelectorAll('link[rel="stylesheet"]').forEach((l) => l.remove());

	const rootUI = document.createElement('div');
	rootUI.className = 'extension-ui';
	rootUI.addEventListener('click', (e) => e.stopPropagation());
	rootUI.append(template.content);

	return rootUI;
}
