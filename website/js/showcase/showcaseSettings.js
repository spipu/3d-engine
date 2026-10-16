/**
 * Persistent settings of the showcase, stored in the `setting` store of the spipu3d IndexedDB base: the language and
 * the controls the examples use (moving, looking, jumping, crouching, using, the pause back to the menu). The options
 * are built from DEFINITIONS; applyToInputs hands the controls to the engine's Inputs.
 */
class ShowcaseSettings extends AppSettings {
    static get DEFINITIONS() {
        return [
            // The browser's language until one is chosen.
            {key: ShowcaseSettings.LANGUAGE_KEY,  nameCode: 'settings.display.language',        type: 'list', default: ShowcaseTranslations.browserLanguage(), values: ShowcaseSettings.LANGUAGE_VALUES},
            // The Controls page offers the devices available only; a device not available counts as the automatic choice.
            {key: ShowcaseSettings.DEVICE_KEY,    nameCode: 'settings.controls.device',         type: 'list', default: ShowcaseSettings.DEVICE_AUTO, values: [{code: ShowcaseSettings.DEVICE_AUTO, labelCode: 'device.auto'}, {code: 'keyboardMouse', labelCode: 'device.keyboardMouse'}, {code: 'gamepad', labelCode: 'device.gamepad'}, {code: 'virtualGamepad', labelCode: 'device.virtualPad'}]},
            {key: 'pad.y_inverse',                nameCode: 'settings.pad.yInverse',            type: 'bool', default: false},
            // W3C standard gamepad layout; the defaults mirror InputGamepad.DEFAULT_AXIS_MAPPING and DEFAULT_MAPPING.
            {key: 'pad.move_x',                   nameCode: 'settings.pad.moveX',               type: 'padAxis', default: '+0', action: 'moveX', direction: 'right'},
            {key: 'pad.move_y',                   nameCode: 'settings.pad.moveY',               type: 'padAxis', default: '+1', action: 'moveY', direction: 'up'},
            {key: 'pad.look_x',                   nameCode: 'settings.pad.lookX',               type: 'padAxis', default: '+2', action: 'lookX', direction: 'right'},
            {key: 'pad.look_y',                   nameCode: 'settings.pad.lookY',               type: 'padAxis', default: '+5', action: 'lookY', direction: 'up'},
            {key: 'pad.run',                      nameCode: 'settings.action.run',              type: 'padButton', default: 10, action: 'run'},
            {key: 'pad.jump',                     nameCode: 'settings.action.jump',             type: 'padButton', default: 1,  action: 'jump'},
            {key: 'pad.crouch',                   nameCode: 'settings.action.crouch',           type: 'padButton', default: 0,  action: 'crouch'},
            {key: 'pad.action',                   nameCode: 'settings.action.action',           type: 'padButton', default: 3,  action: 'action'},
            {key: 'pad.pause',                    nameCode: 'settings.action.menu',             type: 'padButton', default: 9,  action: 'pause'},
            {key: 'virtual_pad.y_inverse',        nameCode: 'settings.virtualPad.yInverse',     type: 'bool', default: false},
            {key: 'virtual_pad.move_dead_zone',   nameCode: 'settings.virtualPad.moveDeadZone', type: 'list', default: '15', values: ShowcaseSettings.DEAD_ZONE_VALUES},
            {key: 'virtual_pad.aim_dead_zone',    nameCode: 'settings.virtualPad.aimDeadZone',  type: 'list', default: '15', values: ShowcaseSettings.DEAD_ZONE_VALUES},
            {key: 'mouse.y_inverse',              nameCode: 'settings.mouse.yInverse',          type: 'bool', default: false},
            // The defaults mirror Inputs.KEYBOARD_DEFAULT_MAPPING; Escape stays the fixed key back to the menu.
            {key: 'keyboard.forward',             nameCode: 'settings.keyboard.forward',        type: 'char', default: 'KeyW',      action: 'forward'},
            {key: 'keyboard.backward',            nameCode: 'settings.keyboard.backward',       type: 'char', default: 'KeyS',      action: 'backward'},
            {key: 'keyboard.strafe_left',         nameCode: 'settings.keyboard.strafeLeft',     type: 'char', default: 'KeyA',      action: 'strafeLeft'},
            {key: 'keyboard.strafe_right',        nameCode: 'settings.keyboard.strafeRight',    type: 'char', default: 'KeyD',      action: 'strafeRight'},
            {key: 'keyboard.run',                 nameCode: 'settings.action.run',              type: 'char', default: 'ShiftLeft', action: 'run'},
            {key: 'keyboard.jump',                nameCode: 'settings.action.jump',             type: 'char', default: 'Space',     action: 'jump'},
            {key: 'keyboard.crouch',              nameCode: 'settings.action.crouch',           type: 'char', default: 'KeyC',      action: 'crouch'},
            {key: 'keyboard.action',              nameCode: 'settings.action.action',           type: 'char', default: 'KeyE',      action: 'action'},
            {key: 'keyboard.look_down',           nameCode: 'settings.keyboard.lookDown',       type: 'char', default: 'KeyK',      action: 'lookDown'},
            {key: 'keyboard.look_up',             nameCode: 'settings.keyboard.lookUp',         type: 'char', default: 'KeyI',      action: 'lookUp'},
            {key: 'keyboard.look_right',          nameCode: 'settings.keyboard.lookRight',      type: 'char', default: 'KeyL',      action: 'lookRight'},
            {key: 'keyboard.look_left',           nameCode: 'settings.keyboard.lookLeft',       type: 'char', default: 'KeyJ',      action: 'lookLeft'}
        ];
    }

    constructor() {
        super(ShowcaseSettings.DEFINITIONS, ShowcaseDatabaseSchema.SETTING, ShowcaseDatabaseSchema.SETTING_BY_KEY);
    }

    applyToTranslator(translator) {
        translator.setLanguage(this.get(ShowcaseSettings.LANGUAGE_KEY));

        return this;
    }

    applyToInputs(inputs) {
        const device = this.get(ShowcaseSettings.DEVICE_KEY);

        inputs.setPreferredMode((device !== ShowcaseSettings.DEVICE_AUTO) ? device : null);
        inputs.setLookInvertY('gamepad', (this.get('pad.y_inverse') === true));
        inputs.setLookInvertY('virtualGamepad', (this.get('virtual_pad.y_inverse') === true));
        inputs.setLookInvertY('keyboardMouse', (this.get('mouse.y_inverse') === true));
        inputs.setKeyMapping(this.getKeyboardMapping());
        inputs.setGamepadButtonMapping(this.getPadButtonMapping());
        inputs.setGamepadAxisMapping(this.getPadAxisMapping());
        inputs.setVirtualPadDeadZone('move', this.getPercent('virtual_pad.move_dead_zone'));
        inputs.setVirtualPadDeadZone('aim', this.getPercent('virtual_pad.aim_dead_zone'));

        return this;
    }
}

ShowcaseSettings.LANGUAGE_KEY     = 'display.language';
ShowcaseSettings.DEVICE_KEY       = 'controls.device';
ShowcaseSettings.DEVICE_AUTO      = 'auto';
// Language autonyms are not translated.
ShowcaseSettings.LANGUAGE_VALUES  = Object.freeze([{code: 'en', label: 'English'}, {code: 'fr', label: 'Français'}, {code: 'it', label: 'Italiano'}, {code: 'es', label: 'Español'}]);
// Same choices as doom_js's touch sticks.
ShowcaseSettings.DEAD_ZONE_VALUES = AppSettings.percentValues([0, 2.5, 5, 7.5, 10, 15]);

const showcaseSettings = new ShowcaseSettings();
