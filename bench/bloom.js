/**
 * Bloom bench: the WebGL renderer driven by a recording fake WebGL context (no GPU, no browser).
 *
 * Without bloom: no framebuffer is made or bound and the core-whitening uniform stays 0, so the frame is drawn as
 * before. With bloom: 2 + 2 × levels framebuffers, made once and remade only when the screen size changes; a glowing
 * face is drawn twice (scene, then glow pass), merged into one batch per draw state; GL state back to the renderer's
 * defaults at the end; resources freed on the first frame without bloom. Run: node bench/bloom.js
 */
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const WEBSITE_DIR = path.join(path.resolve(__dirname, '..'), 'website');
const SOURCES     = [
    'js/engine/entity/face.js',
    'js/engine/renderer/base/faceDepthQueue.js',
    'js/engine/renderer/object3dRendererBase.js',
    'js/engine/renderer/webgl/bloom.js',
    'js/engine/renderer/object3dRendererWebGL.js',
];
const LEVELS    = 4;
const GL_CONSTS = {
    FRAMEBUFFER: 0x8D40, RENDERBUFFER: 0x8D41, TEXTURE_2D: 0x0DE1, TEXTURE0: 0x84C0, ARRAY_BUFFER: 0x8892,
    BLEND: 0x0BE2, DEPTH_TEST: 0x0B71, LESS: 0x0201, LEQUAL: 0x0203, ONE: 1, ONE_MINUS_SRC_ALPHA: 0x0303,
    COMPILE_STATUS: 0x8B81, TRIANGLES: 4, FLOAT: 0x1406
};

class BloomBench {
    constructor() {
        this._ctx = vm.createContext({console, Math, Float32Array, Uint8Array, Map, WeakMap, Object, Error, Number, loader: {textures: () => ({get: () => null})}});
        for (const file of SOURCES) {
            vm.runInContext(fs.readFileSync(path.join(WEBSITE_DIR, file), 'utf8'), this._ctx, {filename: file});
        }
        this.Renderer = vm.runInContext('Object3dRendererWebGL', this._ctx);
        this.Face     = vm.runInContext('Face', this._ctx);
        this._failures = 0;
    }

    run() {
        const gl       = BloomBench._recordingGl();
        const renderer = new this.Renderer();
        const engine   = this._engine(gl, 800, 450);
        const obj      = this._object();

        this._frame(renderer, engine, obj);
        this._equal('off: no framebuffer made', gl.count('createFramebuffer'), 0);
        this._equal('off: no framebuffer bound', gl.count('bindFramebuffer'), 0);
        this._equal('off: core whitening only reset (one call a frame)', gl.coreWhiteValues().join(','), '0');
        this._equal('off: one draw call for the glowing face', gl.count('drawArrays'), 1);

        gl.reset();
        engine.bloom = {levels: LEVELS};
        this._frame(renderer, engine, obj);
        this._equal('on: framebuffers made', gl.count('createFramebuffer'), (2 + (2 * LEVELS)));
        this._equal('on: core whitening set for the glowing group', gl.coreWhiteValues().includes(0.5), true);
        // Scene draw + glow pass draw + per level (downsample + 2 blurs) + composition.
        this._equal('on: draw calls', gl.count('drawArrays'), (2 + (3 * LEVELS) + 1));
        this._equal('on: ends on the screen framebuffer', gl.lastArg('bindFramebuffer', 1), null);
        this._equal('on: blending and depth test back on', (gl.isOn(GL_CONSTS.BLEND) && gl.isOn(GL_CONSTS.DEPTH_TEST)), true);
        this._equal('on: depth function back to LESS', gl.lastArg('depthFunc', 0), GL_CONSTS.LESS);
        this._equal('on: depth writes back on', gl.lastArg('depthMask', 0), true);
        this._equal('on: premultiplied blending back', gl.lastArgs('blendFunc').join(','), [GL_CONSTS.ONE, GL_CONSTS.ONE_MINUS_SRC_ALPHA].join(','));

        gl.reset();
        this._frame(renderer, engine, obj);
        this._equal('on, same size: nothing remade', gl.count('createFramebuffer'), 0);

        gl.reset();
        renderer._bloom.record(new Float32Array(18), 9, new Float32Array(19), null, false);
        renderer._bloom.record(new Float32Array(18), 9, new Float32Array(19), null, false);
        this._equal('same state: one merged batch', renderer._bloom._batchCount, 1);
        renderer._bloom._batchCount = 0;
        renderer._bloom._glowFloats = 0;

        gl.reset();
        engine.scrWidth = 640;
        this._frame(renderer, engine, obj);
        this._equal('on, new size: remade', gl.count('createFramebuffer'), (2 + (2 * LEVELS)));
        this._equal('on, new size: old ones freed', gl.count('deleteFramebuffer'), (2 + (2 * LEVELS)));

        gl.reset();
        engine.bloom = null;
        this._frame(renderer, engine, obj);
        this._equal('off again: resources freed', gl.count('deleteFramebuffer'), (2 + (2 * LEVELS)));
        this._equal('off again: nothing bound', gl.count('bindFramebuffer'), 0);

        console.log((this._failures === 0) ? 'bloom: all checks passed' : ('bloom: ' + this._failures + ' check(s) failed'));

        return this._failures;
    }

    _frame(renderer, engine, obj) {
        renderer.begin(engine);
        renderer.draw(obj, engine);
        renderer.end(engine);
    }

    _engine(gl, width, height) {
        return {
            scrCtx: gl, scrWidth: width, scrHeight: height, background: [0, 0, 0], sky: null, bloom: null,
            textureSmoothing: true, projScaleX: 1, projScaleY: 1, projOffsetX: 0, projOffsetY: 0,
            zBuffer: {getNear: () => 0.1, getFar: () => 100}, instanceDepthBias: 0, instanceLight: 1,
            depthShading: null, lightOverride: null, lightBoost: 0, lightList: [], ambientLight: [255, 255, 255], sceneMs: 0
        };
    }

    // One glowing triangle facing the camera (camera space: z forward, the eye at the origin).
    _object() {
        const face  = new this.Face(0, 1, 2, [255, 0, 0], null, null, 1, false, false, false, null, null, null, null);
        face.glow   = true;
        face.normal = [0, 0, -1];

        return {
            faceList: [face], opaqueFaces: [0], alphaFaces: [], pt3d: [[0, 0, 5], [1, 0, 5], [0, 1, 5]],
            getFaceGroupsVersion: () => 0, getFaceLightFactor: () => 1
        };
    }

    // A fake WebGL context: every call recorded, objects as plain tokens, the BLEND / DEPTH_TEST switches tracked.
    static _recordingGl() {
        const calls = [];
        const on    = new Map();
        let token   = 0;
        const target = {
            ...GL_CONSTS,
            count:   (name) => calls.filter((c) => (c.name === name)).length,
            lastArg: (name, index) => [...calls].reverse().find((c) => (c.name === name)).args[index],
            lastArgs: (name) => [...calls].reverse().find((c) => (c.name === name)).args,
            isOn:    (cap) => (on.get(cap) === true),
            reset:   () => (calls.length = 0),
            coreWhiteValues: () => calls.filter((c) => ((c.name === 'uniform1f') && (c.args[0] === 'loc:u_coreWhite'))).map((c) => c.args[1]),
            getUniformLocation: (program, name) => ('loc:' + name),
            getAttribLocation:  () => 0,
            getShaderParameter: () => true,
            enable:  (cap) => on.set(cap, true),
            disable: (cap) => on.set(cap, false)
        };

        return new Proxy(target, {
            get: (object, name) => {
                if (name in object) {
                    const value = object[name];
                    if ((typeof value === 'function') && ['enable', 'disable', 'getUniformLocation'].includes(name)) {
                        return (...args) => {
                            calls.push({name, args});
                            return value(...args);
                        };
                    }
                    return value;
                }
                if (typeof name !== 'string') {
                    return undefined;
                }
                if (/^[A-Z_0-9]+$/.test(name)) {
                    return name;
                }

                return (...args) => {
                    calls.push({name, args});
                    return ((/^create/.test(name)) ? {token: ++token} : undefined);
                };
            }
        });
    }

    _equal(label, actual, expected) {
        const ok = (actual === expected);
        if (!ok) {
            this._failures++;
        }
        console.log(((ok) ? '  ok   ' : '  FAIL ') + label + ': ' + actual + ' (expected ' + expected + ')');
    }
}

process.exit((new BloomBench().run() === 0) ? 0 : 1);
