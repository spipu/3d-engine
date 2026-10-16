/**
 * Test bench of the network layer: real devices pair by QR code, loopback tabs through a BroadcastChannel; the main
 * measures every link (ping, route, a 200 KB burst checked on arrival), every step logged and reportable.
 */
class NetworkBenchExample extends AbstractNetworkExample {
    constructor() {
        super();

        this._startedAt = 0;
        this._metrics   = new Map();
        this._bursts    = new Map();
        this._routes    = new Map();
        this._codeShown = 0;
        this._codeRead  = 0;
    }

    _init() {
        const ready = this._mount(NetworkBenchExample.MARKUP);
        const start = performance.now();

        this._startedAt = start;
        this._on('hostButton', () => this._startHost());
        this._on('joinButton', () => this._startJoin().catch((error) => this._fail(error)));
        this._on('addButton', () => this._addPlayer().catch((error) => this._fail(error)));
        this._on('burstButton', () => this._sendBurst());
        this._on('cancelButton', () => this._pairing.cancel());
        this._on('copyButton', () => this._copyReport());
        this._setMetric('Version', appBootstrap.getVersion());
        this._setMetric('Secure context', window.isSecureContext);
        // enumerateDevices only settles once the page is visible: never wait on it.
        CameraProbe.isAvailable().then((available) => this._setMetric('Camera available', available));
        ready.then(() => this._setMetric('QR library', 'ready in ' + NetworkBenchExample._ms(performance.now() - start)))
            .catch((error) => this._fail(error));
    }

    _frame() {
    }

    _log(message) {
        if (this._root === null) {
            return;
        }
        const log = this._el('log');
        log.textContent += ('[' + String(Math.round(performance.now() - this._startedAt)).padStart(NetworkBenchExample.LOG_TIME_WIDTH) + ' ms] ' + message + '\n');
        log.scrollTop    = log.scrollHeight;
    }

    _setStatus(message) {
        super._setStatus(message);
        this._log('STATUS ' + message);
    }

    _setMetric(name, value) {
        if (this._root === null) {
            return;
        }
        this._metrics.set(name, String(value));
        const table = this._el('metrics');
        table.textContent = '';
        for (const [key, text] of this._metrics) {
            const row = table.insertRow();
            row.insertCell().textContent = key;
            row.insertCell().textContent = text;
        }
    }

    _pairingView(captions) {
        return super._pairingView(captions)
            .setOnCameraOpen((settings, openMs) => {
                this._setMetric('Camera', 'open in ' + NetworkBenchExample._ms(openMs) + ', ' + settings.width + '×' + settings.height
                    + (settings.facingMode ? (' ' + settings.facingMode) : ''));
                this._log('Camera opened: ' + this._scanner.describeStream());
            })
            .setOnCameraClose((stopped) => this._log('Camera closed: ' + ((stopped.length > 0) ? stopped.join(', ') : 'was not open')))
            .setOnCodeShown((bytes, modules, encodeMs, link) => {
                this._codeShown = performance.now();
                this._setMetric('Last code', bytes.length + ' bytes, ' + modules + ' modules with quiet zone, encoded in ' + NetworkBenchExample._ms(encodeMs));
                this._describeLocalCandidates(link);
            })
            .setOnCodeRead((stats) => {
                this._codeRead = performance.now();
                if (stats !== null) {
                    this._setMetric('Last scan', 'code seen after ' + NetworkBenchExample._ms(stats.waitingMs) + ' (human time), read ' + NetworkBenchExample._ms(stats.readMs)
                        + ' later; ' + stats.frames + ' frames, decode ' + NetworkBenchExample._ms(stats.decodeMs / stats.frames) + '/frame at ' + stats.width + ' px');
                }
            });
    }

    _describeLocalCandidates(link) {
        if (!(link instanceof NetPeerLink)) {
            return;
        }
        const candidates = link.getLocalCandidates();
        const hosts      = candidates.filter((c) => (c.type === 'host'));
        this._setMetric('Local candidates', candidates.map((c) => (c.type + ' ' + c.address + ':' + c.port)).join(' | '));
        this._setMetric('Host addresses', ((hosts.length === 0) ? 'none'
            : (hosts.every((c) => c.address.endsWith('.local')) ? 'mDNS only (hidden)' : 'real addresses')));
        this._setMetric('STUN reached', (candidates.some((c) => (c.type === 'srflx')) ? 'yes' : 'no'));
    }

    // ---- main ----

    _startHost() {
        this._chooseRole('main');
        this._host = new NetHostSession(appBootstrap.getVersion(), this._linkFactory())
            .setOnPeerOpen((peer) => {
                this._setMetric('Link open (player ' + peer.getId() + ')', NetworkBenchExample._ms(performance.now() - this._codeRead) + ' after its answer was read');
                this._setStatus('Player ' + peer.getId() + ' (' + AbstractNetworkExample._asciiOf(peer.getPayload()) + ') joined.');
                this._refreshPlayers();
            })
            .setOnPeerControl((peer, message) => this._onHostControl(peer, message))
            .setOnPeerLost((peer, reason) => {
                this._setStatus('Player ' + peer.getId() + ' lost: ' + reason + '.');
                this._refreshPlayers();
            });
        this._pairing = new NetHostPairing(this._host, this._pairingView({
            show:       'Please scan it from a sub',
            read:       'Please scan the sub\'s answer',
            connecting: (payload) => ('Connecting to ' + AbstractNetworkExample._asciiOf(payload) + '…')
        }));
        this._el('hostControls').classList.remove('hidden');
        this._setStatus('Add a player.');
    }

    // A random stand-in for a game's content hash, one byte longer, its last left at 0 as the original bench sent it.
    async _addPlayer() {
        const payload = new Uint8Array(NetworkBenchExample.SIMULATED_HASH_BYTES + 1);
        crypto.getRandomValues(payload.subarray(0, NetworkBenchExample.SIMULATED_HASH_BYTES));
        this._el('addButton').disabled = true;
        this._setStatus('Pairing a new player…');
        try {
            await this._runPairing(() => this._pairing.addPeer(payload));
        } finally {
            if (this._root !== null) {
                this._el('addButton').disabled = false;
            }
        }
    }

    _sendBurst() {
        const buffer = new Uint8Array(NetworkBenchExample.BURST_BYTES + 1);
        for (let offset = 1; offset < buffer.length; offset += NetworkBenchExample.RANDOM_BLOCK_BYTES) {
            crypto.getRandomValues(buffer.subarray(offset, (offset + NetworkBenchExample.RANDOM_BLOCK_BYTES)));
        }
        buffer[0] = NetworkBenchExample.BURST_TYPE;
        const expected = NetworkBenchExample._checksum(buffer);
        for (const peer of this._host.getPeers()) {
            this._bursts.set(peer.getId(), {sent: performance.now(), expected: expected, result: 'sending…'});
        }
        this._host.broadcastBinary(buffer.buffer);
        this._refreshPlayers();
    }

    _onHostControl(peer, message) {
        if (message.type !== NetworkBenchExample.BURST_REPLY) {
            return;
        }
        const burst = this._bursts.get(peer.getId());
        burst.result = ((((message.sum === burst.expected) && (message.size === (NetworkBenchExample.BURST_BYTES + 1))) ? 'ok' : 'CORRUPTED')
            + ' in ' + NetworkBenchExample._ms(performance.now() - burst.sent));
        this._refreshPlayers();
    }

    _lobbyPlayers() {
        return [{id: null, name: 'Main', role: 'main', state: '', ping: null, route: '', burst: ''}].concat(this._host.getPeers().map((peer) => ({
            id:    peer.getId(),
            name:  'Player ' + peer.getId() + ' ' + AbstractNetworkExample._asciiOf(peer.getPayload()),
            role:  'sub',
            state: (peer.isOpen() ? 'open' : 'connecting'),
            ping:  peer.getPing(),
            route: (this._routes.get(peer.getId()) ?? ''),
            burst: (this._bursts.get(peer.getId())?.result ?? '')
        })));
    }

    // ---- sub ----

    async _startJoin() {
        const nickname = AbstractNetworkExample._nickname();

        this._chooseRole('sub');
        this._el('stage').classList.add('sub');
        this._setMetric('Nickname', nickname);
        this._guest = new NetGuestSession(appBootstrap.getVersion(), this._linkFactory())
            .setOnOpen(() => {
                this._setMetric('Link open', NetworkBenchExample._ms(performance.now() - this._codeShown) + ' after the answer was shown (ICE window)');
                this._setStatus('Connected to the main.');
            })
            .setOnControl((message) => this._onGuestControl(message))
            .setOnBinary((buffer) => this._onGuestBinary(buffer))
            .setOnLost((reason) => this._setStatus('Link to the main lost: ' + reason + '.'));
        this._pairing = new NetGuestPairing(this._guest, this._pairingView({
            show:       'Please show it to the main',
            read:       'Please scan the main QR code',
            connecting: () => 'Connecting…'
        }));
        this._setStatus('Waiting for the code of the main.');
        await this._runPairing(() => this._pairing.join(() => AbstractNetworkExample._bytesOf(nickname)));
    }

    _onGuestBinary(buffer) {
        const bytes = new Uint8Array(buffer);
        if (bytes[0] !== NetworkBenchExample.BURST_TYPE) {
            return;
        }
        this._guest.sendControl({type: NetworkBenchExample.BURST_REPLY, size: bytes.length, sum: NetworkBenchExample._checksum(bytes)});
        this._setMetric('Last burst', bytes.length + ' bytes received');
    }

    // ---- shared ----

    // Loopback (two tabs, no camera) is read when the role is chosen.
    _chooseRole(role) {
        if (this._el('loopback').checked) {
            this._codes = new NetLoopbackCodeChannel();
        }
        this._setMetric('Role', role + ((this._codes !== null) ? ' (loopback)' : ''));
        this._lockRole();
    }

    _linkFactory() {
        return ((this._codes !== null) ? () => new NetLoopbackLink() : () => new NetPeerLink());
    }

    _refreshPlayers() {
        if (this._guest !== null) {
            this._refreshGuestMetrics();
        }
        const players = ((this._host !== null) ? this._lobbyPlayers() : this._lobby);
        this._renderPlayers(NetworkBenchExample.PLAYER_COLUMNS, players, (player) => [
            player.name, player.role, player.state, AbstractNetworkExample._pingText(player.ping), player.route, player.burst
        ]);
        if (this._host === null) {
            return;
        }
        for (const peer of this._host.getPeers()) {
            peer.getLink().describeRoute().then((route) => this._routes.set(peer.getId(), route));
        }
        this._host.broadcastControl({type: AbstractNetworkExample.LOBBY_TYPE, players: players});
    }

    _refreshGuestMetrics() {
        const main = this._guest.getHost();
        if ((main === null) || !main.isOpen()) {
            return;
        }
        this._setMetric('Ping to the main', AbstractNetworkExample._pingText(main.getPing()));
        main.getLink().describeRoute().then((route) => this._setMetric('Route to the main', route));
    }

    _report() {
        const lines = ['Network test bench report — ' + new Date().toISOString(), navigator.userAgent];
        for (const [key, value] of this._metrics) {
            lines.push(key + ': ' + value);
        }
        lines.push('', this._el('players').innerText, '', this._el('log').textContent);

        return lines.join('\n');
    }

    async _copyReport() {
        try {
            await navigator.clipboard.writeText(this._report());
            this._log('Report copied to the clipboard.');
        } catch (error) {
            this._log('Clipboard refused: ' + error.message);
        }
    }

    static _checksum(bytes) {
        let sum = 0;
        for (const byte of bytes) {
            sum = (((sum * NetworkBenchExample.CHECKSUM_FACTOR) + byte) >>> 0);
        }

        return sum;
    }

    static _ms(value) {
        return (Math.round(value) + ' ms');
    }
}

NetworkBenchExample.SIMULATED_HASH_BYTES = 32;
NetworkBenchExample.BURST_TYPE           = 1;
NetworkBenchExample.BURST_BYTES          = (200 * 1024);
NetworkBenchExample.BURST_REPLY          = 'burstReceived';
// crypto.getRandomValues fills at most 64 KB a call.
NetworkBenchExample.RANDOM_BLOCK_BYTES   = 65536;
NetworkBenchExample.CHECKSUM_FACTOR      = 31;
NetworkBenchExample.LOG_TIME_WIDTH       = 7;
NetworkBenchExample.PLAYER_COLUMNS       = Object.freeze(['Player', 'Role', 'State', 'Ping', 'Route', 'Burst']);
NetworkBenchExample.MARKUP               = `
    <h1>Network test bench</h1>
    <div>
        <button data-el="menuButton">Menu</button>
        <button data-el="copyButton">Copy report</button>
    </div>
    <div data-el="roleControls">
        <button data-el="hostButton">Host a game (main)</button>
        <button data-el="joinButton">Join a game (sub)</button>
        <label><input type="checkbox" data-el="loopback" /> Loopback (two tabs, no camera)</label>
    </div>
    <div data-el="hostControls" class="hidden">
        <button data-el="addButton">Add a player</button>
        <button data-el="burstButton">Send a 200 KB burst</button>
    </div>` + AbstractNetworkExample.STAGE_MARKUP + `
    <table data-el="metrics" class="metrics"></table>
    <div data-el="log" class="log"></div>`;
