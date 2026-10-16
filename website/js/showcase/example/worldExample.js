/**
 * The labyrinth walked through in first person: the FPS physics of the engine, the mouse looking around.
 */
class WorldExample extends AbstractShowcaseExample {
    constructor() {
        super();

        this._world   = null;
        this._sampler = null;
    }

    _load() {
        loader.world().load('./assets/world/definition.json');
    }

    // Walking, jumping and using are live; nothing to shoot, no weapon, no map.
    _init() {
        const engine = this._createScene({padControls: ['move', 'aim', 'jump', 'crouch', 'action'], mouseLock: true});

        this._world   = loader.world().get();
        this._sampler = new InputCommandSampler(this._inputs);
        engine.setFov(45.0);
        engine.setZBuffer(0.1, 100);
        this._bindHud(['Use the keyboard and the mouse to move']).bindInputs(this._inputs).bindUser(this._world.getUser());
        engine.initFromWorld(this._world);
    }

    _frame(timestamp) {
        this._engine.calculateDeltaTime(timestamp);
        const dt = this._engine.getDeltaTime();
        this._world.update(dt, new Map([[this._world.getUser(), this._sampler.collect(dt).sample()]]));
        this._engine.displayWorld(this._world, this._world.getUser());
        this._screen.update();
    }

    _dispose() {
        this._inputs.releaseMouse();
    }
}
