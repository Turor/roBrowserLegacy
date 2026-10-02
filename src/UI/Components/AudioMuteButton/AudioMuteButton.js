/**
 * UI/Components/AudioMuteButton/AudioMuteButton.js
 *
 * Mute button that sits beside the minimap.
 * Silences BGM and sound effects on this client only.
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 */

import BGM from 'Audio/BGM.js';
import SoundManager from 'Audio/SoundManager.js';
import Configs from 'Core/Configs.js';
import PACKETVER from 'Network/PacketVerManager.js';
import AudioSettings from 'Preferences/Audio.js';
import UIManager from 'UI/UIManager.js';
import GUIComponent from 'UI/GUIComponent.js';
import htmlText from './AudioMuteButton.html?raw';
import cssText from './AudioMuteButton.css?raw';

const AudioMuteButton = new GUIComponent('AudioMuteButton', cssText);

AudioMuteButton.render = () => htmlText;
AudioMuteButton.needFocus = false;
AudioMuteButton.mouseMode = GUIComponent.MouseMode.STOP;

AudioMuteButton.init = function init() {
	const root = this.getRoot();
	const btn = root.querySelector('.mute');
	if (!btn) {
		return;
	}
	btn.addEventListener('mousedown', event => {
		event.stopImmediatePropagation();
	});
	btn.addEventListener('click', event => {
		event.stopImmediatePropagation();
		event.preventDefault();
		AudioMuteButton.toggle();
	});
};

AudioMuteButton.onAppend = function onAppend() {
	// Sit just left of the minimap. Cash shop already occupies that slot on V2.
	const v2 = PACKETVER.value >= 20180124;
	const mapRight = v2 ? 16 : 2;
	const mapWidth = 128;
	let right = mapRight + mapWidth + 8;
	if (v2 && Configs.get('enableCashShop')) {
		right = 145 + 43 + 8;
	}
	this._host.style.top = `${v2 ? 16 : 2}px`;
	this._host.style.right = `${right}px`;
	this._host.style.zIndex = '60';
	this.sync();
};

/**
 * Toggle local mute. Other clients and other players are unaffected.
 */
AudioMuteButton.toggle = function toggle() {
	AudioSettings.muted = !AudioSettings.muted;
	AudioSettings.save();
	AudioMuteButton.apply();
	AudioMuteButton.sync();
};

/**
 * Stop or resume audio to match the saved mute flag.
 */
AudioMuteButton.apply = function apply() {
	if (AudioSettings.muted) {
		BGM.stop();
		SoundManager.stop();
		return;
	}

	if (AudioSettings.BGM.play && BGM.filename) {
		if (BGM.audio && BGM.audio.src && BGM.audio.paused) {
			BGM.audio.volume = BGM.volume;
			const playPromise = BGM.audio.play();
			if (playPromise) {
				playPromise.catch(err => {
					if (err.name !== 'AbortError') {
						console.warn('Failed to resume BGM:', err);
					}
				});
			}
		} else {
			BGM.play(BGM.filename);
		}
	}
};

/**
 * Match the button glyph and label to the current mute flag.
 */
AudioMuteButton.sync = function sync() {
	const root = this.getRoot();
	if (!root) {
		return;
	}
	const btn = root.querySelector('.mute');
	if (!btn) {
		return;
	}
	const muted = !!AudioSettings.muted;
	btn.classList.toggle('is-muted', muted);
	btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
	btn.title = muted ? 'Unmute audio (this client)' : 'Mute audio (this client)';
	btn.setAttribute('aria-label', btn.title);
};

export default UIManager.addComponent(AudioMuteButton);
