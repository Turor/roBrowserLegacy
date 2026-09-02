/**
 * Network/SocketHelpers/WebSocket.js
 *
 * HTML5 WebSocket if the server support the protocole
 *
 * This file is part of ROBrowser, (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */

/**
 * HTML5 WebSocket System
 *
 * @param {string} url
 */
function Socket(host, port, proxy) {
	let url = 'ws://' + host + ':' + port + '/';
	const self = this;
	this.connected = false;

	// Use of a proxy
	if (proxy) {
		url = proxy;

		if (!url.match(/\/$/)) {
			url += '/';
		}

		url += host + ':' + port;
	}

	// Open Websocket
	this.ws = new WebSocket(url);
	this.ws.binaryType = 'arraybuffer';

	this.ws.onopen = function OnOpen() {
		self.connected = true;
		self.onComplete(true);
	};

	this.ws.onerror = function OnError() {
		if (!self.connected) {
			self.onComplete(false);
		}
	};

	this.ws.onmessage = function OnMessage(event) {
		const data = event.data;
		if (data instanceof ArrayBuffer) {
			self.onMessage(data);
			return;
		}
		// iOS Safari can deliver binary as Blob even with binaryType set.
		if (data && typeof data.arrayBuffer === 'function') {
			data.arrayBuffer().then(function (buf) {
				self.onMessage(buf);
			});
			return;
		}
		self.onMessage(data);
	};

	this.ws.onclose = function OnClose() {
		self.connected = false;
		this.close();

		if (self.onClose) {
			self.onClose();
		}
	};
}

/**
 * Sending packet to applet
 *
 * @param {ArrayBuffer} buffer
 */
Socket.prototype.send = function Send(buffer) {
	if (this.connected) {
		this.ws.send(buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer);
	}
};

/**
 * Closing connection to server
 */
Socket.prototype.close = function Close() {
	if (this.connected) {
		this.ws.close();
		this.connected = false;
	}
};

/**
 * Export
 */
export default Socket;
