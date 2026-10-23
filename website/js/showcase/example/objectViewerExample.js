/**
 * One object turned by the player: the mouse or a finger dragged on the screen, or the movement stick.
 */
class ObjectViewerExample extends AbstractShowcaseExample {
    /**
     * @param {string} code - a file of assets/objects/, by name
     */
    constructor(code) {
        super();

        this._code      = code;
        this._angleX    = 0;
        this._angleY    = 0;
        this._drag      = null;
        this._dragArea  = null;
        this._listeners = null;
    }

    _load() {
        loader.objects().loadByCode(this._code, './assets/objects/' + this._code + '.obj.json');
    }

    _init() {
        const engine = this._createScene({padControls: ['move']});
        const object = loader.objects().getByCode(this._code);

        engine.setBackground(35, 35, 35);
        engine.setFov(45.0);
        engine.setZBuffer(1, 100);
        engine.setLightAmbient([40., 40., 40.]);
        engine.addLight(new Light([250., 250., 250.], 40, [0., 5, 10.]));
        engine.addLight(new Light([250., 0., 0.], 30, [20., 0, 0.]));
        engine.addLight(new Light([0., 0., 250.], 30, [-20., 0, 0.]));
        this._bindHud([this._code + ' | ' + object.getVertexCount() + ' pts | ' + object.getFaceCount() + ' faces', 'Drag the object, or the movement stick, to turn it'])
            .bindInputs(this._inputs);
        this._listenToDrags(this._screen.getCanvas());
    }

    _frame(timestamp) {
        const engine = this._engine;

        engine.calculateDeltaTime(timestamp);
        const dt = engine.getDeltaTime();
        this._angleY -= (this._inputs.readJoy1X() * ObjectViewerExample.STICK_SPEED * dt);
        this._angleX += (this._inputs.readJoy1Y() * ObjectViewerExample.STICK_SPEED * dt);
        engine.drawInit();
        engine.matrixIdentity();
        engine.lightsCalculatePosition();
        engine.matrixTranslate(0, 0, ObjectViewerExample.DISTANCE);
        engine.matrixRotateY(this._angleY);
        engine.matrixRotateX(this._angleX);
        engine.drawObject(loader.objects().getByCode(this._code));
        engine.drawFinish();
        this._screen.update();
    }

    _dispose() {
        if (this._listeners !== null) {
            for (const [type, listener] of this._listeners) {
                this._dragArea.removeEventListener(type, listener);
            }
            this._listeners = null;
            this._dragArea  = null;
        }
    }

    // Pointer events: the mouse and a finger alike, a drag across the screen width = a half turn.
    _listenToDrags(canvas) {
        const listeners = new Map([
            ['pointerdown', (e) => {
                this._drag = {x: e.clientX, y: e.clientY};
            }],
            ['pointermove', (e) => {
                if (this._drag === null) {
                    return;
                }
                const degreesPerPixel = (ObjectViewerExample.DRAG_DEGREES / canvas.getBoundingClientRect().width);
                this._angleY -= ((e.clientX - this._drag.x) * degreesPerPixel);
                this._angleX -= ((e.clientY - this._drag.y) * degreesPerPixel);
                this._drag    = {x: e.clientX, y: e.clientY};
            }],
            ['pointerup', () => {
                this._drag = null;
            }],
            ['pointercancel', () => {
                this._drag = null;
            }]
        ]);
        for (const [type, listener] of listeners) {
            canvas.addEventListener(type, listener);
        }
        this._dragArea  = canvas;
        this._listeners = listeners;
    }
}

// The 4:3 framing of the original viewer: its 35 units, times 4/3 for a field of view taken on the 16:9 width.
ObjectViewerExample.DISTANCE     = 47;
// Degrees a millisecond at full stick deflection.
ObjectViewerExample.STICK_SPEED  = 0.1;
ObjectViewerExample.DRAG_DEGREES = 180;
