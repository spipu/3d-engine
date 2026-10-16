/**
 * Three coloured lights circling over the ground; the movement input sets their height and their radius.
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
        loader.objects().loadByCode('light', './assets/objects/light.obj.json');
    }

    _init() {
        const engine = this._createScene({padControls: ['move']});

        this._sampler = new InputCommandSampler(this._inputs);
        this._positions = LightsExample.COLORS.map(() => [0, 0, 0]);
        this._lights    = LightsExample.COLORS.map((color, i) => new Light(color, LightsExample.LIGHT_RADIUS, this._positions[i]));
        engine.setFov(45.0);
        engine.setZBuffer(1, 100);
        engine.setBackground(10, 10, 10);
        engine.setLightAmbient([20., 20., 20.]);
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
        for (const position of this._positions) {
            engine.matrixPush();
            engine.matrixTranslate(position[0], position[1], position[2]);
            engine.drawObject(loader.objects().getByCode('light'));
            engine.matrixPop();
        }
        engine.drawObject(loader.objects().getByCode('ground'));
        engine.drawFinish();
        this._screen.update();
    }
}

LightsExample.COLORS       = Object.freeze([[255., 0., 0.], [0., 255., 0.], [0., 0., 255.]]);
LightsExample.LIGHT_RADIUS = 30;
LightsExample.START_HEIGHT = 25.;
LightsExample.START_RADIUS = 5.;
LightsExample.MAX_DISTANCE = 30;
// Units a millisecond at full deflection.
LightsExample.SPEED        = 0.015;
