/**
 * Controls/BrowserShortcutGuard.js
 *
 * While the TuroranRO PWA/game has focus, lock Ctrl/Alt/Meta (and common
 * Shift+modifier) combinations out of normal browser chrome actions so those
 * modifiers stay available for in-game use (shift-click, Alt shortcuts, etc.).
 *
 * Text fields (input / textarea / select / contenteditable), including those
 * inside Shadow DOM, keep normal browser shortcuts.
 *
 * TuroranRO / hercules-prere-plus issue #33.
 */

/**
 * Pierces Shadow DOM to the real focused element.
 * @returns {Element|null}
 */
function getDeepActiveElement() {
	let el = document.activeElement;
	while (el && el.shadowRoot && el.shadowRoot.activeElement) {
		el = el.shadowRoot.activeElement;
	}
	return el;
}

/**
 * True when the deep-focused element is a text/entry control.
 * @param {Element|null} el
 * @returns {boolean}
 */
function isTextEntry(el) {
	if (!el || !el.tagName) {
		return false;
	}
	if (/^(INPUT|TEXTAREA|SELECT)$/i.test(el.tagName)) {
		return true;
	}
	if (el.isContentEditable) {
		return true;
	}
	if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
		return true;
	}
	return false;
}

/**
 * Whether this key event would normally trigger browser chrome.
 * Bare Shift is left alone (shift-click / caps). Ctrl/Meta/Alt combos,
 * Alt alone, Shift+Fn, and F5/F11/F12 are blocked.
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
function isBrowserChromeShortcut(event) {
	const which = event.which || event.keyCode;

	// Alt alone / Alt+Arrow history / Alt+Letter menu mnemonics
	if (event.altKey && !event.ctrlKey && !event.metaKey) {
		return true;
	}

	// Ctrl/Cmd shortcuts: save, new tab/window, close, print, reload, find, ...
	if (event.ctrlKey || event.metaKey) {
		return true;
	}

	// Shift+Fn (e.g. Shift+F5 hard reload)
	if (event.shiftKey && which >= 112 && which <= 135) {
		return true;
	}

	return false;
}

/**
 * Capture-phase keydown: swallow browser defaults; do not stopPropagation
 * so in-game listeners still see Ctrl/Alt/Shift state.
 * @param {KeyboardEvent} event
 */
function onKeyDownCapture(event) {
	if (isTextEntry(getDeepActiveElement())) {
		return;
	}
	if (!isBrowserChromeShortcut(event)) {
		return;
	}
	event.preventDefault();
}

/**
 * Block Alt keyup menu-bar focus when not typing.
 * @param {KeyboardEvent} event
 */
function onKeyUpCapture(event) {
	if (isTextEntry(getDeepActiveElement())) {
		return;
	}
	if (event.key === 'Alt' || event.which === 18 || event.keyCode === 18) {
		event.preventDefault();
	}
}

let _installed = false;

/**
 * Install once. Safe to call repeatedly.
 */
export function installBrowserShortcutGuard() {
	if (_installed || typeof window === 'undefined') {
		return;
	}
	_installed = true;
	window.addEventListener('keydown', onKeyDownCapture, true);
	window.addEventListener('keyup', onKeyUpCapture, true);
}

installBrowserShortcutGuard();

export default {
	installBrowserShortcutGuard,
	isTextEntry,
	isBrowserChromeShortcut
};
