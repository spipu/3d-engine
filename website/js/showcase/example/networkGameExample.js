/**
 * The van over the network, through the synchronous cycle of the multiplayer design: the main sends the van pose to
 * every sub as a binary state, each sub answers with an empty command, and the next turn starts once every command
 * is in (or the command timeout has passed). A sub only draws what it receives.
 */
class NetworkGameExample extends AbstractNetworkExample {
    constructor() {
        super();

        this._sceneHost     = null;
        this._overlay       = null;
        this._scene         = null;
        this._sampler       = null;
        this._turn          = 0;
        this._turnSentAt    = 0;
        this._awaited       = new Set();
        this._turnsInPeriod = 0;
        this._turnRate      = 0;
    }

    _load() {
        VanScene.load();
    }

    _init() {
        const ready = this._mount(NetworkGameExample.MARKUP);
        const page  = document.getElementById(AbstractShowcaseExample.SCREEN_ID);

        this._sceneHost           = document.createElement('div');
        this._sceneHost.id        = NetworkGameExample.SCENE_ID;
        this._sceneHost.className = 'showcase-network-scene hidden';
        this._overlay             = document.createElement('div');
        this._overlay.className   = 'showcase-network-overlay hidden';
        this._overlay.innerHTML   = NetworkGameExample.OVERLAY_MARKUP;
        page.appendChild(this._sceneHost);
        page.appendChild(this._overlay);
        this._scene   = new VanScene(this._createScene({padControls: ['move'], screenId: NetworkGameExample.SCENE_ID}));
        this._sampler = new InputCommandSampler(this._inputs);
        this._bindHud([]);
        this._on('hostButton', () => this._startHost());
        this._on('joinButton', () => this._startJoin().catch((error) => this._fail(error)));
        this._on('addButton', () => this._addPlayer().catch((error) => this._fail(error)));
        this._on('driveButton', () => this._showScene(true));
        this._on('cancelButton', () => this._pairing.cancel());
        this._overlay.querySelector('[data-el="lobbyButton"]').addEventListener('click', () => this._showScene(false));
        ready.catch((error) => this._fail(error));
    }

    _frame(timestamp) {
        if (this._host !== null) {
            this._mainFrame(timestamp);
        } else if ((this._guest !== null) && this._isDriving()) {
            this._engine.calculateDeltaTime(timestamp);
            this._scene.render();
            this._screen.update();
        }
    }

    _dispose() {
        super._dispose();
        this._overlay?.remove();
        this._overlay = null;
        this._sceneHost?.remove();
        this._sceneHost = null;
    }

    // ---- main ----

    _startHost() {
        this._host = new NetHostSession(appBootstrap.getVersion(), () => new NetPeerLink())
            .setOnPeerOpen((peer) => {
                this._setStatus('Player ' + peer.getId() + ' (' + AbstractNetworkExample._asciiOf(peer.getPayload()) + ') joined.');
                this._refreshPlayers();
            })
            .setOnPeerBinary((peer, buffer) => this._onHostBinary(peer, buffer))
            .setOnPeerLost((peer, reason) => {
                this._awaited.delete(peer.getId());
                this._setStatus('Player ' + peer.getId() + ' lost: ' + reason + '.');
                this._refreshPlayers();
            });
        this._lockRole();
        this._pairing = new NetHostPairing(this._host, this._pairingView({
            show:       'Please scan it from a sub',
            read:       'Please scan the sub\'s answer',
            connecting: (payload) => ('Connecting to ' + AbstractNetworkExample._asciiOf(payload) + '…')
        }));
        this._el('hostControls').classList.remove('hidden');
        this._overlay.querySelector('[data-el="lobbyButton"]').classList.remove('hidden');
        this._setStatus('Add a player.');
    }

    async _addPlayer() {
        this._el('addButton').disabled = true;
        this._setStatus('Pairing a new player…');
        try {
            await this._runPairing(() => this._pairing.addPeer(new Uint8Array(0)));
        } finally {
            if (this._root !== null) {
                this._el('addButton').disabled = false;
            }
        }
    }

    _lobbyPlayers() {
        return [{id: null, name: 'Main', role: 'main', ping: null, state: this._turnRate + ' turns/s'}].concat(this._host.getPeers().map((peer) => ({
            id:    peer.getId(),
            name:  'Player ' + peer.getId() + ' ' + AbstractNetworkExample._asciiOf(peer.getPayload()),
            role:  'sub',
            ping:  peer.getPing(),
            state: (peer.isOpen() ? 'open' : 'connecting')
        })));
    }

    _mainFrame(timestamp) {
        if (this._isAwaitingCommands(timestamp)) {
            return;
        }
        this._engine.calculateDeltaTime(timestamp);
        const dt      = this._engine.getDeltaTime();
        const command = this._sampler.collect(dt).sample();
        if (this._isDriving()) {
            this._scene.drive(dt, command.getMoveX(), command.getMoveY());
            this._scene.render();
            this._screen.update();
        }
        this._broadcastState(timestamp);
    }

    _isAwaitingCommands(timestamp) {
        return ((this._awaited.size > 0) && ((timestamp - this._turnSentAt) < NetworkGameExample.COMMAND_TIMEOUT_MS));
    }

    _broadcastState(timestamp) {
        this._turn = ((this._turn + 1) >>> 0);
        const state = new NetByteWriter()
            .u8(NetworkGameExample.STATE_TYPE)
            .u32(this._turn)
            .f32(this._scene.getX())
            .f32(this._scene.getZ())
            .f32(this._scene.getAngle())
            .toBytes();
        this._awaited = new Set(this._host.getPeers().filter((peer) => peer.isOpen()).map((peer) => peer.getId()));
        this._host.broadcastBinary(state.buffer);
        this._turnSentAt = timestamp;
        this._turnsInPeriod++;
    }

    // A command answers one turn: any other turn's is dropped, never treated as an error.
    _onHostBinary(peer, buffer) {
        const reader = new NetByteReader(buffer);
        if (reader.u8() !== NetworkGameExample.COMMAND_TYPE) {
            return;
        }
        const answered = reader.u32();
        if (!reader.isAtEnd()) {
            peer.reportInvalid(new NetError(NetError.INVALID_MESSAGE, 'Trailing bytes in a command'));
            return;
        }
        if (answered === this._turn) {
            this._awaited.delete(peer.getId());
        }
    }

    // ---- sub ----

    async _startJoin() {
        const nickname = AbstractNetworkExample._nickname();

        this._guest = new NetGuestSession(appBootstrap.getVersion(), () => new NetPeerLink())
            .setOnOpen(() => this._setStatus('Connected to the main, waiting for it to drive.'))
            .setOnControl((message) => this._onGuestControl(message))
            .setOnBinary((buffer) => this._onGuestBinary(buffer))
            .setOnLost((reason) => {
                this._showScene(false);
                this._setStatus('Link to the main lost: ' + reason + '.');
            });
        this._lockRole();
        this._el('stage').classList.add('sub');
        this._pairing = new NetGuestPairing(this._guest, this._pairingView({
            show:       'Please show it to the main',
            read:       'Please scan the main QR code',
            connecting: () => 'Connecting…'
        }));
        this._setStatus('Waiting for the code of the main.');
        await this._runPairing(() => this._pairing.join(() => AbstractNetworkExample._bytesOf(nickname)));
    }

    _onGuestBinary(buffer) {
        const reader = new NetByteReader(buffer);
        if (reader.u8() !== NetworkGameExample.STATE_TYPE) {
            return;
        }
        this._turn = reader.u32();
        const x     = reader.f32();
        const z     = reader.f32();
        const angle = reader.f32();
        if (!reader.isAtEnd()) {
            this._guest.getHost().reportInvalid(new NetError(NetError.INVALID_MESSAGE, 'Trailing bytes in a state'));
            return;
        }
        this._scene.setPose(x, z, angle);
        this._guest.sendBinary(new NetByteWriter().u8(NetworkGameExample.COMMAND_TYPE).u32(this._turn).toBytes().buffer);
        if (!this._isDriving()) {
            this._showScene(true);
        }
    }

    // ---- shared ----

    _everySecond() {
        this._turnRate      = this._turnsInPeriod;
        this._turnsInPeriod = 0;
    }

    _isDriving() {
        return ((this._sceneHost !== null) && !this._sceneHost.classList.contains('hidden'));
    }

    _showScene(shown) {
        if (this._root === null) {
            return;
        }
        this._sceneHost.classList.toggle('hidden', !shown);
        this._overlay.classList.toggle('hidden', !shown);
        this._root.classList.toggle('hidden', shown);
    }

    _refreshPlayers() {
        const players = ((this._host !== null) ? this._lobbyPlayers() : this._lobby);
        const cells   = (player) => [player.name, player.role, AbstractNetworkExample._pingText(player.ping), player.state];

        this._renderPlayers(NetworkGameExample.PLAYER_COLUMNS, players, cells);
        this._overlay.querySelector('[data-el="overlayPlayers"]').textContent = players.map((player) => cells(player).join('  ')).join('\n');
        if (this._host !== null) {
            this._host.broadcastControl({type: AbstractNetworkExample.LOBBY_TYPE, players: players});
            this._el('driveButton').disabled = !this._host.getPeers().some((peer) => peer.isOpen());
        }
    }
}

NetworkGameExample.SCENE_ID           = 'networkScene';
NetworkGameExample.COMMAND_TIMEOUT_MS = 2000;
NetworkGameExample.STATE_TYPE         = 1;
NetworkGameExample.COMMAND_TYPE       = 2;
NetworkGameExample.PLAYER_COLUMNS     = Object.freeze(['Player', 'Role', 'Ping', 'State']);
NetworkGameExample.MARKUP             = `
    <h1>Network game</h1>
    <div>
        <button data-el="menuButton">Menu</button>
    </div>
    <div data-el="roleControls">
        <button data-el="hostButton">Host the game (main)</button>
        <button data-el="joinButton">Watch the game (sub)</button>
    </div>
    <div data-el="hostControls" class="hidden">
        <button data-el="addButton">Add a player</button>
        <button data-el="driveButton" disabled>Drive the van</button>
    </div>` + AbstractNetworkExample.STAGE_MARKUP;
NetworkGameExample.OVERLAY_MARKUP     = `
    <div data-el="overlayPlayers" class="showcase-network-players"></div>
    <button data-el="lobbyButton" class="hidden">Back to the lobby</button>`;
