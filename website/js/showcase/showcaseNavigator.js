/**
 * Entry point of the showcase: opens the database, reads the settings (their language reaches the translator before
 * the first screen is built, their controls the engine's inputs), then handles the menu screens and the example
 * running in their place. The page is never left: an example takes the screen like a level, then gives it back to
 * the screen it was opened from.
 */
class ShowcaseNavigator {
    constructor() {
        this._display        = new AppMenuDisplay(AbstractShowcaseExample.SCREEN_ID, AppMenuDisplay.LANDSCAPE);
        this._database       = new AppDatabase(ShowcaseDatabaseSchema.build());
        this._mainMenuScreen = new MainMenuScreen(this, this._display);
        this._examplesScreen = new ExamplesMenuScreen(this, this._display);
        this._objectsScreen  = new ObjectsMenuScreen(this, this._display);
        this._currentScreen  = null;
        this._example        = null;
        this._exampleFrom    = null;
    }

    // A storage failure keeps the default settings: the menu still opens, with a notice.
    start() {
        this._display.init();
        this._database.open()
            .then(() => showcaseSettings.init(this._database))
            .then(() => true, (error) => {
                console.warn('ShowcaseNavigator - storage unavailable: ' + error.message);
                return false;
            })
            .then((storageReady) => {
                showcaseSettings.applyToTranslator(appTranslator).applyToInputs(new Inputs());
                this.showHome();
                if (!storageReady) {
                    new AppMenuModal(this._display).info(appTranslator.get('menu.storageUnavailable'));
                }
            })
            .catch((error) => {
                console.error(error);
            });

        return this;
    }

    showHome() {
        this._switchTo(this._mainMenuScreen);
    }

    openExamples() {
        this._switchTo(this._examplesScreen);
    }

    openObjects() {
        this._switchTo(this._objectsScreen);
    }

    /**
     * Leaves the menus for an example; the pause input brings back the screen it was opened from.
     *
     * @param {AbstractShowcaseExample} example
     */
    run(example) {
        this._exampleFrom = this._currentScreen;
        this._switchTo(null);
        this._display.destroy();
        this._example = example.start(() => this._leaveExample());
    }

    _leaveExample() {
        this._example.stop();
        this._example = null;
        this._display.init();
        this._switchTo(this._exampleFrom);
    }

    _switchTo(screen) {
        if (this._currentScreen !== null) {
            this._currentScreen.hide();
        }
        this._currentScreen = screen;
        if (screen !== null) {
            screen.show();
        }
    }
}
