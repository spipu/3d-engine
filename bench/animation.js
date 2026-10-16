#!/usr/bin/env node
/**
 * Checks the animation primitives of the engine (website/js/engine/animation/), run from the repository root:
 *
 *   node bench/animation.js
 *
 * Loads the classes as the browser does (vm context, with the engine's loader), then checks them against known
 * results: the three interpolations, the rotation convention against Matrix.composeInstanceTransform, the cursors
 * (forward, backward, two readers of one clip), the events crossed, the joints' matrices, the speed jumps it measures
 * (a linear clip has some, a Catmull-Rom cubic one has none), the skinning, the player (delay, loop, cross-fade, root
 * motion), an animated instance in the loader holding an object and moved by its root motion, a glTF read by the loader (values after the change of handedness,
 * a posed vertex worked out by hand, the files refused), and the allocations by frame (minor garbage collections counted
 * with a 1 MB young generation). Exits with 1 on a failure.
 */

const fs            = require('fs');
const path          = require('path');
const vm            = require('vm');
const child_process = require('child_process');
const perf_hooks    = require('perf_hooks');

const ROOT_DIR    = path.resolve(__dirname, '..');
const WEBSITE_DIR = path.join(ROOT_DIR, 'website');
const SOURCES     = [
    'js/engine/entity/abstractLoadedEntity.js',
    'js/engine/entity/instance.js',
    'js/engine/entity/animatedModel.js',
    'js/engine/entity/face.js',
    'js/engine/entity/object3d.js',
    'js/engine/entity/texture.js',
    'js/engine/loader/abstractLoader.js',
    'js/engine/loader/instanceLoader.js',
    'js/engine/loader/interactionLoader.js',
    'js/engine/loader/object3dLoader.js',
    'js/engine/loader/textureLoader.js',
    'js/engine/loader/worldLoader.js',
    'js/engine/loader/gltfParser.js',
    'js/engine/loader/animatedModelLoader.js',
    'js/engine/loader.js',
    'js/engine/matrix.js',
    'js/engine/engine3d.js',
    'js/engine/animation/mat4.js',
    'js/engine/animation/quaternion.js',
    'js/engine/animation/skeleton.js',
    'js/engine/animation/skeletonPose.js',
    'js/engine/animation/animationSampler.js',
    'js/engine/animation/animationChannel.js',
    'js/engine/animation/animationEvent.js',
    'js/engine/animation/animationClip.js',
    'js/engine/animation/skeletonSocket.js',
    'js/engine/animation/skinnedMesh.js',
    'js/engine/animation/animationPlayer.js',
    'js/engine/animation/animatedInstance.js',
];
const CLASSES = ['Matrix', 'Mat4', 'Quaternion', 'Skeleton', 'SkeletonPose', 'AnimationSampler', 'AnimationChannel', 'AnimationEvent', 'AnimationClip', 'SkeletonSocket', 'SkinnedMesh', 'AnimationPlayer', 'AnimatedModel', 'AnimatedInstance', 'GltfParser'];
// Float32 storage: about 7 significant digits.
const FLOAT_EPSILON     = 1e-4;
const SAMPLE_STEP       = 0.0001;
const ALLOCATION_FRAMES = 100000;
// A young generation of 1 MB: about 10 bytes allocated a frame make a minor collection over the run.
const YOUNG_GENERATION  = '--max-semi-space-size=1';
const FRAME_SECONDS     = 0.016;
const QUATERNION_SIZE   = 4;
const CUBIC_KEY_SIZE    = (3 * QUATERNION_SIZE);
// Speed change from one sample to the next, against the fastest speed: a smooth curve stays near acceleration × step,
// a jump does not shrink with the step.
const SMOOTH_JUMP_RATIO = 0.01;
// A channel slower than it (units a second) stands still: its speed is the rounding of float32 keys, no ratio to it.
const STILL_SPEED       = 0.001;
// Cross-fade check, against the clip playing on alone.
const SUDDEN_JUMP_FACTOR = 10;
const FADE_JUMP_FACTOR   = 2;
// Root motion check: metres a second of the root joint, along x and z of the model.
const WALK_SPEED         = [0.2, 1];
const BACK_SPEED         = [0, -0.5];

class AnimationBench {
    constructor() {
        // User: only kept by WorldLoader as the class of the players, never built here.
        this._ctx = vm.createContext({console, Math, Float32Array, Uint16Array, Map, Object, Error, Number, User: class {}});
        for (const file of SOURCES) {
            vm.runInContext(fs.readFileSync(path.join(WEBSITE_DIR, file), 'utf8'), this._ctx, {filename: file});
        }
        for (const name of CLASSES) {
            this[name] = vm.runInContext(name, this._ctx);
        }
        this.loader = vm.runInContext('loader', this._ctx);
        this._failures = 0;
    }

    async run() {
        this._interpolations();
        this._rotationConvention();
        this._cursors();
        this._twoReaders();
        this._events();
        this._skeleton();
        this._jumps();
        this._skinning();
        this._mirror();
        this._objectData();
        this._player();
        this._crossFade();
        this._rootMotion();
        this._animatedInstance();
        this._gltf();
        this._gltfRefusals();
        await this._allocations();
        console.log((this._failures === 0) ? 'animation: all checks passed' : ('animation: ' + this._failures + ' check(s) failed'));

        return this._failures;
    }

    // f(t) = t³ - 2t² + 3t + 1 is a cubic: Hermite with its exact derivatives gives it back exactly.
    _interpolations() {
        const f      = (t) => ((t * t * t) - (2 * t * t) + (3 * t) + 1);
        const df     = (t) => ((3 * t * t) - (4 * t) + 3);
        const times  = new Float32Array([0, 0.5, 1.25, 2]);
        const cubic  = new Float32Array([...times].flatMap((t) => [df(t), f(t), df(t)]));
        const linear = new Float32Array([...times].map(f));
        const out    = new Float32Array(1);
        const step   = new this.AnimationSampler(times, linear, this.AnimationSampler.STEP, 1, false);
        const lerp   = new this.AnimationSampler(times, linear, this.AnimationSampler.LINEAR, 1, false);
        const spline = new this.AnimationSampler(times, cubic, this.AnimationSampler.CUBICSPLINE, 1, false);
        for (const t of [0, 0.2, 0.5, 0.9, 1.25, 1.7, 2]) {
            const cursor = this.AnimationSampler.createCursor();
            this._near('cubic spline f(' + t + ')', spline.sample(t, cursor, out, 0)[0], f(t), FLOAT_EPSILON);
        }
        this._near('step at 0.9', step.sample(0.9, this.AnimationSampler.createCursor(), out, 0)[0], f(0.5), FLOAT_EPSILON);
        this._near('linear at 0.875', lerp.sample(0.875, this.AnimationSampler.createCursor(), out, 0)[0], ((f(0.5) + f(1.25)) / 2), FLOAT_EPSILON);
        this._near('before the first key', lerp.sample(-1, this.AnimationSampler.createCursor(), out, 0)[0], f(0), FLOAT_EPSILON);
        this._near('after the last key', lerp.sample(5, this.AnimationSampler.createCursor(), out, 0)[0], f(2), FLOAT_EPSILON);

        const q      = this.Quaternion;
        const keys   = new Float32Array(2 * QUATERNION_SIZE);
        q.fromDegrees(keys, 0, [0, 0, 0]);
        q.fromDegrees(keys, QUATERNION_SIZE, [0, 90, 0]);
        const slerp  = new this.AnimationSampler(new Float32Array([0, 1]), keys, this.AnimationSampler.LINEAR, QUATERNION_SIZE, true);
        const middle = slerp.sample(0.5, this.AnimationSampler.createCursor(), new Float32Array(QUATERNION_SIZE), 0);
        this._near('slerp halfway of 90 degrees', AnimationBench._degreesBetween(middle, keys), 45, FLOAT_EPSILON);
        this._near('slerp keeps unit length', Math.hypot(...middle), 1, FLOAT_EPSILON);
    }

    // Quaternion.fromDegrees + Mat4 give the matrix the engine composes for the same position and angles.
    _rotationConvention() {
        const q = new Float32Array(QUATERNION_SIZE);
        for (const angles of [[30, 0, 0], [0, 45, 0], [0, 0, 60], [20, -35, 75], [-110, 15, 170]]) {
            const position = [1.5, -2, 3.25];
            const engine   = this.Matrix.composeInstanceTransform({position: position, rotation: angles, deltaTranslate: [0, 0, 0], deltaRotate: [0, 0, 0]});
            this.Quaternion.fromDegrees(q, 0, angles);
            const ours = this.Mat4.fromTranslationRotationScale(this.Mat4.create(), new Float32Array(position), 0, q, 0, new Float32Array([1, 1, 1]), 0);
            const flat = engine.v.flat();
            this._near('rotation convention ' + angles.join('/'), Math.max(...flat.map((value, i) => Math.abs(value - ours[i]))), 0, FLOAT_EPSILON);
        }
    }

    // A cursor moved forward then backward gives what a fresh cursor gives.
    _cursors() {
        const times  = new Float32Array([0, 1, 2, 3, 4, 5]);
        const values = new Float32Array([0, 10, 5, 7, 2, 9]);
        const curve  = new this.AnimationSampler(times, values, this.AnimationSampler.LINEAR, 1, false);
        const cursor = this.AnimationSampler.createCursor();
        const out    = new Float32Array(1);
        const fresh  = new Float32Array(1);
        let worst = 0;
        for (const t of [0.1, 0.9, 2.5, 4.9, 4.2, 1.1, 0.05, 3.3, 5, 0]) {
            curve.sample(t, cursor, out, 0);
            curve.sample(t, this.AnimationSampler.createCursor(), fresh, 0);
            worst = Math.max(worst, Math.abs(out[0] - fresh[0]));
        }
        this._near('cursor forward and backward', worst, 0, 0);
    }

    // Two readers of one clip at different times read what each would read alone.
    _twoReaders() {
        const {skeleton, clip} = this._chain(this.AnimationSampler.CUBICSPLINE);
        const alone    = new this.SkeletonPose(skeleton);
        const first    = new this.SkeletonPose(skeleton);
        const second   = new this.SkeletonPose(skeleton);
        const cursorsA = clip.createCursors();
        const cursorsB = clip.createCursors();
        let worst = 0;
        for (let frame = 0; frame < 200; frame++) {
            const ta = ((frame * 0.013) % clip.getDuration());
            const tb = (clip.getDuration() - ((frame * 0.007) % clip.getDuration()));
            clip.applyTo(first, ta, cursorsA);
            clip.applyTo(second, tb, cursorsB);
            clip.applyTo(alone, ta, clip.createCursors());
            worst = Math.max(worst, ...first.getRotation().map((value, i) => Math.abs(value - alone.getRotation()[i])));
            clip.applyTo(alone, tb, clip.createCursors());
            worst = Math.max(worst, ...second.getRotation().map((value, i) => Math.abs(value - alone.getRotation()[i])));
        }
        this._near('two readers of one clip', worst, 0, 0);
    }

    _events() {
        const E    = this.AnimationEvent;
        const clip = new this.AnimationClip('events', [], [new E(0.5, 'b'), new E(0, 'a'), new E(1, 'c', {item: 'wheel'})]);
        const out  = [];
        const names = (t0, t1, start) => clip.eventsBetween(t0, t1, out, start).map((event) => event.getName()).join('');
        this._equal('events in ]0, 1]', names(0, 1, false), 'bc');
        this._equal('events in [0, 1]', names(0, 1, true), 'abc');
        this._equal('events in ]0.5, 0.9]', names(0.5, 0.9, false), '');
        this._equal('event data frozen', Object.isFrozen(clip.getEvents()[2].getData()), true);
        this._near('duration from the events', clip.getDuration(), 1, 0);
        let refused = false;
        try {
            new this.Skeleton({names: ['a', 'b'], parents: [1, -1], restTranslation: new Float32Array(6), restRotation: new Float32Array(8), restScale: new Float32Array(6), inverseBind: new Float32Array(32)});
        } catch (error) {
            refused = true;
        }
        this._equal('parent listed after its child refused', refused, true);
    }

    // A chain of three joints 1 m apart along y: its world matrices and, at rest, identity skinning matrices.
    _skeleton() {
        const {skeleton} = this._chain(this.AnimationSampler.LINEAR);
        const pose = new this.SkeletonPose(skeleton);
        pose.computeWorld().computeSkinning();
        let worst = 0;
        for (let joint = 0; joint < 3; joint++) {
            worst = Math.max(worst, ...pose.getSkinning(joint).map((value, i) => Math.abs(value - this.Mat4.create()[i])));
        }
        this._near('rest pose skinning = identity', worst, 0, FLOAT_EPSILON);

        // The root turned 90 degrees about z: the joint 2 m up the chain goes 2 m along -x.
        this.Quaternion.fromDegrees(pose.getRotation(), 0, [0, 0, 90]);
        pose.computeWorld();
        const tip = pose.getWorld(2);
        this._near('chain turned: tip x', tip[12], -2, FLOAT_EPSILON);
        this._near('chain turned: tip y', tip[13], 0, FLOAT_EPSILON);
    }

    // The jump measure finds the corners of a linear clip and nothing in a Catmull-Rom cubic one.
    _jumps() {
        const linear = this._chain(this.AnimationSampler.LINEAR);
        const cubic  = this._chain(this.AnimationSampler.CUBICSPLINE);
        const jumpL  = this._worstJump(linear.clip);
        const jumpC  = this._worstJump(cubic.clip);
        this._check('speed jumps of a linear clip found (' + jumpL.ratio.toFixed(3) + ')', (jumpL.ratio > SMOOTH_JUMP_RATIO));
        this._check('no speed jump in a cubic clip (' + jumpC.ratio.toFixed(4) + ')', (jumpC.ratio < SMOOTH_JUMP_RATIO));
    }

    /**
     * The largest change of speed of a channel from one millisecond to the next, against its fastest speed; values
     * sampled in double precision (a pose stores float32, whose rounding alone would look like jumps at this step).
     *
     * @returns {{ratio: number, channel: int, time: number}}
     */
    _worstJump(clip) {
        const steps = Math.floor(clip.getDuration() / SAMPLE_STEP);
        let worst = {ratio: 0, channel: -1, time: 0};
        clip.getChannels().forEach((channel, c) => {
            const sampler = channel.getSampler();
            const size    = sampler.getComponents();
            const cursor  = this.AnimationSampler.createCursor();
            const values  = [];
            for (let i = 0; i <= steps; i++) {
                values.push(sampler.sample((i * SAMPLE_STEP), cursor, new Float64Array(size), 0));
            }
            const speeds  = values.slice(1).map((value, i) => value.map((v, k) => ((v - values[i][k]) / SAMPLE_STEP)));
            const fastest = Math.max(...speeds.map((speed) => Math.hypot(...speed)));
            if (fastest < STILL_SPEED) {
                return;
            }
            for (let i = 1; i < speeds.length; i++) {
                const ratio = (Math.hypot(...speeds[i].map((v, k) => (v - speeds[i - 1][k]))) / fastest);
                if (ratio > worst.ratio) {
                    worst = {ratio: ratio, channel: c, time: (i * SAMPLE_STEP)};
                }
            }
        });

        return worst;
    }

    // No allocation by frame: no minor garbage collection while the animation runs.
    async _allocations() {
        const {skeleton, clip} = this._chain(this.AnimationSampler.CUBICSPLINE);
        const clips  = [this._walking(clip, WALK_SPEED), this._walking(clip, BACK_SPEED)];
        const mesh   = this._mesh(skeleton);
        const pose   = new this.SkeletonPose(skeleton);
        const player = new this.AnimationPlayer(pose).setRootMotion(0);
        const object = this._fakeObject(mesh);
        const events = [];
        const motion = new Float32Array(this.AnimationPlayer.ROOT_MOTION_SIZE);
        const frames = (count) => {
            for (let frame = 0; frame < count; frame++) {
                if ((frame % 500) === 0) {
                    player.crossFadeTo(clips[(frame / 500) % 2], 0.2, {loop: true});
                }
                player.advance(FRAME_SECONDS, events);
                player.getRootMotion(motion);
                pose.computeWorld().computeSkinning();
                mesh.skinInto(object, pose, ((frame % 2) === 0));
            }
        };
        frames(1000);
        const collections = [];
        const observer    = new perf_hooks.PerformanceObserver((list) => collections.push(...list.getEntries()));
        observer.observe({entryTypes: ['gc']});
        frames(ALLOCATION_FRAMES);
        await new Promise((resolve) => setImmediate(resolve));
        observer.disconnect();
        const minor = collections.filter((entry) => (entry.detail.kind === perf_hooks.constants.NODE_PERFORMANCE_GC_MINOR)).length;
        this._check('no minor garbage collection over ' + ALLOCATION_FRAMES + ' frames (' + minor + ')', (minor === 0));
    }

    // Root, middle and tip turned 90 degrees about z each: the expected places worked out by hand.
    _skinning() {
        const {skeleton} = this._chain(this.AnimationSampler.LINEAR);
        const mesh = this._mesh(skeleton);
        const pose = new this.SkeletonPose(skeleton);
        for (let joint = 0; joint < 3; joint++) {
            this.Quaternion.fromDegrees(pose.getRotation(), (joint * QUATERNION_SIZE), [0, 0, 90]);
        }
        pose.computeWorld().computeSkinning();
        const object   = this._fakeObject(mesh);
        const expected = [[-0.5, 0, 0], [-1, -0.5, 0], [-1.75, -1.25, 0]];
        mesh.skinInto(object, pose, false);
        this._near('skinning: one joint, then two blended', this._worstPoint(object, expected), 0, FLOAT_EPSILON);
        mesh.skinInto(object, pose, true);
        this._near('skinning mirrored', this._worstPoint(object, expected.map(([x, y, z]) => [-x, y, z])), 0, FLOAT_EPSILON);
        this._equal('geometry refreshed after skinning', object.refreshed, 2);
    }

    // A turn of 30 degrees about y seen in a mirror (x negated): a turn of -30 degrees, x negated.
    _mirror() {
        const q        = new Float32Array(QUATERNION_SIZE);
        const turned   = this.Mat4.fromTranslationRotationScale(this.Mat4.create(), new Float32Array([2, 1, 3]), 0, this.Quaternion.fromDegrees(q, 0, [0, 30, 0]), 0, new Float32Array([1, 1, 1]), 0);
        const expected = this.Matrix.composeInstanceTransform({position: [-2, 1, 3], rotation: [0, -30, 0], deltaTranslate: [0, 0, 0], deltaRotate: [0, 0, 0]}).v.flat();
        this.Mat4.mirrorX(turned, turned);
        this._near('mirrored transform', Math.max(...expected.map((value, i) => Math.abs(value - turned[i]))), 0, FLOAT_EPSILON);
    }

    _objectData() {
        const {skeleton} = this._chain(this.AnimationSampler.LINEAR);
        const mesh      = this._mesh(skeleton);
        const materials = [{color: [1, 0.5, 0, 1], doubleSided: false}, {color: [0, 0, 1, 0.5], doubleSided: true}];
        const plain     = mesh.toObjectData(materials, this.AnimatedInstance.materialColor, false);
        const mirrored  = mesh.toObjectData(materials, this.AnimatedInstance.materialColor, true);
        this._equal('a double-sided face drawn both ways', plain.faces.length, 3);
        this._equal('colors 0-255, alpha kept below 1', JSON.stringify(plain.faces.map((face) => face.color)), '[[255,127.5,0],[0,0,255,0.5],[0,0,255,0.5]]');
        this._equal('mirror: x negated', mirrored.points[2][0], -1);
        const [a, b, c] = plain.faces[0].pts;
        this._equal('mirror: faces turned inside out', JSON.stringify(mirrored.faces[0].pts), JSON.stringify([a, c, b]));
    }

    _player() {
        const E        = this.AnimationEvent;
        const {skeleton, clip: chain} = this._chain(this.AnimationSampler.LINEAR);
        const clip     = new this.AnimationClip('marked', chain.getChannels(), [new E(0, 'start'), new E(1, 'middle')]);
        const pose     = new this.SkeletonPose(skeleton);
        const player   = new this.AnimationPlayer(pose);
        const events   = [];
        const names    = (dt) => player.advance(dt, events).map((event) => event.getName()).join(',');
        player.play(clip, {loop: true});
        this._equal('first step: the event at the start', names(0), 'start');
        this._equal('a step crossing the middle', names(1.1), 'middle');
        this._equal('a turn of the loop', names(1.2), 'start');
        this._near('looped time', player.getTime(), 0.3, FLOAT_EPSILON);

        const rest = new this.SkeletonPose(skeleton);
        player.play(clip, {time: -0.3});
        clip.applyTo(rest, 0, clip.createCursors());
        this._equal('a delay: no event yet', names(0.2), '');
        this._near('a delay: the first pose held', Math.max(...pose.getRotation().map((value, i) => Math.abs(value - rest.getRotation()[i]))), 0, 0);
        this._equal('the delay over: the event at the start', names(0.2), 'start');
        names(5);
        this._equal('a clip played once ends', player.isFinished(), true);

        player.play(clip, {speed: 2});
        names(0.25);
        this._near('speed', player.getTime(), 0.5, FLOAT_EPSILON);
    }

    // Against the clip playing on with no switch (1 ms samples of a float32 pose): switching at once jumps far
    // above it, a cross-fade stays near it.
    _crossFade() {
        const {skeleton, clip: walk} = this._chain(this.AnimationSampler.CUBICSPLINE);
        const turn   = new this.AnimationClip('turn', walk.getChannels().map((channel) => {
            const sampler = channel.getSampler();
            const values  = new Float32Array(sampler._values.length);
            for (let k = 0; k < values.length; k += QUATERNION_SIZE) {
                values.set([-sampler._values[k], sampler._values[k + 1], sampler._values[k + 2], sampler._values[k + 3]], k);
            }

            return new this.AnimationChannel(new this.AnimationSampler(sampler._times, values, sampler._interpolation, QUATERNION_SIZE, true), channel.getJoint(), channel.getPath());
        }));
        const jump = (fade, switching = true) => {
            const pose    = new this.SkeletonPose(skeleton);
            const player  = new this.AnimationPlayer(pose);
            const events  = [];
            const step    = 0.001;
            const samples = [];
            player.play(walk, {loop: true});
            for (let i = 0; i < 1000; i++) {
                if (switching && (i === 400)) {
                    player.crossFadeTo(turn, fade, {time: 0.3, loop: true});
                }
                player.advance(step, events);
                samples.push(Float64Array.from(pose.getRotation()));
            }

            return this._seriesJump(samples, step);
        };
        const alone  = jump(0, false);
        const sudden = jump(0);
        const faded  = jump(0.2);
        this._check('switching clips at once jumps (' + sudden.toFixed(3) + ' against ' + alone.toFixed(4) + ')', (sudden > (SUDDEN_JUMP_FACTOR * alone)));
        this._check('a cross-fade does not (' + faded.toFixed(4) + ')', (faded < (FADE_JUMP_FACTOR * alone)));
    }

    // The root joint's travel handed by the player, over loop turns and through a cross-fade, the joint kept in place.
    _rootMotion() {
        const {skeleton, clip: chain} = this._chain(this.AnimationSampler.LINEAR);
        const walk   = this._walking(chain, WALK_SPEED);
        const back   = this._walking(chain, BACK_SPEED);
        const pose   = new this.SkeletonPose(skeleton);
        const player = new this.AnimationPlayer(pose).setRootMotion(0);
        const events = [];
        const motion = new Float32Array(this.AnimationPlayer.ROOT_MOTION_SIZE);
        const total  = [0, 0];
        const steps  = [0.3, 0.7, 1.9, 0.4];
        player.play(walk, {loop: true});
        for (const dt of steps) {
            player.advance(dt, events);
            player.getRootMotion(motion);
            total[0] += motion[0];
            total[1] += motion[1];
        }
        const seconds = steps.reduce((sum, dt) => (sum + dt), 0);
        this._near('root motion over loop turns, x', total[0], (WALK_SPEED[0] * seconds), FLOAT_EPSILON);
        this._near('root motion over loop turns, z', total[1], (WALK_SPEED[1] * seconds), FLOAT_EPSILON);
        this._near('root joint kept at its start', Math.hypot(pose.getTranslation()[0], pose.getTranslation()[2]), 0, 0);

        // Halfway through a 0.2 s fade the smoothstep is 1/2: the two travels mixed half and half.
        player.crossFadeTo(back, 0.2, {loop: true});
        player.advance(0.1, events);
        player.getRootMotion(motion);
        this._near('root motion halfway through a cross-fade', motion[1], (0.1 * (WALK_SPEED[1] + BACK_SPEED[1]) / 2), FLOAT_EPSILON);
        player.advance(0.2, events);
        player.getRootMotion(motion);
        this._near('root motion after the cross-fade', motion[1], (0.2 * BACK_SPEED[1]), FLOAT_EPSILON);

        // The clip started 0.3 s ago, plus this step.
        player.setRootMotion(null).advance(0.5, events);
        this._near('no root motion: the joint travels', pose.getTranslation()[2], (BACK_SPEED[1] * 0.8), FLOAT_EPSILON);
        this._near('no root motion: none handed', Math.hypot(...player.getRootMotion(motion)), 0, 0);
    }

    // An instance in the engine's loader: the held object follows the socket, then stays where it was left.
    _animatedInstance() {
        const {skeleton, clip} = this._chain(this.AnimationSampler.LINEAR);
        const socketAt = this.Mat4.create();
        socketAt[13]   = 0.5;
        const model    = new this.AnimatedModel(0, null, () => {});
        model.populate({
            skeleton:  skeleton,
            mesh:      this._mesh(skeleton),
            materials: [{color: [1, 1, 1, 1], doubleSided: false}, {color: [1, 0, 0, 1], doubleSided: false}],
            clips:     [clip],
            sockets:   [new this.SkeletonSocket('hand', 2, socketAt)],
        });
        const character = new this.AnimatedInstance(model, {position: [10, 0, 5], rotation: [0, 90, 0]});
        const objectId  = this.loader.objects().loadFromData(null, {points: [[0, 0, 0], [0.1, 0, 0], [0, 0.1, 0]], faces: [{pts: [1, 2, 3], color: [9, 9, 9]}]});
        const itemId    = this.loader.instances().loadFromData(null, {object: objectId, position: [0, 0, 0], rotation: [0, 0, 0], trigger: 'none', keyframes: [], collisionShape: 'none'});
        character.bind();
        const item   = this.loader.instances().get(itemId);
        const events = [];
        const socket = this.Mat4.create();
        const placed = () => this.Matrix.composeInstanceTransform(item.getRenderTransform()).v.flat();
        character.getPlayer().play(clip, {time: 0.9});
        character.update(0, events);
        character.attach(item, 'hand');
        character.socketMatrix('hand', socket);
        this._near('held object at the socket', Math.max(...placed().map((value, i) => Math.abs(value - socket[i]))), 0, FLOAT_EPSILON);
        const local    = this.Mat4.multiply(this.Mat4.create(), socketAt, character.getPose().getWorld(2));
        const expected = this.Matrix.composeInstanceTransform(character.getInstance().getTransform()).multiply(this.Mat4.toMatrix(new this.Matrix(), local)).v.flat();
        this._near('socket in the world = socket in the model, then the placement', Math.max(...expected.map((value, i) => Math.abs(value - socket[i]))), 0, FLOAT_EPSILON);

        character.update(0.4, events);
        character.socketMatrix('hand', socket);
        this._near('held object follows', Math.max(...placed().map((value, i) => Math.abs(value - socket[i]))), 0, FLOAT_EPSILON);
        const left = placed();
        character.detach(item);
        character.update(0.4, events);
        this._near('detached object stays', Math.max(...placed().map((value, i) => Math.abs(value - left[i]))), 0, 0);

        const object = character.getInstance().getObject();
        const mean   = [0, 1, 2].map((axis) => (object.ptOrigin.reduce((sum, point) => (sum + point[axis]), 0) / object.ptOrigin.length));
        this._near('bounds follow the pose', Math.max(...mean.map((value, axis) => Math.abs(value - object.getCenter()[axis]))), 0, FLOAT_EPSILON);

        // Turned 90° about y (x → -z, z → x in the engine): a step of (dx, dz) in the model moves the instance by
        // (dz, 0, -dx); mirrored, the model's x is negated first.
        for (const mirror of [false, true]) {
            const walker = new this.AnimatedInstance(model, {mirror: mirror, position: [10, 0, 5], rotation: [0, 90, 0]});
            const sign   = (mirror ? -1 : 1);
            walker.bind();
            walker.getPlayer().setRootMotion(0).play(this._walking(clip, WALK_SPEED), {loop: true});
            walker.update(0.5, events);
            walker.applyRootMotion();
            const at       = walker.getInstance().getPosition();
            const expected = [(10 + (0.5 * WALK_SPEED[1])), 0, (5 - (0.5 * sign * WALK_SPEED[0]))];
            this._near('moved by its root motion' + (mirror ? ', mirrored' : ''), Math.max(...at.map((value, axis) => Math.abs(value - expected[axis]))), 0, FLOAT_EPSILON);
            walker.socketMatrix('hand', socket);
            const local   = this.Mat4.multiply(this.Mat4.create(), socketAt, walker.getPose().getWorld(2));
            const placed  = this.Matrix.composeInstanceTransform(walker.getInstance().getTransform());
            const inWorld = (mirror ? this.Mat4.mirrorX(this.Mat4.create(), local) : local);
            const wanted  = placed.multiply(this.Mat4.toMatrix(new this.Matrix(), inWorld)).v.flat();
            this._near('placement follows the root motion' + (mirror ? ', mirrored' : ''), Math.max(...wanted.map((value, i) => Math.abs(value - socket[i]))), 0, FLOAT_EPSILON);
        }
    }

    // The clip with its root joint travelling at a speed (x, z metres a second), linearly over its duration.
    _walking(clip, speed) {
        const S        = this.AnimationSampler;
        const duration = clip.getDuration();
        const travel   = new S(new Float32Array([0, duration]), new Float32Array([0, 0, 0, (speed[0] * duration), 0, (speed[1] * duration)]), S.LINEAR, this.Skeleton.TRANSLATION_SIZE, false);

        return new this.AnimationClip(clip.getName() + '+travel', [...clip.getChannels(), new this.AnimationChannel(travel, 0, this.AnimationChannel.TRANSLATION)]);
    }

    /**
     * Three joints 1 m apart along y, each swinging about z through five keys (Catmull-Rom tangents in CUBICSPLINE).
     */
    _chain(interpolation) {
        const S        = this.AnimationSampler;
        const skeleton = new this.Skeleton({
            names:           ['root', 'middle', 'tip'],
            parents:         [-1, 0, 1],
            restTranslation: new Float32Array([0, 0, 0, 0, 1, 0, 0, 1, 0]),
            restRotation:    new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
            restScale:       new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1]),
            inverseBind:     new Float32Array([
                1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
                1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1, 0, 1,
                1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -2, 0, 1,
            ]),
        });
        const times    = new Float32Array([0, 0.4, 0.9, 1.3, 2]);
        const angles   = [0, 40, -25, 60, 10];
        const channels = [0, 1, 2].map((joint) => {
            const keys = new Float32Array(times.length * QUATERNION_SIZE);
            angles.forEach((angle, k) => this.Quaternion.fromDegrees(keys, (k * QUATERNION_SIZE), [0, 0, (angle * (joint + 1) * 0.5)]));
            const values = ((interpolation === S.CUBICSPLINE) ? this._catmullRom(times, keys) : keys);

            return new this.AnimationChannel(new S(times, values, interpolation, QUATERNION_SIZE, true), joint, this.AnimationChannel.ROTATION);
        });

        return {skeleton, clip: new this.AnimationClip('chain', channels)};
    }

    // In-tangent, value, out-tangent per key; the tangent (next - previous) / (their time gap), zero at the ends.
    _catmullRom(times, keys) {
        const n      = times.length;
        const values = new Float32Array(n * CUBIC_KEY_SIZE);
        const q      = QUATERNION_SIZE;
        for (let k = 0; k < n; k++) {
            for (let c = 0; c < q; c++) {
                const tangent = (((k === 0) || (k === (n - 1))) ? 0 : ((keys[((k + 1) * q) + c] - keys[((k - 1) * q) + c]) / (times[k + 1] - times[k - 1])));
                values[(k * CUBIC_KEY_SIZE) + c]           = tangent;
                values[(k * CUBIC_KEY_SIZE) + q + c]       = keys[(k * q) + c];
                values[(k * CUBIC_KEY_SIZE) + (2 * q) + c] = tangent;
            }
        }

        return values;
    }

    // A glTF read through the loader: every value with x mirrored, then a vertex posed in both handednesses.
    _gltf() {
        const {gltf, binary} = AnimationBench._gltfModel();
        const id    = this.loader.animatedModels().loadFromData('bench_gltf', {gltf, binary});
        const model = this.loader.animatedModels().get(id);
        const skel  = model.getSkeleton();
        const close = (actual, expected) => Math.max(...expected.map((value, i) => Math.abs(value - actual[i])));
        this._equal('joints, parents before children', [0, 1].map((j) => skel.getJointName(j) + '<' + skel.getParent(j)).join(' '), 'root<-1 tip<0');
        this._near('rest translation mirrored', close(skel.getRestTranslation(), [-1, 0, 0, 0, 1, 0]), 0, 0);
        this._near('inverse bind mirrored', close(skel.getInverseBind(0), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1]), 0, 0);
        const object = this._fakeObject(model.getMesh());
        const data   = model.getMesh().toObjectData(model.getMaterials(), this.AnimatedInstance.materialColor, false);
        this._near('vertices mirrored', close(data.points.flat(), [-1, 0, 0, -2, 0, 0, -1, 1, 0]), 0, 0);
        this._equal('triangle turned the other way', JSON.stringify(model.getMesh().getFaces()[0].indices), '[0,2,1]');
        this._equal('material: color, double side, extras', JSON.stringify(model.getMaterials()[0]), '{"color":[1,0,0,1],"doubleSided":true,"extras":{"paletteIndex":105}}');
        const clip = model.getClip('swing');
        this._equal('event read', clip.getEvents().map((event) => event.getName() + ':' + event.getTime() + ':' + event.getData().a).join(), 'mid:0.5:1');
        const socket = model.getSocket('hand');
        this._near('socket on its joint, offset mirrored', close([socket.getJoint(), socket.getOffset()[12], socket.getOffset()[13]], [0, 0, 0.5]), 0, 0);
        const tangent = new Float32Array(3);
        clip.getChannels()[1].getSampler().sample(0.01, this.AnimationSampler.createCursor(), tangent, 0);
        this._check('cubic tangent mirrored: the tip moves towards -x (' + tangent[0].toFixed(4) + ')', (tangent[0] < 0));

        const pose = new this.SkeletonPose(skel);
        clip.applyTo(pose, 1, clip.createCursors());
        pose.computeWorld().computeSkinning();
        model.getMesh().skinInto(object, pose, false);
        // glTF: root at (1, 0, 0) turned +90° about y, vertex (2, 0, 0) → (1, 0, -1); the engine sees x negated.
        this._near('posed vertex in the engine = glTF result mirrored', close(object.ptOrigin[1], [-1, 0, -1]), 0, FLOAT_EPSILON);
    }

    // Each file outside the subset is refused, its cause named.
    _gltfRefusals() {
        const cases = {
            'extensionsRequired': (gltf) => (gltf.extensionsRequired = ['KHR_draco_mesh_compression']),
            'triangles only':     (gltf) => (gltf.meshes[0].primitives[0].mode = 1),
            'baseColorTexture':   (gltf) => (gltf.materials[0].pbrMetallicRoughness.baseColorTexture = {index: 0}),
            'path weights':       (gltf) => (gltf.animations[0].channels[0].target.path = 'weights'),
            'a matrix instead':   (gltf) => (gltf.nodes[2].matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
            'must not move it':   (gltf) => (gltf.nodes[1].translation = [0, 1, 0]),
        };
        for (const [cause, spoil] of Object.entries(cases)) {
            const {gltf, binary} = AnimationBench._gltfModel();
            spoil(gltf);
            let message = '';
            try {
                this.GltfParser.parse(gltf, binary);
            } catch (error) {
                message = error.message;
            }
            this._check('refused: ' + cause + ' (' + message + ')', message.includes(cause));
        }
    }

    /**
     * A small glTF: an armature node above two joints (listed child first in the skin), a triangle on them, a
     * material, a clip turning the root (LINEAR) and moving the tip (CUBICSPLINE), an event and a socket.
     *
     * @returns {{gltf: object, binary: ArrayBuffer}}
     */
    static _gltfModel() {
        const chunks   = [];
        const views    = [];
        const accessors = [];
        let length = 0;
        const add = (typed, componentType, type, count) => {
            views.push({buffer: 0, byteOffset: length, byteLength: typed.byteLength});
            accessors.push({bufferView: (views.length - 1), componentType: componentType, type: type, count: count});
            chunks.push({at: length, bytes: new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength)});
            length += (Math.ceil(typed.byteLength / 4) * 4);

            return (accessors.length - 1);
        };
        const s       = Math.SQRT1_2;
        const float   = 5126;
        const inverse = add(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -1, -1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -1, 0, 0, 1]), float, 'MAT4', 2);
        const points  = add(new Float32Array([1, 0, 0, 2, 0, 0, 1, 1, 0]), float, 'VEC3', 3);
        const joints  = add(new Uint8Array([1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]), 5121, 'VEC4', 3);
        const weights = add(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]), float, 'VEC4', 3);
        const indices = add(new Uint16Array([0, 1, 2]), 5123, 'SCALAR', 3);
        const times   = add(new Float32Array([0, 1]), float, 'SCALAR', 2);
        const turns   = add(new Float32Array([0, 0, 0, 1, 0, s, 0, s]), float, 'VEC4', 2);
        const moves   = add(new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0]), float, 'VEC3', 6);
        const binary  = new Uint8Array(length);
        chunks.forEach((chunk) => binary.set(chunk.bytes, chunk.at));
        const gltf = {
            asset:       {version: '2.0'},
            buffers:     [{byteLength: length, uri: 'bench.bin'}],
            bufferViews: views,
            accessors:   accessors,
            nodes:       [
                {name: 'body', mesh: 0, skin: 0},
                {name: 'armature', children: [2]},
                {name: 'root', translation: [1, 0, 0], children: [3], extras: {sockets: [{name: 'hand', translation: [0, 0.5, 0]}]}},
                {name: 'tip', translation: [0, 1, 0]},
            ],
            skins:       [{joints: [3, 2], inverseBindMatrices: inverse}],
            meshes:      [{primitives: [{attributes: {POSITION: points, JOINTS_0: joints, WEIGHTS_0: weights}, indices: indices, material: 0}]}],
            materials:   [{pbrMetallicRoughness: {baseColorFactor: [1, 0, 0, 1]}, doubleSided: true, extras: {paletteIndex: 105}}],
            animations:  [{
                name:     'swing',
                channels: [{sampler: 0, target: {node: 2, path: 'rotation'}}, {sampler: 1, target: {node: 3, path: 'translation'}}],
                samplers: [{input: times, output: turns, interpolation: 'LINEAR'}, {input: times, output: moves, interpolation: 'CUBICSPLINE'}],
                extras:   {events: [{time: 0.5, name: 'mid', data: {a: 1}}]},
            }],
        };

        return {gltf, binary: binary.buffer};
    }

    /**
     * Three vertices: one on the root, one on the middle joint, one blended half and half between middle and tip.
     */
    _mesh(skeleton) {
        return new this.SkinnedMesh({
            positions: new Float32Array([0, 0.5, 0, 0, 1.5, 0, 1, 1.5, 0]),
            joints:    new Uint16Array([0, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 0]),
            weights:   new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 0.5, 0.5, 0, 0]),
            faces:     [{indices: [0, 1, 2], material: 0}, {indices: [0, 2, 1], material: 1}],
        });
    }

    // Stands for an Object3d: its vertices and a count of refreshGeometry calls.
    _fakeObject(mesh) {
        const object = {ptOrigin: [], refreshed: 0, refreshGeometry: () => object.refreshed++};
        for (let v = 0; v < mesh.getVertexCount(); v++) {
            object.ptOrigin.push([0, 0, 0, 1]);
        }

        return object;
    }

    _worstPoint(object, expected) {
        return Math.max(...expected.map((point, v) => Math.max(...point.map((value, axis) => Math.abs(value - object.ptOrigin[v][axis])))));
    }

    // The largest change of speed between two samples of a pose series, against the fastest speed.
    _seriesJump(samples, step) {
        const speeds  = samples.slice(1).map((sample, i) => sample.map((value, k) => ((value - samples[i][k]) / step)));
        const fastest = Math.max(...speeds.map((speed) => Math.hypot(...speed)));
        let worst = 0;
        for (let i = 1; i < speeds.length; i++) {
            worst = Math.max(worst, (Math.hypot(...speeds[i].map((value, k) => (value - speeds[i - 1][k]))) / fastest));
        }

        return worst;
    }

    // Degrees of the rotation from quaternion a to quaternion b (both at offset 0).
    static _degreesBetween(a, b) {
        const dot = Math.abs((a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]) + (a[3] * b[3]));

        return (2 * Math.acos(Math.min(1, dot)) * (180 / Math.PI));
    }

    _near(label, actual, expected, tolerance) {
        this._check(label + ': ' + actual + ' (expected ' + expected + ')', (Math.abs(actual - expected) <= tolerance));
    }

    _equal(label, actual, expected) {
        this._check(label + ': ' + actual + ' (expected ' + expected + ')', (actual === expected));
    }

    _check(label, ok) {
        if (!ok) {
            this._failures++;
        }
        console.log(((ok) ? '  ok   ' : '  FAIL ') + label);
    }
}

if (!process.execArgv.includes(YOUNG_GENERATION)) {
    const result = child_process.spawnSync(process.execPath, [YOUNG_GENERATION, __filename, ...process.argv.slice(2)], {stdio: 'inherit'});
    process.exit(result.status);
}
new AnimationBench().run().then((failures) => process.exit((failures === 0) ? 0 : 1));
