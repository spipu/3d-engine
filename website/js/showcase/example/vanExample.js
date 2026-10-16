/**
 * The van driven by the player: the movement input steers it.
 */
class VanExample extends AbstractShowcaseExample {
    constructor() {
        super();

        this._scene   = null;
        this._sampler = null;
    }

    _load() {
        VanScene.load();
    }

    _init() {
        this._scene   = new VanScene(this._createScene({padControls: ['move']}));
        this._sampler = new InputCommandSampler(this._inputs);
        this._bindHud(['Use the keyboard to move the van']).bindInputs(this._inputs);
    }

    _frame(timestamp) {
        this._engine.calculateDeltaTime(timestamp);
        const dt      = this._engine.getDeltaTime();
        const command = this._sampler.collect(dt).sample();
        this._scene.drive(dt, command.getMoveX(), command.getMoveY());
        this._scene.render();
        this._screen.update();
    }
}
