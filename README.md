# Spipu3D

A 3D engine and a PWA core in pure JavaScript — no framework, no build step, no server side — with the examples that drive them.

This repository is the **reference** of both libraries: they are changed here first, then copied unchanged into the projects that use them ([Spipu-Doom](https://github.com/spipu/doom_js), Spipu-Racing and the other Spipu PWAs, which carry the whole or part of `js/webapp/`). A project never adapts a copy of its own.

- `website/js/engine/` — **Spipu3D**, the 3D engine.
- `website/js/webapp/` and `website/css/webapp/` — the **PWA core**: bootstrap and versions, offline cache, storage, settings, translations, input devices, menu building blocks, network, QR codes.

The application itself (`index.html`) is a PWA built on that core, driven by mouse, keyboard, gamepad or touch: **Examples**, **Options** (language, controls of every device, saved in the browser) and **About**. Every example runs inside it like a level, its files cached with the rest for offline use; Escape, the gamepad's Start or the menu button of the touch pad brings the menu back.

## Run it locally

A modern browser (Chrome, Firefox, Edge) and any static HTTP server — no build step, nothing server side:

```bash
python3 -m http.server 8084 --directory website
```

Then open `http://localhost:8084`.

## Checks

Run from the repository root, in Node, without a browser:

```bash
node bench/bootstrap.js
node bench/animation.js
```

- `bootstrap.js` — every file served is declared in `js/libBootstrap.json`, every declared file exists once, each class after the class it extends.
- `animation.js` — the skeletal animation primitives against known results (interpolations, rotation convention, joints, events, speed jumps, cross-fade, root motion, skinning, glTF reading, allocations by frame); all must come out `ok`.

## The Spipu3D engine

`js/engine/` is a standalone 3D engine with no external dependency: it renders textured, lit 3D objects entirely in the browser through the HTML5 `<canvas>` API, and carries a full FPS physics engine (collision detection, gravity, jumping, crouching, animated objects) for one or several users sharing a world, each moved by its own command and blocking the others. It knows no game: it exposes parameterisable primitives (depth shading, per-instance light and render offset, external forces, screen sprites…) that a game feeds with its own constants.

It also animates skeletal characters: models read from glTF 2.0 files (a skeleton, a skinned mesh, clips and their events, sockets for held objects), played with cross-fades from one clip to the next, moved by root motion (the clips' own travel, so the feet do not slide), objects held in a hand following it.

Four rendering modes are available (the **Renderer** row of the objects list switches between them):

| Mode | Description |
|---|---|
| `webgl` | WebGL — GPU shaders, z-buffer, texture mapping (default, falls back to `full` if unavailable) |
| `full` | Per-pixel z-buffer with Gouraud shading and texture mapping |
| `flat` | Painter's algorithm with flat shading — one colour per face, the average colour of its texture — on a neutral grey backdrop |
| `fast` | Wireframe — no lighting, canvas 2D paths only, on the same grey backdrop |

Whatever the mode, instances are frustum-culled in camera space before any per-vertex work. The static collision geometry is indexed once per world in a uniform XZ spatial grid, so every floor/wall/ray query only tests the triangles of the cells it touches; dynamic movers stay on a linear scan.

## Examples

| Example | Description |
|---|---|
| Still render | The Lotus F1, no interaction |
| Objects | A list of objects and the renderer to draw them with, then the object alone, turned by the mouse, a finger or the movement stick |
| Lights | Coloured light sources — move them around |
| Van | Drive the van |
| Labyrinth | First-person navigation inside a 3D labyrinth, FPS physics |
| Animation | A skeletal character read from glTF walking on an endless ground, the camera behind it: up walks, down walks back, left / right side-step, and turn while walking (arrow keys or movement stick); motion capture from the [CMU Graphics Lab Motion Capture Database](http://mocap.cs.cmu.edu) (funded by NSF EIA-0196217) |
| Network bench | Devices pair by QR code (or two tabs in loopback), link over WebRTC, measure their ping and exchange chunked bursts |
| Network game | The main drives the van through the synchronous turn cycle (a state to every sub, a command back from each, then the next turn), every paired sub watches it live with its ping and the turn rate |

The 3D examples run in a 16:9 letterboxed fullscreen and take keyboard, gamepad or touch pad; the network ones keep their own diagnostic page, with a Menu button. Their objects (cube, sphere, lotus, van…), the animated character (`models/`) and the labyrinth world live in `website/assets/`.

## Architecture

```
bench/                        Checks run in Node: bootstrap definitions, animation primitives
website/
├── index.html                The showcase shell (PWA): the only page
├── appServiceWorker.js       Service Worker — cache-first, offline (must stay at webroot: SW scope)
├── ping.json                 Install/update/start tracking json — hit only
├── assets/                   The examples' objects, models, textures and world
├── css/                      Shell, showcase menu theme, network examples' page; webapp/: the structure of the generic menus
├── icon/                     The standard icon set, drawn from icon.svg
├── lib/libadlmidi/           Vendored libADLMIDI-JS OPL3 synthesizer (LGPL v3 — own LICENSE.md + modification README.md)
├── lib/zxing-wasm/           Vendored zxing-wasm QR code reader and writer (MIT, Apache-2.0, BSD-3 — own LICENSE.md + README.md)
└── js/
    ├── libBootstrap.json     The bootstrap definition: version + every file of the application (engine, PWA core, showcase, assets)
    ├── main.js               Entry point
    ├── showcase/             The showcase: navigator, menu screens, options and settings (IndexedDB), texts (en + fr + it + es)
    │   └── example/             The examples, each a class run like a level (load, scene, frame loop, back to the menu)
    ├── webapp/               PWA core — bootstrap/versioning, IndexedDB wrapper with versioned schema upgrades, persistent settings, translation catalog, content hash, wake lock, iOS viewport
    │   ├── input/               Raw input devices: keyboard, mouse, gamepad with rebindable actions, virtual touch gamepad laid out by the page
    │   ├── menu/                Building blocks of DOM menus: letterboxed display, list navigation (mouse, keyboard, gamepad), modals, settings pages, on-screen keyboard, their texts
    │   ├── net/                 Peer-to-peer network layer — WebRTC and loopback links, compact signals, pairing codes and flows, messages, ping, star sessions
    │   └── qr/                  QR code writing, camera scanning, camera probe and the pairing view (code shown, code read)
    └── engine/               Spipu3D — the game-agnostic 3D engine
        ├── engine3d.js          Viewport, lights, render loop, frustum culling
        ├── collision.js         FPS physics: spatially indexed triangles, box blockers, mover pressure
        ├── spatialGrid.js       Uniform XZ grid over a static triangle set
        ├── animation/           Skeletal animation: matrices and quaternions, skeleton and pose, curves, clips and events, skinned mesh, player (cross-fade, root motion), animated instance
        ├── entity/              Object3d, Billboard, Instance (keyframes/triggers/cycles), AnimatedModel, User, UserCommand, World, external forces
        ├── input/               FPS controller over the webapp devices: game actions, gamepad and touch layouts, and the command sampler
        ├── interaction/         Interaction bases (switch modes once/timed/toggle)
        ├── loader/              URL or in-memory loaders (textures, objects, instances, interactions, world, glTF animated models)
        ├── sound/               Audio primitives: shared AudioContext with music/effects buses, in-memory PCM samples, tone synthesis, music player over a swappable synth contract
        ├── hud/                 HUD bases (debug overlay, screen flash)
        └── renderer/            webgl / full / flat / fast renderers
```

## In-memory loading

The engine loaders accept either URLs (the examples) or in-memory data (a game building its world itself, such as Spipu-Doom's WAD converter):

```javascript
loader.reset();
loader.beginBatch();                                    // suspends the global finalize check
const texId = loader.textures().loadFromData(null, imageData);          // ImageData
const objId = loader.objects().loadFromData('map', {textures, points, faces});
loader.instances().loadFromData(null, {...instanceData, object: objId});
loader.interactions().loadFromData(new MySwitchInteraction(...));
loader.world().loadFromData(definition);                // user, background, lights
loader.setCallback(init);
loader.endBatch();                                      // finalizes everything once, fires init
```

## Webapp bootstrap

Every page is loaded by the generic `appBootstrap` (global instance) from `libBootstrap.json`-style definitions (`{version, files: {assets, css, js}}`), several of which can be stacked (`v2.001|v1.018`). The showcase loads one, `js/libBootstrap.json`, which lists every file it serves — engine, PWA core, showcase and assets — so the whole application is cached at the first visit:

```html
<div id="screen"></div>
<script src="./js/webapp/appBootstrap.js"></script>
<script>
    appBootstrap.addBootstrapDefinition('/js/libBootstrap.json');
</script>
```

`js/main.js`, the last file of the list, registers the entry point (`appBootstrap.setReadyCallback(loadApp)`). A change of version triggers a full update — in PWA mode the Service Worker clears its cache and re-downloads everything; in classic mode the page reloads with `?v=` cache-busted URLs (`appBootstrap.buildUrl`).

## Scene pattern

What an example does in its scene, written here as a plain page would:

```javascript
function init() {
    const world = loader.world().get();
    screen = new ScreenManager('screen', { fullscreen: true });  // or { width, height }
                                                                 // or { fullscreen: true, virtualWidth: 1920, virtualHeight: 1080 }
    inputs  = new Inputs().bindScreen(screen);  // one single instance per page
    sampler = new InputCommandSampler(inputs);  // the devices, turned into one command per turn
    engine = new Engine3d(screen, new Object3dRendererList().getRenderer('webgl'));  // binds itself to the screen
    const hud = new HudDebug(engine)
        .bindUser(world.getUser()).bindInputs(inputs)
        .addDescription('(c)2026 Spipu')
    ;
    screen.bindHud(hud);
    engine.initFromWorld(world);
    requestAnimationFrame(animate);
}

function animate(timestamp) {
    engine.calculateDeltaTime(timestamp);
    const dt = engine.getDeltaTime();
    world.update(dt, new Map([[world.getUser(), sampler.collect(dt).sample()]]));  // one command per user
    engine.displayWorld(world, world.getUser());  // the camera looks through one user
    screen.update(); // updates HUD overlay
    requestAnimationFrame(animate);
}
```

## Versioning

After any file change, increment the `version` of `js/libBootstrap.json`. This drives both the PWA cache refresh and the classic-mode cache busting. A project that copies a changed file increments its own definitions as well.

## License

This program is distributed under the MIT License — see the [./LICENSE.md](./LICENSE.md) file, except:

* the `website/lib/libadlmidi/` directory (the vendored libADLMIDI-JS music synthesizer), distributed under the LGPL v3, with its own LICENSE.md and attribution README.
* the `website/lib/zxing-wasm/` directory (the vendored QR code library), distributed under the MIT, Apache-2.0 and BSD-3-Clause licences of its three components, all permissive, with its own LICENSE.md.
* the motion capture of `website/assets/models/character.bin`, taken from the [CMU Graphics Lab Motion Capture Database](http://mocap.cs.cmu.edu) (created with funding from NSF EIA-0196217), free to use with this credit.
