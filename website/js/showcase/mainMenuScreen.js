/**
 * Main menu, the screen the showcase starts on: the examples, the options, about.
 */
class MainMenuScreen extends AppMenuAbstractScreen {
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
        this._container.classList.add('app-menu-screen-home');
        const {listEl} = this._buildSimpleMenu(MainMenuScreen.BRAND);

        this._addListItem(listEl, appTranslator.get('menu.examples'), () => {
            this._navigator.openExamples();
        });
        this._addListItem(listEl, appTranslator.get('menu.options'), () => {
            this._openModal(new ShowcaseOptionsModal(this._display)).show();
        });
        this._addListItem(listEl, appTranslator.get('menu.about'), () => {
            this._openModal(new ShowcaseOptionsModal(this._display)).showAbout();
        });
        this._nav.selectFirst();
    }
}

MainMenuScreen.BRAND = 'Spipu3D';
