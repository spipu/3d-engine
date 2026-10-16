/*
 * Motion capture: CMU Graphics Lab Motion Capture Database, http://mocap.cs.cmu.edu (subject 69), funded by the NSF
 * grant EIA-0196217.
 */

/**
 * A character walking on an endless ground, the camera behind it. The arrow keys (or the movement stick) choose the
 * clip; the clips move the character themselves (root motion), so its feet do not slide. Up or down with left or
 * right: it walks and turns.
 */
class AnimateExample extends AbstractShowcaseExample {
    constructor() {
        super();

        this._model     = null;
        this._character = null;
        this._clipName  = null;
        this._heading   = 0;
        this._camera    = {x: 0, z: -AnimateExample.CAMERA_BACK, heading: 0};
        this._lights    = [];
        this._events    = [];
        this._held      = new Set();
        this._onKeyDown = (e) => this._keyDown(e);
        this._onKeyUp   = (e) => this._held.delete(e.key);
    }

    _load() {
        loader.objects().loadFromData(AnimateExample.GROUND, AnimateExample._groundData());
        loader.animatedModels().loadByCode(AnimateExample.MODEL, './assets/models/' + AnimateExample.MODEL + '.gltf');
    }

    _init() {
        const engine = this._createScene({padControls: ['move']});

        this._model     = loader.animatedModels().getByCode(AnimateExample.MODEL);
        this._character = new AnimatedInstance(this._model).bind();
        this._character.getPlayer().setRootMotion(this._model.getSkeleton().indexOf(AnimateExample.ROOT_JOINT));
        this._lights    = AnimateExample.LIGHTS.map((light) => new Light(light.color, light.radius, [...light.offset]));
        engine.setBackground(35, 35, 45);
        engine.setFov(45.0);
        engine.setZBuffer(0.1, 100);
        engine.setLightAmbient([60., 60., 60.]);
        this._lights.forEach((light) => engine.addLight(light));
        this._bindHud([
            'Up: walk, down: walk back, left / right: side step',
            'Up or down with left / right: walk and turn',
            'Motion capture: CMU Graphics Lab, mocap.cs.cmu.edu'
        ]);
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
    }

    _frame(timestamp) {
        const engine = this._engine;

        engine.calculateDeltaTime(timestamp);
        const dt   = (engine.getDeltaTime() / AnimateExample.MS_PER_SECOND);
        const move = this._chosenMove();
        if (move.clip !== this._clipName) {
            this._clipName = move.clip;
            this._character.getPlayer().crossFadeTo(this._model.getClip(this._clipName), AnimateExample.FADE_SECONDS, {loop: true});
        }
        // The heading set before the update: the root motion of this frame is turned by it.
        this._heading -= (move.turn * AnimateExample.TURN_DEGREES * dt);
        this._character.place(this._character.getInstance().getPosition(), [0, this._heading, 0]);
        this._character.update(dt, this._events);
        this._character.applyRootMotion();
        this._followCharacter(dt);
        const position = this._character.getInstance().getPosition();
        // Each light reads its own array, moved in place.
        this._lights.forEach((light, i) => {
            const offset = AnimateExample.LIGHTS[i].offset;
            light.position[0] = (offset[0] + position[0]);
            light.position[1] = (offset[1] + position[1]);
            light.position[2] = (offset[2] + position[2]);
        });

        engine.drawInit();
        engine.matrixIdentity();
        engine.matrixRotateX(AnimateExample.CAMERA_PITCH);
        engine.matrixRotateY(-this._camera.heading);
        engine.matrixTranslate(-this._camera.x, -AnimateExample.CAMERA_HEIGHT, -this._camera.z);
        engine.lightsCalculatePosition();
        engine.matrixPush();
        engine.matrixTranslate(AnimateExample._snapToTile(position[0]), 0, AnimateExample._snapToTile(position[2]));
        engine.drawObject(loader.objects().getByCode(AnimateExample.GROUND));
        engine.matrixPop();
        engine.drawInstance(this._character.getInstance());
        engine.drawFinish();
        this._screen.update();
    }

    _dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
    }

    _keyDown(e) {
        if (AnimateExample.KEYS.includes(e.key)) {
            this._held.add(e.key);
            e.preventDefault();
        }
    }

    /**
     * Up / down choose walking forward or back, left / right a turn while walking, or a side step on their own.
     * Opposite keys cancel out; nothing left: idle. The arrows win over the movement stick.
     */
    _chosenMove() {
        const arrowForward = (Number(this._held.has('ArrowUp')) - Number(this._held.has('ArrowDown')));
        const arrowSide    = (Number(this._held.has('ArrowLeft')) - Number(this._held.has('ArrowRight')));
        const arrows       = ((arrowForward !== 0) || (arrowSide !== 0));
        const forward      = (arrows ? arrowForward : AnimateExample._direction(this._inputs.readJoy1Y()));
        const side         = (arrows ? arrowSide : -AnimateExample._direction(this._inputs.readJoy1X()));
        if (forward !== 0) {
            return {clip: ((forward > 0) ? 'walk' : 'walkBack'), turn: side};
        }
        if (side !== 0) {
            return {clip: ((side > 0) ? 'strafeLeft' : 'strafeRight'), turn: 0};
        }

        return {clip: 'idle', turn: 0};
    }

    // The camera turns and moves towards its place behind the character, a share of the gap a frame.
    _followCharacter(dt) {
        const position = this._character.getInstance().getPosition();
        const share    = (1 - Math.exp(-AnimateExample.CAMERA_CATCH * dt));
        const camera   = this._camera;

        camera.heading += ((this._heading - camera.heading) * share);
        const radians = (camera.heading * DEG_TO_RAD);
        camera.x += (((position[0] - (Math.sin(radians) * AnimateExample.CAMERA_BACK)) - camera.x) * share);
        camera.z += (((position[2] - (Math.cos(radians) * AnimateExample.CAMERA_BACK)) - camera.z) * share);
    }

    // A stick deflection as a key: -1, 0 or 1.
    static _direction(axis) {
        return ((Math.abs(axis) < AnimateExample.STICK_THRESHOLD) ? 0 : Math.sign(axis));
    }

    // The ground moved by whole tiles: its texture stays put under the character.
    static _snapToTile(value) {
        return (Math.round(value / AnimateExample.TILE_SIZE) * AnimateExample.TILE_SIZE);
    }

    /**
     * TILES_ACROSS² tiles centred on the origin, each covered once by the texture. Object3d.fcAdd rewrites a face's
     * color and map in place: each face gets its own.
     */
    static _groundData() {
        const points = [];
        const faces  = [];
        const across = AnimateExample.TILES_ACROSS;
        const half   = ((across * AnimateExample.TILE_SIZE) / 2);
        const row    = (across + 1);
        for (let j = 0; j <= across; j++) {
            for (let i = 0; i <= across; i++) {
                points.push([((i * AnimateExample.TILE_SIZE) - half), 0, ((j * AnimateExample.TILE_SIZE) - half)]);
            }
        }
        for (let j = 0; j < across; j++) {
            for (let i = 0; i < across; i++) {
                const corner = ((j * row) + i + 1);
                faces.push({pts: [corner, (corner + row + 1), (corner + 1)], color: [...AnimateExample.GROUND_COLOR], texture: 1, map: [[0, 1], [1, 0], [1, 1]]});
                faces.push({pts: [corner, (corner + row), (corner + row + 1)], color: [...AnimateExample.GROUND_COLOR], texture: 1, map: [[0, 1], [0, 0], [1, 0]]});
            }
        }

        return {textures: [AnimateExample.GROUND_TEXTURE], points: points, faces: faces};
    }
}

AnimateExample.MODEL           = 'character';
AnimateExample.ROOT_JOINT      = 'pelvis';
AnimateExample.KEYS            = Object.freeze(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
AnimateExample.STICK_THRESHOLD = 0.5;
AnimateExample.FADE_SECONDS    = 0.25;
AnimateExample.TURN_DEGREES    = 90;
AnimateExample.MS_PER_SECOND   = 1000;
// The camera behind the character: distance, height, pitch, and how fast it catches up (per second).
AnimateExample.CAMERA_BACK     = 3.2;
AnimateExample.CAMERA_HEIGHT   = 1.7;
AnimateExample.CAMERA_PITCH    = -10;
AnimateExample.CAMERA_CATCH    = 4;
// The ground: square tiles of the grid texture, drawn around the character, moved by whole tiles.
AnimateExample.GROUND          = 'ground';
AnimateExample.TILE_SIZE       = 2;
AnimateExample.TILES_ACROSS    = 30;
AnimateExample.GROUND_TEXTURE  = './assets/texture/grid.gif';
AnimateExample.GROUND_COLOR    = Object.freeze([250, 250, 250]);
// The lights, around the character wherever it walks: color, radius, place from the character.
AnimateExample.LIGHTS          = Object.freeze([
    {color: [255., 255., 240.], radius: 12, offset: [3., 6., -3.]},
    {color: [120., 140., 255.], radius: 8,  offset: [-4., 3., 2.]}
]);
