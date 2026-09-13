/**
 * =========================================================
 * service-worker.js — MODE HORS LIGNE
 * DÉPÔT & AVICULTURE MARONE
 * =========================================================
 *
 * Stratégie : "Cache First, puis réseau"
 * - Au premier lancement, tous les fichiers de l'app sont
 *   mis en cache.
 * - Ensuite, l'app se charge depuis le cache, même sans
 *   connexion internet.
 * - Si un fichier n'est pas en cache, on tente le réseau
 *   en secours.
 *
 * IMPORTANT :
 * Change CACHE_VERSION à chaque mise à jour de l'app
 * (ajout de fichier, modif de code) pour forcer le
 * rechargement du cache chez les utilisateurs.
 * =========================================================
 */

const CACHE_VERSION = 'depot-marone-v5';

const FICHIERS_A_METTRE_EN_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',

    './assets/sql-wasm.js',
    './assets/sql-wasm.wasm',

    './js/app.js',
    './js/clients.js',
    './js/db.js',
    './js/depenses-ui.js',
    './js/depenses.js',
    './js/depot.js',
    './js/elevage-ui.js',
    './js/elevage.js',
    './js/poussins-ui.js',
    './js/poussins.js',
    './js/vaccination-ui-v2.js',
    './js/vaccination.js',
    './js/ventes-ui.js',
    './js/ventes.js',

    './assets/icons/icon-72.png',
    './assets/icons/icon-96.png',
    './assets/icons/icon-128.png',
    './assets/icons/icon-144.png',
    './assets/icons/icon-152.png',
    './assets/icons/icon-180.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-384.png',
    './assets/icons/icon-512.png',
    './assets/icons/icon-maskable-192.png',
    './assets/icons/icon-maskable-512.png'
];


/* =========================================================
   INSTALLATION — mise en cache initiale
   ========================================================= */

self.addEventListener('install', (evenement) => {

    self.skipWaiting();

    evenement.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {

            return cache.addAll(FICHIERS_A_METTRE_EN_CACHE);
        })
    );
});


/* =========================================================
   ACTIVATION — nettoyage des anciens caches
   ========================================================= */

self.addEventListener('activate', (evenement) => {

    evenement.waitUntil(
        caches.keys().then((nomsDeCache) => {

            return Promise.all(
                nomsDeCache
                    .filter((nom) => nom !== CACHE_VERSION)
                    .map((nom) => caches.delete(nom))
            );
        }).then(() => self.clients.claim())
    );
});


/* =========================================================
   INTERCEPTION DES REQUÊTES — Cache First
   ========================================================= */

self.addEventListener('fetch', (evenement) => {

    // On ne gère que les requêtes GET (pas les appels externes/API)
    if (evenement.request.method !== 'GET') {
        return;
    }

    evenement.respondWith(
        caches.match(evenement.request).then((reponseEnCache) => {

            if (reponseEnCache) {
                return reponseEnCache;
            }

            return fetch(evenement.request).then((reponseReseau) => {

                // Mise en cache dynamique des nouveaux fichiers rencontrés
                return caches.open(CACHE_VERSION).then((cache) => {

                    cache.put(evenement.request, reponseReseau.clone());
                    return reponseReseau;
                });

            }).catch(() => {

                // Hors ligne et pas en cache : on retombe sur la page principale
                if (evenement.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
