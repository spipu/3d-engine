/**
 * Base class of the examples, each run inside the showcase like a level: start loads its files into the engine's
 * loader, then builds its scene and runs its frame loop; the pause input (Escape, gamepad Start, the menu button of
 * the touch pad, a pointer lock lost) hands it back to the menu, which stops it.
 *
 * An example gives its files (_load), its scene (_init), its frame (_frame) and what it frees beyond the screen and
 * the engine (_dispose).
 */
class AbstractShowcaseExample {
    constructor() {
        this._inputs       = new Inputs();
        this._screen       = null;
        this._engine       = null;
        this._onExit       = null;
        this._frameRequest = null;
        this._running      = false;
    }

    /**
     * @param {function()} onExit - called once the player asks for the menu
     */
    start(onExit) {
        this._onExit  = onExit;
        this._running = true;
        loader.reset();
        loader.beginBatch();
        this._load();
        loader.setCallback(() => {
            loader.clearCallback();
            if (this._running) {
                this._init();
                this._requestFrame();
            }
        });
        loader.endBatch();

        return this;
    }

    stop() {
        this._running = false;
        if (this._frameRequest !== null) {
            cancelAnimationFrame(this._frameRequest);
            this._frameRequest = null;
        }
        this._dispose();
        if (this._engine !== null) {
            this._engine.destroy();
            this._engine = null;
        }
        if (this._screen !== null) {
            this._screen.destroyContainer();
            this._screen = null;
        }
        loader.reset();

        return this;
    }

    _load() {
    }

    _init() {
        throw new Error(this.constructor.name + '._init must be implemented');
    }

    /**
     * @param {number} timestamp - of requestAnimationFrame
     */
    _frame(timestamp) {
        throw new Error(this.constructor.name + '._frame must be implemented');
    }

    _dispose() {
    }

    /**
     * The 16:9 letterboxed screen and its engine; the touch pad shows the given controls and always the menu button.
     *
     * The renderer is the one of the options.
     *
     * @param {{padControls?: string[], padPlaces?: object, mouseLock?: boolean, screenId?: string}} options -
     *        padControls among AbstractShowcaseExample.PAD_CONTROLS (none by default); padPlaces: control -> {x, y},
     *        over AbstractShowcaseExample.PAD_PLACES; mouseLock: the mouse looks around (off by default); screenId:
     *        the element the screen goes in, the page's screen by default
     */
    _createScene(options = {}) {
        const shown = (options.padControls ?? []);

        this._screen = new ScreenManager((options.screenId ?? AbstractShowcaseExample.SCREEN_ID), {
            fullscreen:    true,
            virtualWidth:  AbstractShowcaseExample.VIRTUAL_WIDTH,
            virtualHeight: AbstractShowcaseExample.VIRTUAL_HEIGHT
        });
        this._inputs.bindScreen(this._screen).setMouseLockAllowed(options.mouseLock === true);
        for (const control of AbstractShowcaseExample.PAD_CONTROLS) {
            this._inputs.setVirtualPadControlAllowed(control, (shown.includes(control) || (control === AbstractShowcaseExample.MENU_CONTROL)));
        }
        // The pad is shared by every example: each button back to its place, then the example's own.
        const places = Object.assign({}, AbstractShowcaseExample.PAD_PLACES, (options.padPlaces ?? {}));
        for (const control of Object.keys(InputVirtualGamepad.BUTTONS)) {
            const place = (places[control] ?? InputVirtualGamepad.BUTTONS[control]);
            this._inputs.setVirtualPadButtonPosition(control, place.x, place.y);
        }
        this._engine = new Engine3d(this._screen, new Object3dRendererList().getRenderer(showcaseSettings.get(ShowcaseSettings.RENDERER_KEY)));

        return this._engine;
    }

    /**
     * The debug HUD: frame rate and renderer, then the given lines and the copyright.
     *
     * @param {string[]} lines
     * @returns {HudDebug}
     */
    _bindHud(lines) {
        const hud = new HudDebug(this._engine);
        for (const line of [...lines, AbstractShowcaseExample.COPYRIGHT]) {
            hud.addDescription(line);
        }
        this._screen.bindHud(hud);

        return hud;
    }

    _requestFrame() {
        this._frameRequest = requestAnimationFrame((timestamp) => this._tick(timestamp));
    }

    _tick(timestamp) {
        this._frameRequest = null;
        if (this._inputs.readButtonPause()) {
            this._onExit();
            return;
        }
        this._frame(timestamp);
        if (this._running) {
            this._requestFrame();
        }
    }
}

AbstractShowcaseExample.SCREEN_ID      = 'screen';
AbstractShowcaseExample.VIRTUAL_WIDTH  = 1920;
AbstractShowcaseExample.VIRTUAL_HEIGHT = 1080;
AbstractShowcaseExample.COPYRIGHT      = '(c)2026 Spipu';
// Every target of the touch pad (Inputs.setVirtualPadControlAllowed); the pause one is the button back to the menu.
AbstractShowcaseExample.PAD_CONTROLS   = Object.freeze(['jump', 'crouch', 'action', 'pause', 'weaponNext', 'map', 'run', 'fire', 'move', 'aim']);
AbstractShowcaseExample.MENU_CONTROL   = 'pause';
// The showcase's own places of the pad buttons (top left corner, fractions of the screen): the menu in the top left
// corner, as far from the edge as the right column; the others where the engine puts them.
AbstractShowcaseExample.PAD_PLACES     = Object.freeze({
    pause: Object.freeze({x: InputVirtualGamepad.COLUMN_EDGE_MARGIN, y: InputVirtualGamepad.BUTTONS.pause.y})
});
// The top right corner of the pad, as far from the edges as the right column (for a button of the usual size).
AbstractShowcaseExample.PAD_TOP_RIGHT  = Object.freeze({x: InputVirtualGamepad.BUTTONS.jump.x, y: InputVirtualGamepad.BUTTONS.pause.y});
