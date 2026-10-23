/**
 * Options of the showcase: show() opens the tabs (display, controls) with a reset button, showAbout() a standalone
 * page. Adds to AppMenuSettingsModal the Controls page (device choice, then the settings of that device; their key,
 * button and axis captures are the socle's).
 */
class ShowcaseOptionsModal extends AppMenuSettingsModal {
    /**
     * @param {AppMenuDisplay} display
     */
    constructor(display) {
        super(display, showcaseSettings);

        this._shownDevices = null;
    }

    show() {
        return this._openTabs('menu.options', [
            {titleCode: 'options.display', builder: () => this._buildDisplay()},
            {titleCode: 'options.controls', builder: () => this._buildControls()}
        ], {labelCode: 'options.reset', action: () => this._confirmReset()});
    }

    showAbout() {
        return this._open(true, 'menu.about', () => this._buildAbout());
    }

    // --- Pages ---

    _buildDisplay() {
        this._buildSettingsList(showcaseSettings.getDefinitions('display.'));
    }

    _confirmReset() {
        this._confirm(appTranslator.get('options.resetConfirm'), () => {
            showcaseSettings.resetAll();
            this._applySettings();
            this._renderPage();
        }, null, null, true, appTranslator.get('options.resetDetail'));
    }

    _buildControls() {
        const inputs = new Inputs();
        const list   = this._addList();
        const device = this._nav.addItemIn(list, appTranslator.get('settings.controls.device'), () => {
            this._stepDevice(inputs, 1);
        }, (dir) => {
            this._stepDevice(inputs, dir);
        });
        AppMenuDom.addValue(device, this._deviceChoiceLabel(this._currentDeviceChoice(inputs), inputs), true);

        this._shownDevices = this._devicesState(inputs);
        for (const prefix of ShowcaseOptionsModal.SETTING_PREFIXES_BY_MODE[inputs.getMode()]) {
            for (const definition of showcaseSettings.getDefinitions(prefix)) {
                this._addSettingItem(list, definition);
            }
        }
        this._nav.selectFirst();

        this._setPageTimer(() => {
            if (this._devicesState(inputs) !== this._shownDevices) {
                this._renderPage();
            }
        }, ShowcaseOptionsModal.DEVICE_REFRESH_MS);
    }

    _deviceChoices(inputs) {
        return [ShowcaseSettings.DEVICE_AUTO].concat(inputs.getAvailableModes());
    }

    // A saved device that is not available shows as the automatic choice it falls back on.
    _currentDeviceChoice(inputs) {
        const saved = showcaseSettings.get(ShowcaseSettings.DEVICE_KEY);

        return (this._deviceChoices(inputs).includes(saved) ? saved : ShowcaseSettings.DEVICE_AUTO);
    }

    // The settings listed below follow the device: the page is rebuilt.
    _stepDevice(inputs, dir) {
        const choices = this._deviceChoices(inputs);
        const index   = choices.indexOf(this._currentDeviceChoice(inputs));
        const next    = choices[((index + dir + choices.length) % choices.length)];

        showcaseSettings.set(ShowcaseSettings.DEVICE_KEY, next).applyToInputs(inputs);
        this._renderPage();
    }

    // What the page shows depends on: the devices offered, the one in use, the gamepad's name.
    _devicesState(inputs) {
        return [inputs.getAvailableModes().join(','), inputs.getMode(), (inputs.getGamepadName() ?? '')].join('|');
    }

    _deviceChoiceLabel(choice, inputs) {
        if (choice === ShowcaseSettings.DEVICE_AUTO) {
            return appTranslator.get('device.auto', {device: this._deviceLabel(inputs.getAutoMode(), inputs)});
        }

        return this._deviceLabel(choice, inputs);
    }

    _deviceLabel(mode, inputs) {
        if (mode === 'virtualGamepad') {
            return appTranslator.get('device.virtualPad');
        }
        if (mode === 'gamepad') {
            return appTranslator.get('device.gamepad', {name: AppInputGamepad.displayName(inputs.getGamepadName() ?? '')});
        }

        return appTranslator.get('device.keyboardMouse');
    }

    _buildAbout() {
        this._addLines(['about.what', 'about.author', 'about.source']);
        this._addExternalLink(ShowcaseOptionsModal.SOURCE);
        this._addLines(['about.licence', 'about.motionCapture']);
        this._addLines(['about.copyright'], {year: new Date().getFullYear()});
    }

    // --- Settings hooks ---

    _applySettings() {
        showcaseSettings.applyToInputs(new Inputs()).applyToTranslator(appTranslator);
    }

    _rebuildsPage(definition) {
        return (definition.key === ShowcaseSettings.LANGUAGE_KEY);
    }
}

ShowcaseOptionsModal.DEVICE_REFRESH_MS        = 500;
// Settings key prefixes of each input mode (ShowcaseSettings definitions).
ShowcaseOptionsModal.SETTING_PREFIXES_BY_MODE = Object.freeze({
    gamepad:        ['pad.'],
    virtualGamepad: ['virtual_pad.'],
    keyboardMouse:  ['mouse.', 'keyboard.']
});
ShowcaseOptionsModal.SOURCE                   = 'https://github.com/spipu/3d-engine';
