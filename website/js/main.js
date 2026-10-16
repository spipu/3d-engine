function loadApp() {
    new AppViewportStabilizer().install();

    appTranslator.addCatalog(AppMenuTranslations.CATALOG)
        .addCatalog(ShowcaseTranslations.CATALOG)
        .setFallbackLanguage(ShowcaseTranslations.DEFAULT_LANGUAGE)
        .setLanguage(ShowcaseTranslations.DEFAULT_LANGUAGE);

    new ShowcaseNavigator().start();
}

appBootstrap.setReadyCallback(loadApp);
