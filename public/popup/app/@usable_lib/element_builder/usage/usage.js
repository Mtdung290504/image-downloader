// @ts-check
import { createBuilder, createBuilderFrom } from '../index.js';

// Setup body
const appBodyBuilder = createBuilderFrom(document.body)
	.style.set({
		margin: '0',
		padding: '20px',
		fontFamily: 'Arial, sans-serif',
		backgroundColor: '#f0f0f0',
	})
	.state.define('theme', localStorage.getItem('theme') ?? 'light');

// Counter demo
const counterBuilder = createBuilder('div')
	.style.set({
		padding: '30px',
		backgroundColor: 'white',
		borderRadius: '10px',
		boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
		maxWidth: '300px',
		margin: '0 auto',
		textAlign: 'center',
	})
	.state.define('count', 0)
	.append(createBuilder('h2').text.set('Counter Demo').style.set({ margin: '0 0 20px 0', color: '#333' }));

// Lưu reference display builder
const displayBuilder = createBuilder('div')
	.state.define('displayText', '0')
	.style.set({
		fontSize: '48px',
		fontWeight: 'bold',
		margin: '20px 0',
		color: '#667eea',
	})
	.state.effect('displayText', function (value) {
		this.text.set(value);
	});

counterBuilder.append(displayBuilder);

// Buttons
const btnDecrement = createBuilder('button')
	.text.set('-')
	.style.set({
		padding: '10px 20px',
		fontSize: '20px',
		cursor: 'pointer',
		border: 'none',
		borderRadius: '5px',
		backgroundColor: '#e74c3c',
		color: 'white',
	})
	.event.on('click', function () {
		counterBuilder.state.use('count', (count, setCount) => {
			const newCount = count - 1;
			setCount(newCount);
			displayBuilder.state.use('displayText', (_, setDisplay) => {
				setDisplay(String(newCount));
			});
		});
	});

const btnReset = createBuilder('button')
	.text.set('Reset')
	.style.set({
		padding: '10px 20px',
		fontSize: '16px',
		cursor: 'pointer',
		border: 'none',
		borderRadius: '5px',
		backgroundColor: '#95a5a6',
		color: 'white',
	})
	.event.on('click', function () {
		counterBuilder.state.use('count', (_, setCount) => {
			setCount(0);
			displayBuilder.state.use('displayText', (_, setDisplay) => {
				setDisplay('0');
			});
		});
	});

const btnIncrement = createBuilder('button')
	.text.set('+')
	.style.set({
		padding: '10px 20px',
		fontSize: '20px',
		cursor: 'pointer',
		border: 'none',
		borderRadius: '5px',
		backgroundColor: '#27ae60',
		color: 'white',
	})
	.event.on('click', () => {
		counterBuilder.state.use('count', (count, setCount) => {
			const newCount = count + 1;
			setCount(newCount);
			displayBuilder.state.use('displayText', (_, setDisplay) => {
				setDisplay(String(newCount));
			});
		});
	});

counterBuilder.append(
	createBuilder('div')
		.style.set({ display: 'flex', gap: '10px', justifyContent: 'center' })
		.append(btnDecrement)
		.append(btnReset)
		.append(btnIncrement),
);

counterBuilder.attach(appBodyBuilder);

// Theme toggle
const themeBtn = createBuilder('button').style.set({
	padding: '12px 24px',
	fontSize: '16px',
	cursor: 'pointer',
	border: 'none',
	borderRadius: '5px',
	backgroundColor: '#3498db',
	color: 'white',
	marginTop: '20px',
	display: 'block',
	marginLeft: 'auto',
	marginRight: 'auto',
});

appBodyBuilder.state.use('theme', function (theme, setTheme) {
	themeBtn.state
		.define('isDark', theme === 'dark' ? true : false)
		.state.effect('isDark', function (isDark) {
			this.text.set(isDark ? '☀️ Light Mode' : '🌙 Dark Mode');
		})
		.event.on('click', function () {
			this.state.use('isDark', (isDark, setIsDark) => {
				const newMode = !isDark;
				const newTheme = newMode ? 'dark' : 'light';
				setIsDark(newMode);
				setTheme(newTheme);
				localStorage.setItem('theme', newTheme);
			});
		})
		.attach(this);
});

// Theme effect
appBodyBuilder.state.effect('theme', function (theme) {
	const isDark = theme === 'dark';
	this.style.set({
		backgroundColor: isDark ? '#2c3e50' : '#f0f0f0',
		color: isDark ? '#ecf0f1' : '#333',
	});

	counterBuilder.style.set({
		backgroundColor: isDark ? '#34495e' : 'white',
		color: isDark ? '#ecf0f1' : '#333',
	});

	displayBuilder.style.set({
		color: isDark ? '#3498db' : '#667eea',
	});
});
