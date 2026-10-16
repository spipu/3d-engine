/**
 * Every user-facing text of the Spipu3D showcase, served by AppTranslator.
 *
 * The brand (Spipu3D) is not translated.
 */
class ShowcaseTranslations {
    static get CATALOG() {
        return {
            // --- Main menu ---
            'menu.main': {
                fr: 'Menu principal',
                en: 'Main menu',
                it: 'Menu principale',
                es: 'Menú principal'
            },
            'menu.examples': {
                fr: 'Exemples',
                en: 'Examples',
                it: 'Esempi',
                es: 'Ejemplos'
            },
            'menu.options': {
                fr: 'Options',
                en: 'Options',
                it: 'Opzioni',
                es: 'Opciones'
            },
            'menu.about': {
                fr: 'À propos',
                en: 'About',
                it: 'Informazioni',
                es: 'Acerca de'
            },
            'menu.storageUnavailable': {
                fr: 'Stockage navigateur indisponible — les paramétrages ne seront pas enregistrés.',
                en: 'Browser storage unavailable — the settings will not be saved.',
                it: 'Archiviazione del browser non disponibile — le impostazioni non verranno salvate.',
                es: 'Almacenamiento del navegador no disponible — los ajustes no se guardarán.'
            },
            // --- Options ---
            'options.controls': {
                fr: 'Contrôles',
                en: 'Controls',
                it: 'Comandi',
                es: 'Controles'
            },
            'options.reset': {
                fr: 'Réinitialiser tous les paramétrages',
                en: 'Reset every setting',
                it: 'Reimposta tutte le impostazioni',
                es: 'Restablecer todos los ajustes'
            },
            'options.resetConfirm': {
                fr: 'Supprimer tous les paramétrages enregistrés ?',
                en: 'Delete every saved setting?',
                it: 'Eliminare tutte le impostazioni salvate?',
                es: '¿Eliminar todos los ajustes guardados?'
            },
            'settings.display.language': {
                fr: 'Langue',
                en: 'Language',
                it: 'Lingua',
                es: 'Idioma'
            },
            'settings.controls.device': {
                fr: 'Appareil',
                en: 'Device',
                it: 'Dispositivo',
                es: 'Dispositivo'
            },
            'device.auto': {
                fr: 'Automatique : {device}',
                en: 'Automatic: {device}',
                it: 'Automatico: {device}',
                es: 'Automático: {device}'
            },
            'device.keyboardMouse': {
                fr: 'Clavier et souris',
                en: 'Keyboard and mouse',
                it: 'Tastiera e mouse',
                es: 'Teclado y ratón'
            },
            'device.gamepad': {
                fr: 'Manette ({name})',
                en: 'Gamepad ({name})',
                it: 'Controller ({name})',
                es: 'Mando ({name})'
            },
            'device.virtualPad': {
                fr: 'Commandes tactiles',
                en: 'Touch controls',
                it: 'Comandi touch',
                es: 'Controles táctiles'
            },
            'settings.pad.yInverse': {
                fr: 'Inverser l\'axe vertical',
                en: 'Invert the vertical axis',
                it: 'Inverti l\'asse verticale',
                es: 'Invertir el eje vertical'
            },
            'settings.pad.moveX': {
                fr: 'Déplacement — axe horizontal',
                en: 'Movement — horizontal axis',
                it: 'Movimento — asse orizzontale',
                es: 'Movimiento — eje horizontal'
            },
            'settings.pad.moveY': {
                fr: 'Déplacement — axe vertical',
                en: 'Movement — vertical axis',
                it: 'Movimento — asse verticale',
                es: 'Movimiento — eje vertical'
            },
            'settings.pad.lookX': {
                fr: 'Regard — axe horizontal',
                en: 'Look — horizontal axis',
                it: 'Visuale — asse orizzontale',
                es: 'Mirada — eje horizontal'
            },
            'settings.pad.lookY': {
                fr: 'Regard — axe vertical',
                en: 'Look — vertical axis',
                it: 'Visuale — asse verticale',
                es: 'Mirada — eje vertical'
            },
            'settings.action.run': {
                fr: 'Courir',
                en: 'Run',
                it: 'Corri',
                es: 'Correr'
            },
            'settings.action.jump': {
                fr: 'Sauter',
                en: 'Jump',
                it: 'Salta',
                es: 'Saltar'
            },
            'settings.action.crouch': {
                fr: 'S\'accroupir',
                en: 'Crouch',
                it: 'Accovacciati',
                es: 'Agacharse'
            },
            'settings.action.action': {
                fr: 'Action / utiliser',
                en: 'Action / use',
                it: 'Azione / usa',
                es: 'Acción / usar'
            },
            'settings.action.menu': {
                fr: 'Retour au menu',
                en: 'Back to the menu',
                it: 'Torna al menu',
                es: 'Volver al menú'
            },
            'settings.virtualPad.yInverse': {
                fr: 'Inverser l\'axe vertical',
                en: 'Invert the vertical axis',
                it: 'Inverti l\'asse verticale',
                es: 'Invertir el eje vertical'
            },
            'settings.virtualPad.moveDeadZone': {
                fr: 'Stick de déplacement — zone morte',
                en: 'Move stick — dead zone',
                it: 'Stick di movimento — zona morta',
                es: 'Stick de movimiento — zona muerta'
            },
            'settings.virtualPad.aimDeadZone': {
                fr: 'Stick de regard — zone morte',
                en: 'Look stick — dead zone',
                it: 'Stick della visuale — zona morta',
                es: 'Stick de mirada — zona muerta'
            },
            'settings.mouse.yInverse': {
                fr: 'Inverser l\'axe vertical de la souris',
                en: 'Invert the mouse vertical axis',
                it: 'Inverti l\'asse verticale del mouse',
                es: 'Invertir el eje vertical del ratón'
            },
            'settings.keyboard.forward': {
                fr: 'Avancer',
                en: 'Move forward',
                it: 'Avanza',
                es: 'Avanzar'
            },
            'settings.keyboard.backward': {
                fr: 'Reculer',
                en: 'Move backward',
                it: 'Retrocedi',
                es: 'Retroceder'
            },
            'settings.keyboard.strafeLeft': {
                fr: 'Pas à gauche',
                en: 'Strafe left',
                it: 'Passo a sinistra',
                es: 'Paso a la izquierda'
            },
            'settings.keyboard.strafeRight': {
                fr: 'Pas à droite',
                en: 'Strafe right',
                it: 'Passo a destra',
                es: 'Paso a la derecha'
            },
            'settings.keyboard.lookDown': {
                fr: 'Regarder en bas',
                en: 'Look down',
                it: 'Guarda in basso',
                es: 'Mirar abajo'
            },
            'settings.keyboard.lookUp': {
                fr: 'Regarder en haut',
                en: 'Look up',
                it: 'Guarda in alto',
                es: 'Mirar arriba'
            },
            'settings.keyboard.lookRight': {
                fr: 'Regarder à droite',
                en: 'Look right',
                it: 'Guarda a destra',
                es: 'Mirar a la derecha'
            },
            'settings.keyboard.lookLeft': {
                fr: 'Regarder à gauche',
                en: 'Look left',
                it: 'Guarda a sinistra',
                es: 'Mirar a la izquierda'
            },
            // --- About ---
            'about.what': {
                fr: 'Spipu3D est un moteur 3D et un socle de PWA en JavaScript pur, sans framework ni compilation : rendu WebGL ou logiciel, physique FPS, animation par squelette, réseau pair à pair. Ces exemples les mettent en œuvre.',
                en: 'Spipu3D is a 3D engine and a PWA core in pure JavaScript, with no framework and no build step: WebGL or software rendering, FPS physics, skeletal animation, peer-to-peer network. These examples put them to work.',
                it: 'Spipu3D è un motore 3D e una base PWA in JavaScript puro, senza framework né compilazione: rendering WebGL o software, fisica FPS, animazione scheletrica, rete peer-to-peer. Questi esempi li mettono in pratica.',
                es: 'Spipu3D es un motor 3D y una base PWA en JavaScript puro, sin framework ni compilación: renderizado WebGL o por software, física FPS, animación por esqueleto, red entre pares. Estos ejemplos los ponen en práctica.'
            },
            'about.author': {
                fr: 'Développé par Spipu (Laurent Minguet).',
                en: 'Developed by Spipu (Laurent Minguet).',
                it: 'Sviluppato da Spipu (Laurent Minguet).',
                es: 'Desarrollado por Spipu (Laurent Minguet).'
            },
            'about.source': {
                fr: 'Code source du projet :',
                en: 'Project source code:',
                it: 'Codice sorgente del progetto:',
                es: 'Código fuente del proyecto:'
            },
            'about.licence': {
                fr: 'Licence MIT — à l\'exception du synthétiseur musical libADLMIDI, embarqué sous licence LGPL v3, et de la bibliothèque QR zxing-wasm, sous licences MIT, Apache-2.0 et BSD-3.',
                en: 'MIT licence — except the libADLMIDI music synthesizer, embedded under the LGPL v3 licence, and the zxing-wasm QR library, under the MIT, Apache-2.0 and BSD-3 licences.',
                it: 'Licenza MIT — a eccezione del sintetizzatore musicale libADLMIDI, incorporato con licenza LGPL v3, e della libreria QR zxing-wasm, con licenze MIT, Apache-2.0 e BSD-3.',
                es: 'Licencia MIT — salvo el sintetizador musical libADLMIDI, integrado bajo licencia LGPL v3, y la biblioteca QR zxing-wasm, bajo licencias MIT, Apache-2.0 y BSD-3.'
            },
            'about.motionCapture': {
                fr: 'Capture de mouvement de l\'exemple Animation : CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), financée par la NSF (EIA-0196217).',
                en: 'Motion capture of the Animation example: CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), funded by the NSF (EIA-0196217).',
                it: 'Motion capture dell\'esempio Animazione: CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), finanziata dalla NSF (EIA-0196217).',
                es: 'Captura de movimiento del ejemplo Animación: CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), financiada por la NSF (EIA-0196217).'
            },
            'about.copyright': {
                fr: '© 2024-{year} Spipu.',
                en: '© 2024-{year} Spipu.',
                it: '© 2024-{year} Spipu.',
                es: '© 2024-{year} Spipu.'
            },
            // --- Examples: name, then what it shows ---
            'example.still': {
                fr: 'Rendu fixe',
                en: 'Still render',
                it: 'Rendering fisso',
                es: 'Render fijo'
            },
            'example.still.infos': {
                fr: 'La Lotus F1, sans interaction',
                en: 'The Lotus F1, no interaction',
                it: 'La Lotus F1, senza interazione',
                es: 'El Lotus F1, sin interacción'
            },
            'example.objects': {
                fr: 'Objets',
                en: 'Objects',
                it: 'Oggetti',
                es: 'Objetos'
            },
            'example.objects.infos': {
                fr: 'Visionneuse : objet et moteur de rendu au choix',
                en: 'Viewer: pick the object and the renderer',
                it: 'Visualizzatore: oggetto e motore di rendering a scelta',
                es: 'Visor: objeto y motor de render a elegir'
            },
            'example.lights': {
                fr: 'Lumières',
                en: 'Lights',
                it: 'Luci',
                es: 'Luces'
            },
            'example.lights.infos': {
                fr: 'Trois sources colorées, déplacées au clavier',
                en: 'Three coloured sources, moved with the keyboard',
                it: 'Tre sorgenti colorate, spostate con la tastiera',
                es: 'Tres fuentes de color, movidas con el teclado'
            },
            'example.van': {
                fr: 'Fourgon',
                en: 'Van',
                it: 'Furgone',
                es: 'Furgoneta'
            },
            'example.van.infos': {
                fr: 'Conduire le fourgon au clavier',
                en: 'Drive the van with the keyboard',
                it: 'Guidare il furgone con la tastiera',
                es: 'Conducir la furgoneta con el teclado'
            },
            'example.world': {
                fr: 'Labyrinthe',
                en: 'Labyrinth',
                it: 'Labirinto',
                es: 'Laberinto'
            },
            'example.world.infos': {
                fr: 'Déplacement à la première personne, physique FPS',
                en: 'First-person moves, FPS physics',
                it: 'Movimento in prima persona, fisica FPS',
                es: 'Movimiento en primera persona, física FPS'
            },
            'example.animate': {
                fr: 'Animation',
                en: 'Animation',
                it: 'Animazione',
                es: 'Animación'
            },
            'example.animate.infos': {
                fr: 'Personnage glTF à squelette, marche en capture de mouvement',
                en: 'Skeletal glTF character, motion-captured walk',
                it: 'Personaggio glTF con scheletro, camminata in motion capture',
                es: 'Personaje glTF con esqueleto, paso de captura de movimiento'
            },
            'example.networkBench': {
                fr: 'Banc réseau',
                en: 'Network bench',
                it: 'Banco di rete',
                es: 'Banco de red'
            },
            'example.networkBench.infos': {
                fr: 'Appairage par QR code, lien WebRTC, ping et rafales',
                en: 'QR code pairing, WebRTC link, ping and bursts',
                it: 'Abbinamento tramite QR code, collegamento WebRTC, ping e raffiche',
                es: 'Emparejamiento por código QR, enlace WebRTC, ping y ráfagas'
            },
            'example.networkGame': {
                fr: 'Jeu en réseau',
                en: 'Network game',
                it: 'Gioco in rete',
                es: 'Juego en red'
            },
            'example.networkGame.infos': {
                fr: 'Le principal conduit le fourgon, chaque appareil appairé le suit en direct',
                en: 'The main drives the van, every paired device watches it live',
                it: 'Il principale guida il furgone, ogni dispositivo abbinato lo segue in diretta',
                es: 'El principal conduce la furgoneta, cada dispositivo emparejado la sigue en directo'
            },
            // --- Objects viewer ---
            'objects.renderer': {
                fr: 'Moteur de rendu',
                en: 'Renderer',
                it: 'Motore di rendering',
                es: 'Motor de render'
            },
            'object.cube': {
                fr: 'Cube',
                en: 'Cube',
                it: 'Cubo',
                es: 'Cubo'
            },
            'object.sphere': {
                fr: 'Sphère',
                en: 'Sphere',
                it: 'Sfera',
                es: 'Esfera'
            },
            'object.torus': {
                fr: 'Tore',
                en: 'Torus',
                it: 'Toro',
                es: 'Toro'
            },
            'object.lotus': {
                fr: 'Lotus F1',
                en: 'Lotus F1',
                it: 'Lotus F1',
                es: 'Lotus F1'
            },
            'object.car': {
                fr: 'Voiture',
                en: 'Car',
                it: 'Auto',
                es: 'Coche'
            },
            'object.tank': {
                fr: 'Char',
                en: 'Tank',
                it: 'Carro armato',
                es: 'Tanque'
            },
            'object.helico_civil': {
                fr: 'Hélicoptère civil',
                en: 'Civil helicopter',
                it: 'Elicottero civile',
                es: 'Helicóptero civil'
            },
            'object.helico_military': {
                fr: 'Hélicoptère militaire',
                en: 'Military helicopter',
                it: 'Elicottero militare',
                es: 'Helicóptero militar'
            },
            'object.plane': {
                fr: 'Avion',
                en: 'Plane',
                it: 'Aereo',
                es: 'Avión'
            },
            'object.ship': {
                fr: 'Bateau',
                en: 'Ship',
                it: 'Nave',
                es: 'Barco'
            },
            'object.dyno': {
                fr: 'Dinosaure',
                en: 'Dinosaur',
                it: 'Dinosauro',
                es: 'Dinosaurio'
            },
            'object.head': {
                fr: 'Tête',
                en: 'Head',
                it: 'Testa',
                es: 'Cabeza'
            },
            'object.teddy': {
                fr: 'Nounours',
                en: 'Teddy bear',
                it: 'Orsacchiotto',
                es: 'Osito de peluche'
            }
        };
    }
}

ShowcaseTranslations.DEFAULT_LANGUAGE = 'en';
