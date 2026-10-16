function loadApp() {
    new AppViewportStabilizer().install();

    appTranslator.addCatalog(AppMenuTranslations.CATALOG)
        .addCatalog(ShowcaseTranslations.CATALOG)
        .setFallbackLanguage(ShowcaseTranslations.FALLBACK)
        .setLanguage(ShowcaseTranslations.browserLanguage());

    new ShowcaseNavigator().start();
}

appBootstrap.setReadyCallback(loadApp);
