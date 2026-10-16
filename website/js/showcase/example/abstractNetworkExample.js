/**
 * Base class of the network examples (js/webapp/net, js/webapp/qr): their own diagnostic page laid over the screen,
 * a role (main or sub), the pairing by QR code and the table of the players. Stopping one closes its sessions, its
 * camera and its pairing. English only, like every example.
 *
 * The page's elements carry data-el="name" (_el); its Menu button and the pause input both lead back to the menu.
 */
class AbstractNetworkExample extends AbstractShowcaseExample {
    constructor() {
        super();

        this._root         = null;
        this._scanner      = null;
        this._codes        = null;
        this._host         = null;
        this._guest        = null;
        this._pairing      = null;
        this._lobby        = [];
        this._refreshTimer = null;
    }

    _dispose() {
        if (this._refreshTimer !== null) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
        this._pairing?.cancel();
        this._host?.close();
        this._guest?.close();
        this._codes?.close();
        this._scanner?.close();
        if (this._root !== null) {
            this._root.remove();
            this._root = null;
        }
    }

    /**
     * The page, its Menu button wired, the QR library loading.
     *
     * @param {string} markup - static, without any user data
     * @returns {Promise<void>} settles once the QR library is ready
     */
    _mount(markup) {
        this._root           = document.createElement('div');
        this._root.className = 'showcase-network';
        this._root.innerHTML = markup;
        document.getElementById(AbstractShowcaseExample.SCREEN_ID).appendChild(this._root);
        this._on('menuButton', () => this._onExit());
        this._scanner = new QrScanner();

        return QrModule.prepare(appBootstrap.buildUrl(AbstractNetworkExample.WASM_URL));
    }

    _el(name) {
        return this._root.querySelector('[data-el="' + name + '"]');
    }

    _on(name, listener) {
        this._el(name).addEventListener('click', listener);
    }

    // A stopped example's late callbacks find no page: nothing to show.
    _setStatus(message) {
        if (this._root !== null) {
            this._el('status').textContent = message;
        }
    }

    _fail(error) {
        const code = ((error instanceof NetError) ? (' [' + error.getCode() + ((error.getDetail() !== null) ? (', ' + error.getDetail()) : '') + ']') : '');
        this._setStatus('Error' + code + ': ' + ((error instanceof Error) ? error.message : String(error)));
        console.error(error);
    }

    // The QR code and the camera, each with its caption, zoomable on click.
    _pairingView(captions) {
        const elements = {qr: this._el('qr'), camera: this._el('camera'), qrCaption: this._el('qrCaption'), cameraCaption: this._el('cameraCaption'), status: this._el('connecting')};

        return new QrPairingView(this._scanner, elements, captions, this._codes).enableZoom();
    }

    async _runPairing(pair) {
        this._el('cancelButton').classList.remove('hidden');
        this._el('stage').classList.remove('hidden');
        try {
            await pair();
        } catch (error) {
            if (!((error instanceof NetError) && (error.getCode() === NetError.CANCELLED))) {
                throw error;
            }
            this._setStatus('Pairing cancelled.');
        } finally {
            if (this._root !== null) {
                this._el('cancelButton').classList.add('hidden');
                this._el('stage').classList.add('hidden');
                this._refreshPlayers();
            }
        }
    }

    _removePlayer(id) {
        this._host.remove(this._host.getPeers().find((peer) => (peer.getId() === id)));
        this._setStatus('Player ' + id + ' removed.');
        this._refreshPlayers();
    }

    // The role is chosen once: its buttons go, the players refresh every second.
    _lockRole() {
        this._el('roleControls').classList.add('hidden');
        this._refreshPlayers();
        this._refreshTimer = setInterval(() => {
            this._everySecond();
            this._refreshPlayers();
        }, AbstractNetworkExample.REFRESH_PERIOD_MS);
    }

    // Before the players refresh, every second.
    _everySecond() {
    }

    _refreshPlayers() {
        throw new Error(this.constructor.name + '._refreshPlayers must be implemented');
    }

    /**
     * The players' table; the main can remove each sub.
     *
     * @param {string[]}                                columns
     * @param {{id: number|null}[]}                     players
     * @param {function({id: number|null}): string[]}   cells
     */
    _renderPlayers(columns, players, cells) {
        const table = this._el('players');
        table.textContent = '';
        const head = table.insertRow();
        for (const title of columns) {
            head.appendChild(document.createElement('th')).textContent = title;
        }
        for (const player of players) {
            const row = table.insertRow();
            for (const cell of cells(player)) {
                row.insertCell().textContent = cell;
            }
            if ((this._host !== null) && (player.id !== null)) {
                const remove = document.createElement('button');
                remove.textContent = 'Remove';
                remove.addEventListener('click', () => this._removePlayer(player.id));
                row.insertCell().appendChild(remove);
            }
        }
    }

    // The lobby the main broadcasts, read by a sub.
    _onGuestControl(message) {
        if (message.type !== AbstractNetworkExample.LOBBY_TYPE) {
            return;
        }
        this._lobby = message.players;
        this._refreshPlayers();
    }

    static _nickname() {
        return ('SUB ' + Math.floor(Math.random() * AbstractNetworkExample.NICKNAME_SUFFIXES));
    }

    static _bytesOf(text) {
        return Uint8Array.from(text, (c) => c.charCodeAt(0));
    }

    static _asciiOf(bytes) {
        return String.fromCharCode(...bytes);
    }

    static _pingText(ping) {
        return ((ping !== null) ? (ping.toFixed(1) + ' ms') : AbstractNetworkExample.NO_PING);
    }
}

AbstractNetworkExample.WASM_URL          = '/lib/zxing-wasm/zxing_full.wasm';
AbstractNetworkExample.REFRESH_PERIOD_MS = 1000;
AbstractNetworkExample.LOBBY_TYPE        = 'lobby';
AbstractNetworkExample.NICKNAME_SUFFIXES = 1000;
AbstractNetworkExample.NO_PING           = '—';
// The pairing stage and the players' table, the same in both examples.
AbstractNetworkExample.STAGE_MARKUP      = `
    <div>
        <button data-el="cancelButton" class="hidden">Cancel pairing</button>
    </div>
    <div data-el="status" class="status">Pick a role.</div>
    <div data-el="stage" class="stage hidden">
        <div class="tile">
            <div data-el="qr" class="frame qr"></div>
            <div data-el="qrCaption" class="caption"></div>
        </div>
        <div class="tile">
            <video data-el="camera" class="frame camera" playsinline muted></video>
            <div data-el="cameraCaption" class="caption"></div>
        </div>
        <div data-el="connecting" class="connecting"></div>
    </div>
    <table data-el="players"></table>`;
