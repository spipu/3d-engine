/**
 * Three coloured lights circling over the ground; the movement input sets their height and their radius. Each light
 * is shown by a small glowing ball (faces marked glow), haloed by the bloom with the WebGL renderer.
 */
class LightsExample extends AbstractShowcaseExample {
    constructor() {
        super();

        this._sampler   = null;
        this._lights    = [];
        this._positions = [];
        this._height  = LightsExample.START_HEIGHT;
        this._radius  = LightsExample.START_RADIUS;
    }

    _load() {
        loader.objects().loadByCode('ground', './assets/objects/ground.obj.json');
        LightsExample.COLORS.forEach((color, i) => loader.objects().loadFromData(LightsExample.BALL + i, LightsExample._ballData(color)));
    }

    _init() {
        const engine = this._createScene({padControls: ['move']});

        this._sampler = new InputCommandSampler(this._inputs);
        this._positions = LightsExample.COLORS.map(() => [0, 0, 0]);
        this._lights    = LightsExample.COLORS.map((color, i) => new Light(color, LightsExample.LIGHT_RADIUS, this._positions[i]));
        engine.setFov(45.0);
        engine.setZBuffer(1, 100);
        engine.setBackground(10, 10, 10);
        engine.setLightAmbient(LightsExample.AMBIENT);
        engine.setBloom({});
        this._lights.forEach((light) => engine.addLight(light));
        this._bindHud(['Use the keyboard to move the lights']).bindInputs(this._inputs);
    }

    _frame(timestamp) {
        const engine = this._engine;

        engine.calculateDeltaTime(timestamp);
        const dt      = engine.getDeltaTime();
        const command = this._sampler.collect(dt).sample();
        this._height = Math.min(Math.max((this._height + (dt * LightsExample.SPEED * command.getMoveY())), 0), LightsExample.MAX_DISTANCE);
        this._radius = Math.min(Math.max((this._radius + (dt * LightsExample.SPEED * command.getMoveX())), 0), LightsExample.MAX_DISTANCE);

        // Evenly spread around the vertical axis; each light reads its own array, moved in place.
        this._positions.forEach((position, i) => {
            const angle = ((i * 2 * Math.PI) / this._positions.length);
            position[0] = (this._radius * Math.cos(angle));
            position[1] = this._height;
            position[2] = (this._radius * Math.sin(angle));
        });

        engine.drawInit();
        engine.matrixIdentity();
        engine.matrixRotateZ(180);
        engine.matrixRotateX(180);
        engine.matrixTranslate(0, -5, -60);
        engine.matrixRotateX(45);
        engine.lightsCalculatePosition();
        engine.drawObject(loader.objects().getByCode('ground'));
        // A ball shows its light's colour as it is: full ambient light while the balls are drawn.
        engine.setLightAmbient(LightsExample.FULL_LIGHT);
        this._positions.forEach((position, i) => {
            engine.matrixPush();
            engine.matrixTranslate(position[0], position[1], position[2]);
            engine.drawObject(loader.objects().getByCode(LightsExample.BALL + i));
            engine.matrixPop();
        });
        engine.setLightAmbient(LightsExample.AMBIENT);
        engine.drawFinish();
        this._screen.update();
    }

    /**
     * An icosahedron split once (80 faces) of radius BALL_RADIUS, every face glowing in the given colour. Each face
     * gets its own colour array: Object3d.fcAdd rewrites it in place.
     */
    static _ballData(color) {
        const t      = ((1 + Math.sqrt(5)) / 2);
        const corner = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
        const ico    = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
        const points = corner.map((p) => LightsExample._onBall(p));
        const middle = new Map();
        const mid    = (a, b) => {
            const key = ((a < b) ? (a + '-' + b) : (b + '-' + a));
            if (!middle.has(key)) {
                points.push(LightsExample._onBall([(points[a][0] + points[b][0]), (points[a][1] + points[b][1]), (points[a][2] + points[b][2])]));
                middle.set(key, (points.length - 1));
            }

            return middle.get(key);
        };
        const faces = [];
        for (const [a, b, c] of ico) {
            const ab = mid(a, b);
            const bc = mid(b, c);
            const ca = mid(c, a);
            for (const tri of [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]) {
                faces.push({pts: tri.map((index) => (index + 1)), color: [...color], glow: true});
            }
        }

        return {points: points, faces: faces};
    }

    static _onBall(p) {
        const scale = (LightsExample.BALL_RADIUS / Math.hypot(p[0], p[1], p[2]));

        return [(p[0] * scale), (p[1] * scale), (p[2] * scale)];
    }
}

LightsExample.COLORS       = Object.freeze([[255., 0., 0.], [0., 255., 0.], [0., 0., 255.]]);
LightsExample.AMBIENT      = Object.freeze([20., 20., 20.]);
LightsExample.FULL_LIGHT   = Object.freeze([255., 255., 255.]);
LightsExample.BALL         = 'lightBall';
LightsExample.BALL_RADIUS  = 0.6;
LightsExample.LIGHT_RADIUS = 30;
LightsExample.START_HEIGHT = 25.;
LightsExample.START_RADIUS = 5.;
LightsExample.MAX_DISTANCE = 30;
// Units a millisecond at full deflection.
LightsExample.SPEED        = 0.015;
