/**
 * The spipu3d database, version by version.
 *
 * Records:
 *  - setting: {id, key, value}
 */
class ShowcaseDatabaseSchema {
    /**
     * @returns {AppDatabaseSchema}
     */
    static build() {
        return new AppDatabaseSchema(ShowcaseDatabaseSchema.NAME)
            .addVersion(1, (upgrade) => {
                upgrade.createStore(ShowcaseDatabaseSchema.SETTING, {indexes: [{name: ShowcaseDatabaseSchema.SETTING_BY_KEY, keyPath: 'key', unique: true}]});
            });
    }
}

ShowcaseDatabaseSchema.NAME           = 'spipu3d';
ShowcaseDatabaseSchema.SETTING        = 'setting';
ShowcaseDatabaseSchema.SETTING_BY_KEY = 'key';
