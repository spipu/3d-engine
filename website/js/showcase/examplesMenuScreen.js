/**
 * The list of the examples. The objects open their own list, every other one runs at once.
 */
class ExamplesMenuScreen extends AppMenuAbstractScreen {
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
        const {panel, listEl} = this._buildPanel(appTranslator.get('menu.examples'));

        for (const example of ExamplesMenuScreen.EXAMPLES) {
            const item = this._addListItem(listEl, appTranslator.get('example.' + example.code), () => example.open(this._navigator));
            this._addListItemInfos(item, appTranslator.get('example.' + example.code + '.infos'));
        }
        this._addBackButton(panel);
        this._nav.selectFirst();
    }

    _onBack() {
        this._navigator.showHome();
    }
}

ExamplesMenuScreen.EXAMPLES = Object.freeze([
    {code: 'still',        open: (navigator) => navigator.run(new StillExample())},
    {code: 'objects',      open: (navigator) => navigator.openObjects()},
    {code: 'lights',       open: (navigator) => navigator.run(new LightsExample())},
    {code: 'van',          open: (navigator) => navigator.run(new VanExample())},
    {code: 'world',        open: (navigator) => navigator.run(new WorldExample())},
    {code: 'animate',      open: (navigator) => navigator.run(new AnimateExample())},
    {code: 'networkBench', open: (navigator) => navigator.run(new NetworkBenchExample())},
    {code: 'networkGame',  open: (navigator) => navigator.run(new NetworkGameExample())}
]);
