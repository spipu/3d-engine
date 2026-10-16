/**
 * The Lotus F1, still, under two coloured lights.
 */
class StillExample extends AbstractShowcaseExample {
    _load() {
        loader.objects().loadByCode(StillExample.OBJECT, './assets/objects/' + StillExample.OBJECT + '.obj.json');
    }

    _init() {
        const engine = this._createScene();

        engine.setBackground(35, 35, 35);
        engine.setFov(45.0);
        engine.setZBuffer(1, 80);
        engine.setLightAmbient([40., 40., 40.]);
        engine.addLight(new Light([255., 50., 50.], 50, [10., 0, 10.]));
        engine.addLight(new Light([50., 255., 50.], 50, [-10., 0, 10.]));
        this._bindHud([]);
    }

    _frame(timestamp) {
        const engine = this._engine;

        engine.calculateDeltaTime(timestamp);
        engine.drawInit();
        engine.matrixIdentity();
        engine.lightsCalculatePosition();
        engine.matrixRotateX(180);
        engine.matrixRotateZ(180);
        engine.matrixTranslate(4, 5, -50);
        engine.matrixRotateY(-30);
        engine.matrixRotateX(-60);
        engine.drawObject(loader.objects().getByCode(StillExample.OBJECT));
        engine.drawFinish();
        this._screen.update();
    }
}

StillExample.OBJECT = 'lotus';
