/**
 * The van scene: a fixed camera over a lit ground, and one van whose pose (x, z, angle) is the whole state of the
 * scene. Shared by the van example and the network game, drawn by the engine of the example that holds it.
 */
class VanScene {
    /**
     * @param {Engine3d} engine - its lights are added to it
     */
    constructor(engine) {
        this._engine     = engine;
        this._x          = VanScene.START_X;
        this._z          = VanScene.START_Z;
        this._angle      = 0;
        this._sunLight   = new Light([255., 255., 255.], 30, [0., 25., 0.]);
        this._greenLight = new Light([0., 200., 0.], 5, [9, 2., 0.]);
        this._redLight   = new Light([200., 0., 0.], 5, [-8, 2., 0.]);

        engine.setFov(45.0);
        engine.setZBuffer(1, 100);
        engine.setBackground(20, 20, 20);
        engine.setLightAmbient([40., 40., 40.]);
        engine.addLight(this._sunLight);
        engine.addLight(this._greenLight);
        engine.addLight(this._redLight);
    }

    static load() {
        loader.objects().loadByCode('ground', './assets/objects/ground.obj.json');
        loader.objects().loadByCode('van', './assets/objects/van.obj.json');
    }

    getX() {
        return this._x;
    }

    getZ() {
        return this._z;
    }

    getAngle() {
        return this._angle;
    }

    setPose(x, z, angle) {
        this._x     = x;
        this._z     = z;
        this._angle = angle;

        return this;
    }

    /**
     * Forward or backward, turning while it moves (backward, the steering is reversed like a car's).
     *
     * @param {number} dt   - milliseconds
     * @param {number} joyX - steering, -1..1
     * @param {number} joyY - throttle, -1..1
     */
    drive(dt, joyX, joyY) {
        if (joyY === 0) {
            return;
        }
        this._angle += (dt * VanScene.TURN_SPEED * joyX * ((joyY > 0) ? 1 : -1));
        this._x     += (dt * VanScene.SPEED * joyY * Math.cos(DEG_TO_RAD * this._angle));
        this._z     -= (dt * VanScene.SPEED * joyY * Math.sin(DEG_TO_RAD * this._angle));
        this._x      = Math.min(Math.max(this._x, -VanScene.LIMIT_X), VanScene.LIMIT_X);
        this._z      = Math.min(Math.max(this._z, -VanScene.LIMIT_Z), VanScene.LIMIT_Z);
    }

    render() {
        const engine = this._engine;

        engine.drawInit();
        engine.matrixIdentity();
        engine.matrixRotateZ(180);
        engine.matrixRotateX(200);
        engine.matrixTranslate(0, -20, -40);
        engine.lightCalculatePosition(this._sunLight);

        engine.matrixPush();
        engine.matrixTranslate(this._x, 0, this._z);
        engine.matrixRotateY(this._angle);
        engine.lightCalculatePosition(this._greenLight);
        engine.lightCalculatePosition(this._redLight);
        engine.drawObject(loader.objects().getByCode('van'));
        engine.matrixPop();

        engine.drawObject(loader.objects().getByCode('ground'));
        engine.drawFinish();
    }
}

VanScene.START_X    = -5;
VanScene.START_Z    = -10;
// Units and degrees a millisecond at full deflection.
VanScene.SPEED      = 0.015;
VanScene.TURN_SPEED = 0.1;
VanScene.LIMIT_X    = 25;
VanScene.LIMIT_Z    = 15;
