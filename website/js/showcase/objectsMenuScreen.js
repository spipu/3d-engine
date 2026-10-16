/**
 * The objects of the viewer, and the renderer it draws them with (Left / Right on its row).
 */
class ObjectsMenuScreen extends AppMenuAbstractScreen {
    /**
     * @param {ShowcaseNavigator} navigator
     * @param {AppMenuDisplay}    display
     */
    constructor(navigator, display) {
        super(display);

        this._navigator = navigator;
        this._renderer  = 0;
    }

    _titleText() {
        return MainMenuScreen.BRAND;
    }

    _build() {
        const {panel, listEl} = this._buildPanel(appTranslator.get('example.objects'));
        let valueEl = null;

        const rendererItem = this._nav.addItemIn(listEl, appTranslator.get('objects.renderer'), () => {
            this._stepRenderer(1, valueEl);
        }, (dir) => {
            this._stepRenderer(dir, valueEl);
        });
        valueEl = AppMenuDom.addText(rendererItem, 'app-menu-item-value', ObjectsMenuScreen.RENDERERS[this._renderer].label);
        for (const code of ObjectsMenuScreen.OBJECTS) {
            this._addListItem(listEl, appTranslator.get('object.' + code), () => {
                this._navigator.run(new ObjectViewerExample(code, ObjectsMenuScreen.RENDERERS[this._renderer].code));
            });
        }
        this._addBackButton(panel);
        this._nav.selectFirst();
    }

    _onBack() {
        this._navigator.openExamples();
    }

    _stepRenderer(dir, valueEl) {
        const count = ObjectsMenuScreen.RENDERERS.length;

        this._renderer      = ((this._renderer + dir + count) % count);
        valueEl.textContent = ObjectsMenuScreen.RENDERERS[this._renderer].label;
    }
}

// Object3dRendererList codes; their names are not translated.
ObjectsMenuScreen.RENDERERS = Object.freeze([
    {code: 'webgl', label: 'WebGL'},
    {code: 'full',  label: 'Full'},
    {code: 'flat',  label: 'Flat'},
    {code: 'fast',  label: 'Fast'}
]);
// The files of assets/objects/, by name.
ObjectsMenuScreen.OBJECTS = Object.freeze([
    'cube', 'sphere', 'torus', 'lotus', 'car', 'tank', 'helico_civil', 'helico_military', 'plane', 'ship', 'dyno', 'head', 'teddy'
]);
