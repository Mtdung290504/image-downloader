import { createViewBinding } from '../index.js';

// Thay vì
// const title = document.querySelector('h1');
// const button = document.querySelector('button');
// const input = document.querySelector('input');
// const footer = document.querySelector('footer');
// const link = document.querySelector('.link');
// const divs = Array.from(document.querySelectorAll('div'));
// const raw = document.querySelector('.custom-class');

const { viewBinding: appViewBinding } = createViewBinding({
	title: 'h1',
	button: 'button',
	input: 'input',
	footer: 'footer?',
	link: '.link = a',
	divs: 'div = div[]',
	raw: '.custom-class',
});

const appView = appViewBinding.bind();
const { input, link } = appView;

console.log('App view binding:', appViewBinding);
console.log('App view:', appView);

/**
 * - Nên đặt event listener bằng cách này nếu trong lúc làm có khả năng sử dụng rebind hoặc có render lại HTML
 * 		để đảm bảo event có thể được kích hoạt mà không mất công add lại.
 *
 * - Còn nếu xác định không bao giờ rebind hay HTML không bao giờ bị ghi lại thì có thể lấy element và add event như thường.
 * 		(Trường hợp sử dụng đơn giản)
 */
appView.root.addEventListener('click', (e) => {
	const { target } = e;
	if (!target) return;

	if (appView.match(target, 'button')) {
		const oldVal = input.value;
		const oldTxt = link.textContent;

		input.value = 'Test Success!';
		link.textContent = 'Test';

		appView.rebind();

		setTimeout(() => {
			input.value = oldVal;
			link.textContent = oldTxt;
		}, 200);
	}

	if (appView.match(target, 'divs')) {
		if (target instanceof HTMLElement) {
			target.style.backgroundColor = '#444';
			setTimeout(() => (target.style.backgroundColor = null), 200);
		}
	}
});
