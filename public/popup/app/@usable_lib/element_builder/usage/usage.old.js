// @ts-check
import { createBuilder, createBuilderFrom } from '../index.js';

// Builder have two types, first type is create for an existed element, example
const appBodyBuilder = createBuilderFrom(document.body)
	.class.add('body')
	.style.set({ padding: '0', margin: '0', boxSizing: 'border-box' })
	.style.set({ '--bg': '#334' })
	.style.set({ minHeight: '100dvh', background: 'var(--bg)' })
	.event.on('dragstart', (ev) => {
		ev.preventDefault();
		console.log('Draging...');
	})
	.state.define('click-controller', new AbortController())
	.state.use('click-controller', function (ctrl, _setCtrl) {
		this.event.on(
			'click',
			function (ev) {
				console.log('AD popup or sth?');
				ctrl.abort();
				console.log(ev, this);
			},
			{ signal: ctrl.signal }
		);
	})
	.event.on(
		'click',
		(ev) =>
			// @ts-expect-error
			ev.target?.classList?.contains('body') && sideNavBuilder.style.set({ transform: 'translateX(-100%)' })
	)
	.state.define('haha', 10)
	.state.use('haha', (state) => console.log(state))
	.state.remove('haha')
	.state.use('click-controller', () => {});

// Second type is create new element
// This variable is builder, you can use it to set style, attribute, html, listener,...
const openNavButtonBuilder = createBuilder('button')
	.style.set({ cursor: 'pointer', height: '100%' })
	.class.add('open-btn', 'btn')
	.html.set('&#9776;')
	.attribute.set(['g', 'gg'], ['gg', 'ggg'])
	.event.on('click', function () {
		const [g, gg] = this.attribute.get('g', 'gg');
		console.log('Test get attributes:', g, gg);

		openNavButtonBuilder.attribute.remove('g').class.remove('btn');
		sideNavBuilder.style.set({ transform: 'translateX(0)' });
		console.log(this);
	})
	.event.on('focus', () => {
		//...
	});

// Example, you can use builder variable again to set style, attribute, html, listener,...
openNavButtonBuilder.style
	.set({
		padding: '10px',
		aspectRatio: '1',
		background: '#333',
		color: 'white',
		display: 'grid',
		placeContent: 'center',
	})
	.attribute.set(['key', 'value'])
	.state.define('mouse-down-listener', () => console.log('mouse down'))
	.state.use('mouse-down-listener', function (listener) {
		this.event.on('mousedown', listener);
		setTimeout(() => {
			console.log('Clean listener:', listener);
			this.event.off('mousedown', listener);
		}, 5000);
	});

// If you want to take element, use `element` getter
const openNavButton = openNavButtonBuilder.element;

const appHeaderBuilder = createBuilder('header')
	.class.add('header')
	.style.set({
		display: 'flex',
		gap: '1em',
		padding: '10px 20px',
		background: 'black',
		color: 'white',
	})
	.append(openNavButtonBuilder)
	.append(
		createBuilder('h2')
			.style.set({ margin: '0', display: 'flex', alignItems: 'center' })
			.append(
				createBuilder('a')
					.style.set({
						color: 'white',
						textDecoration: 'none',
						display: 'block',
					})
					.href('./')
					.text.set('Header')
			)
	)
	.attach(appBodyBuilder);

const sideNavBuilder = createBuilder('nav')
	.style.set({
		position: 'absolute',
		transition: '.3s',
		width: 'max(30em, 30%)',
		top: '0',
		left: '0',
		height: '100%',
		background: '#111',
		transform: 'translateX(-100%)',
	})
	.class.add('nav')
	.append(createBuilder('h2').style.set({ width: '100%', textAlign: 'center', color: 'white' }).text.set('Nav'))
	.attach(appBodyBuilder);
