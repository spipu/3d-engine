/**
 * Swipe bench: AppInputSwipe fed with fake touch events on a fake element (no browser). Run: node bench/swipe.js
 */
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const SOURCE = path.join(path.resolve(__dirname, '..'), 'website', 'js', 'webapp', 'input', 'appInputSwipe.js');
// Element height in pixels: a threshold of 0.06 is 24 px.
const HEIGHT = 400;
const STEP   = 4;

class SwipeBench {
    constructor() {
        this._listeners = {element: new Map(), window: new Map()};
        const element = this._fakeTarget('element');
        element.style = {touchAction: 'auto'};
        element.getBoundingClientRect = () => ({height: HEIGHT});
        this._element = element;
        this._ctx = vm.createContext({window: this._fakeTarget('window'), Map, Math});
        vm.runInContext(fs.readFileSync(SOURCE, 'utf8'), this._ctx, {filename: 'appInputSwipe.js'});
        this.AppInputSwipe = vm.runInContext('AppInputSwipe', this._ctx);
        this._failures = 0;
    }

    run() {
        const swipe = new this.AppInputSwipe(this._element).attach();
        this._equal('attach: touch-action none', this._element.style.touchAction, 'none');
        this._equal('attach: passive listeners only', [...this._listeners.element.values()].every((l) => (l.options.passive === true)), true);

        this._slide(1, [[100, 200], [80, 200]]);
        this._equal('below the threshold: no gesture', this._drain(swipe), '');
        this._slide(2, [[100, 200], [100 - (5 * 24), 200]], true);
        this._equal('5 thresholds to the left in small steps: one gesture', this._drain(swipe), 'left');
        this._slide(3, [[100, 200], [70, 200], [70, 170]]);
        this._equal('left then up with the same finger: two gestures', this._drain(swipe), 'left,up');
        this._slide(4, [[100, 200], [70, 200], [100, 200]]);
        this._equal('left then back right: two gestures', this._drain(swipe), 'left,right');
        this._slide(5, [[100, 200], [100, 240]]);
        this._equal('down', this._drain(swipe), 'down');

        this._fire('element', 'touchstart', [{id: 6, x: 10, y: 10}, {id: 7, x: 300, y: 10}]);
        this._fire('element', 'touchmove', [{id: 6, x: 10, y: 50}, {id: 7, x: 340, y: 10}]);
        this._fire('element', 'touchend', [{id: 6}, {id: 7}]);
        this._equal('two fingers: one gesture each', this._drain(swipe), 'down,right');

        this._fire('element', 'touchstart', [{id: 8, x: 10, y: 10}]);
        this._fire('element', 'touchcancel', [{id: 8}]);
        this._fire('element', 'touchmove', [{id: 8, x: 10, y: 90}]);
        this._equal('after touchcancel: the finger is forgotten', this._drain(swipe), '');

        this._fire('element', 'touchstart', [{id: 9, x: 10, y: 10}]);
        this._fire('window', 'resize', []);
        this._fire('element', 'touchmove', [{id: 9, x: 10, y: 90}]);
        this._equal('after a resize: the fingers are forgotten', this._drain(swipe), '');

        for (const [i, x] of [[10, 60], [11, 60], [12, 60], [13, 60], [14, 60], [15, 60]]) {
            this._slide(i, [[100, 100], [x, 100]]);
        }
        this._equal('queue of 4 at most', this._drain(swipe), 'left,left,left,left');

        this._slide(16, [[100, 100], [60, 100]]);
        swipe.clear();
        this._equal('clear drops the waiting gestures', this._drain(swipe), '');

        swipe.detach();
        this._equal('detach: touch-action given back', this._element.style.touchAction, 'auto');
        this._equal('detach: listeners removed', this._listeners.element.size, 0);

        console.log((this._failures === 0) ? 'swipe: all checks passed' : ('swipe: ' + this._failures + ' check(s) failed'));

        return this._failures;
    }

    // A finger put down at the first point, moved through the others (in STEP-pixel steps when smooth), lifted.
    _slide(id, points, smooth = false) {
        this._fire('element', 'touchstart', [{id: id, x: points[0][0], y: points[0][1]}]);
        let [x, y] = points[0];
        for (const [tx, ty] of points.slice(1)) {
            if (!smooth) {
                [x, y] = [tx, ty];
                this._fire('element', 'touchmove', [{id: id, x: x, y: y}]);
                continue;
            }
            while ((x !== tx) || (y !== ty)) {
                x += Math.sign(tx - x) * Math.min(STEP, Math.abs(tx - x));
                y += Math.sign(ty - y) * Math.min(STEP, Math.abs(ty - y));
                this._fire('element', 'touchmove', [{id: id, x: x, y: y}]);
            }
        }
        this._fire('element', 'touchend', [{id: id}]);
    }

    _drain(swipe) {
        const out = [];
        let gesture = swipe.poll();
        while (gesture !== null) {
            out.push(gesture);
            gesture = swipe.poll();
        }

        return out.join(',');
    }

    _fire(target, type, touches) {
        const listener = this._listeners[target].get(type);
        if (listener === undefined) {
            return;
        }
        listener.fn({changedTouches: touches.map((t) => ({identifier: t.id, clientX: t.x, clientY: t.y}))});
    }

    _fakeTarget(name) {
        return {
            addEventListener:    (type, fn, options = {}) => this._listeners[name].set(type, {fn, options}),
            removeEventListener: (type) => this._listeners[name].delete(type)
        };
    }

    _equal(label, actual, expected) {
        const ok = (actual === expected);
        if (!ok) {
            this._failures++;
        }
        console.log(((ok) ? '  ok   ' : '  FAIL ') + label + ': ' + actual + ' (expected ' + expected + ')');
    }
}

process.exit((new SwipeBench().run() === 0) ? 0 : 1);
