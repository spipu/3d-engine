/**
 * The objects of the viewer, drawn with the renderer of the options.
 */
class ObjectsMenuScreen extends AppMenuAbstractScreen {
    /**
     * @param {ShowcaseNavigator} navigator
     * @param {AppMenuDisplay}    display
     */
    constructor(navigator, display) {
        super(display);

        this._navigator = navigator;
    }

    _titleText() {
        return MainMenuScreen.BRAND;
    }

    _build() {
        const {panel, listEl} = this._buildPanel(appTranslator.get('example.objects'));

        for (const code of ObjectsMenuScreen.OBJECTS) {
            this._addListItem(listEl, appTranslator.get('object.' + code), () => {
                this._navigator.run(new ObjectViewerExample(code));
            });
        }
        this._addBackButton(panel);
        this._nav.selectFirst();
    }

    _onBack() {
        this._navigator.openExamples();
    }
}

// The files of assets/objects/, by name.
ObjectsMenuScreen.OBJECTS = Object.freeze([
    'cube', 'sphere', 'torus', 'lotus', 'car', 'tank', 'helico_civil', 'helico_military', 'plane', 'ship', 'dyno', 'head', 'teddy'
]);
