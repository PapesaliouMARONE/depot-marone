/**
 * =========================================================
 * db.js — BASE DE DONNÉES LOCALE
 * DÉPÔT & AVICULTURE MARONE
 * =========================================================
 *
 * Technologie :
 * - SQLite via sql.js
 * - Persistance locale via IndexedDB
 *
 * Ce fichier constitue la structure centrale de
 * l'application.
 *
 * Modules :
 * - Dépôt
 * - Produits
 * - Catégories
 * - Unités de vente
 * - Approvisionnements
 * - Clients
 * - Ventes
 * - Paiements
 * - Élevage
 * - Bandes
 * - Alimentation
 * - Mortalité
 * - Vaccinations
 * - Sorties / Dépenses / Observations d'élevage
 *
 * IMPORTANT :
 * Les modifications de structure sont pensées pour
 * conserver les données déjà présentes.
 * =========================================================
 */


const DB_STORE_NAME = 'depot-aviculture-db';
const DB_KEY = 'sqlite-file';

const DB_VERSION = 2;

let SQL = null;
let db = null;


/* =========================================================
   SCHÉMA PRINCIPAL
   ========================================================= */

const SCHEMA_SQL = `

PRAGMA foreign_keys = ON;


/* =========================================================
   CATÉGORIES
   ========================================================= */

CREATE TABLE IF NOT EXISTS categories (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    nom TEXT NOT NULL,

    actif INTEGER NOT NULL DEFAULT 1,

    created_at TEXT DEFAULT (datetime('now')),

    updated_at TEXT DEFAULT (datetime('now'))

);


/* =========================================================
   PRODUITS
   ========================================================= */

CREATE TABLE IF NOT EXISTS produits (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    categorie_id INTEGER NOT NULL,

    nom TEXT NOT NULL,

    unite_stock TEXT NOT NULL,

    cout_moyen_actuel REAL NOT NULL DEFAULT 0,

    quantite_en_stock REAL NOT NULL DEFAULT 0,

    seuil_alerte REAL NOT NULL DEFAULT 0,

    actif INTEGER NOT NULL DEFAULT 1,

    created_at TEXT DEFAULT (datetime('now')),

    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (categorie_id)
        REFERENCES categories(id)

);


/* =========================================================
   UNITÉS DE VENTE
   ========================================================= */

CREATE TABLE IF NOT EXISTS unites_vente (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    produit_id INTEGER NOT NULL,

    nom_unite TEXT NOT NULL,

    quantite_en_unite_stock REAL NOT NULL,

    prix_vente REAL NOT NULL,

    actif INTEGER NOT NULL DEFAULT 1,

    created_at TEXT DEFAULT (datetime('now')),

    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (produit_id)
        REFERENCES produits(id)

);


/* =========================================================
   APPROVISIONNEMENTS
   ========================================================= */

CREATE TABLE IF NOT EXISTS approvisionnements (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    produit_id INTEGER NOT NULL,

    date_appro TEXT NOT NULL,

    fournisseur TEXT,

    quantite_sacs REAL,

    quantite_ajoutee_stock REAL NOT NULL,

    prix_achat_total REAL NOT NULL,

    cout_unitaire REAL NOT NULL,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (produit_id)
        REFERENCES produits(id)

);


/* =========================================================
   CLIENTS
   ========================================================= */

CREATE TABLE IF NOT EXISTS clients (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    nom TEXT NOT NULL,

    telephone TEXT,

    solde_du REAL NOT NULL DEFAULT 0,

    actif INTEGER NOT NULL DEFAULT 1,

    created_at TEXT DEFAULT (datetime('now')),

    updated_at TEXT DEFAULT (datetime('now'))

);


/* =========================================================
   VENTES
   ========================================================= */

CREATE TABLE IF NOT EXISTS ventes (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    client_id INTEGER,

    date_vente TEXT NOT NULL,

    mode_paiement TEXT NOT NULL,

    montant_total REAL NOT NULL DEFAULT 0,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (client_id)
        REFERENCES clients(id)

);


/* =========================================================
   LIGNES DE VENTE
   ========================================================= */

CREATE TABLE IF NOT EXISTS lignes_vente (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    vente_id INTEGER NOT NULL,

    produit_id INTEGER NOT NULL,

    unite_vente_id INTEGER NOT NULL,

    quantite_vendue REAL NOT NULL,

    quantite_stock_decrementee REAL NOT NULL,

    prix_unitaire_applique REAL NOT NULL,

    montant_ligne REAL NOT NULL,

    cout_unitaire_au_moment_vente REAL NOT NULL,

    FOREIGN KEY (vente_id)
        REFERENCES ventes(id),

    FOREIGN KEY (produit_id)
        REFERENCES produits(id),

    FOREIGN KEY (unite_vente_id)
        REFERENCES unites_vente(id)

);


/* =========================================================
   PAIEMENTS CLIENTS
   ========================================================= */

CREATE TABLE IF NOT EXISTS paiements_clients (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    client_id INTEGER NOT NULL,

    montant REAL NOT NULL,

    date_paiement TEXT NOT NULL,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (client_id)
        REFERENCES clients(id)

);


/* =========================================================
   ÉLEVAGE — BANDES
   =========================================================
 *
 * Une bande représente un groupe de volailles.
 *
 * Exemple :
 *
 * Bande 1
 * → départ : 01/09/2026
 * → 500 poussins
 *
 * Bande 2
 * → départ : 15/09/2026
 * → 300 poussins
 *
 * Les bandes sont totalement indépendantes.
 *
 * NOTE : les colonnes "code", "type_volaille",
 * "emplacement", "poids_initial_moyen" et
 * "poids_final_moyen" utilisées par le module Elevage
 * sont ajoutées via migration (voir executerMigrations)
 * plutôt que modifiées ici, pour ne pas casser les
 * bases déjà existantes.
 * ========================================================= */

CREATE TABLE IF NOT EXISTS bandes (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    nom TEXT NOT NULL,

    date_depart TEXT NOT NULL,

    date_fin TEXT,

    effectif_initial REAL NOT NULL,

    effectif_actuel REAL NOT NULL,

    type_elevage TEXT,

    souche TEXT,

    fournisseur TEXT,

    cout_poussins REAL NOT NULL DEFAULT 0,

    statut TEXT NOT NULL DEFAULT 'en_cours',

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    updated_at TEXT DEFAULT (datetime('now'))

);


/* =========================================================
   CONSOMMATION / ALIMENTATION DES BANDES
   =========================================================
 *
 * On conserve :
 *
 * - quantité en kg
 * - nombre de sacs
 * - poids d'un sac
 * - prix d'achat
 *
 * Cela permet de travailler facilement avec :
 *
 * 1 sac = 50 kg
 *
 * ou une autre valeur si nécessaire.
 *
 * NOTE : la colonne "produit_id" (lien vers le stock du
 * dépôt) et "prix_par_sac" sont ajoutées via migration.
 * ========================================================= */

CREATE TABLE IF NOT EXISTS consommations_elevage (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    bande_id INTEGER NOT NULL,

    date_consommation TEXT NOT NULL,

    type_aliment TEXT,

    quantite_kg REAL NOT NULL DEFAULT 0,

    nombre_sacs REAL NOT NULL DEFAULT 0,

    poids_sac_kg REAL NOT NULL DEFAULT 50,

    prix_total REAL NOT NULL DEFAULT 0,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (bande_id)
        REFERENCES bandes(id)

);


/* =========================================================
   MORTALITÉ
   ========================================================= */

CREATE TABLE IF NOT EXISTS mortalites (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    bande_id INTEGER NOT NULL,

    date_mortalite TEXT NOT NULL,

    nombre_morts REAL NOT NULL,

    cause TEXT,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (bande_id)
        REFERENCES bandes(id)

);


/* =========================================================
   VACCINATIONS
   =========================================================
 *
 * Chaque vaccination appartient à une bande.
 *
 * Cela permet :
 *
 * Bande 1
 * → vaccin A
 * → date prévue 05/09
 * → rappel 12/09
 *
 * Bande 2
 * → vaccin A
 * → date prévue 20/09
 * → rappel 27/09
 *
 * Les dates ne sont donc jamais mélangées.
 * ========================================================= */

CREATE TABLE IF NOT EXISTS vaccinations (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    bande_id INTEGER NOT NULL,

    nom_vaccin TEXT NOT NULL,

    date_prevue TEXT NOT NULL,

    date_effective TEXT,

    date_rappel TEXT,

    statut TEXT NOT NULL DEFAULT 'a_faire',

    resultat TEXT,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (bande_id)
        REFERENCES bandes(id)

);


/* =========================================================
   RÉSULTATS / BILAN DES BANDES
   =========================================================
 *
 * Cette table permet d'enregistrer le bilan final
 * d'une bande.
 *
 * Les calculs détaillés pourront également être
 * recalculés à partir des autres tables.
 * ========================================================= */

CREATE TABLE IF NOT EXISTS resultats_band (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    bande_id INTEGER NOT NULL UNIQUE,

    date_resultat TEXT NOT NULL,

    effectif_final REAL NOT NULL DEFAULT 0,

    nombre_morts REAL NOT NULL DEFAULT 0,

    taux_mortalite REAL NOT NULL DEFAULT 0,

    consommation_totale_kg REAL NOT NULL DEFAULT 0,

    consommation_totale_sacs REAL NOT NULL DEFAULT 0,

    poids_total_vendu_kg REAL NOT NULL DEFAULT 0,

    chiffre_affaires REAL NOT NULL DEFAULT 0,

    cout_total REAL NOT NULL DEFAULT 0,

    marge REAL NOT NULL DEFAULT 0,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (bande_id)
        REFERENCES bandes(id)

);


/* =========================================================
   SORTIES D'ÉLEVAGE (ventes / réformes de volailles)
   =========================================================
 *
 * Une sortie retire des sujets de l'effectif d'une bande
 * (vente, réforme, don...). Le motif par défaut est
 * 'VENTE'.
 * ========================================================= */

CREATE TABLE IF NOT EXISTS sorties_elevage (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    bande_id INTEGER NOT NULL,

    date_sortie TEXT NOT NULL,

    quantite INTEGER NOT NULL,

    poids_total_kg REAL,

    prix_unitaire REAL NOT NULL DEFAULT 0,

    montant_total REAL NOT NULL DEFAULT 0,

    motif TEXT NOT NULL DEFAULT 'VENTE',

    client TEXT,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (bande_id)
        REFERENCES bandes(id)

);


/* =========================================================
   DÉPENSES D'ÉLEVAGE
   =========================================================
 *
 * Dépenses autres que l'aliment (vaccins, désinfection,
 * transport, main d'œuvre, etc.), rattachées à une bande.
 * ========================================================= */

CREATE TABLE IF NOT EXISTS depenses_elevage (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    bande_id INTEGER NOT NULL,

    date_depense TEXT NOT NULL,

    categorie TEXT NOT NULL,

    libelle TEXT,

    montant REAL NOT NULL DEFAULT 0,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (bande_id)
        REFERENCES bandes(id)

);


/* =========================================================
   OBSERVATIONS D'ÉLEVAGE
   =========================================================
 *
 * Notes libres datées sur une bande (santé, comportement,
 * incident...), indépendantes des mortalités/vaccinations.
 * ========================================================= */

CREATE TABLE IF NOT EXISTS observations_elevage (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    bande_id INTEGER NOT NULL,

    date_observation TEXT NOT NULL,

    type_observation TEXT,

    contenu TEXT NOT NULL,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (bande_id)
        REFERENCES bandes(id)

);


/* =========================================================
   POUSSINS — COMMANDE / LIVRAISON / VENTE
   =========================================================
 *
 * Troisième activité, TOTALEMENT INDÉPENDANTE du dépôt et
 * de l'élevage (aucune clé étrangère vers d'autres tables
 * que celles de ce même module).
 *
 * Processus en 3 étapes :
 *
 * 1. COMMANDE  : ce qui est commandé au fournisseur
 *                (quantité, prix, montant).
 * 2. LIVRAISON : ce qui est effectivement reçu, rattaché
 *                à une commande (peut différer en quantité
 *                ou en date).
 * 3. VENTE     : revente des poussins, comptant ou à
 *                crédit (avec suivi du paiement).
 *
 * Pas de stock ni de coût moyen pondéré : le coût d'achat
 * par poussin et la marge sont calculés globalement sur
 * une période, à partir des commandes et des ventes.
 * ========================================================= */

CREATE TABLE IF NOT EXISTS commandes_poussins (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    fournisseur TEXT NOT NULL,

    date_commande TEXT NOT NULL,

    quantite_commandee REAL NOT NULL,

    poussins_par_carton REAL NOT NULL DEFAULT 50,

    prix_achat_unitaire REAL NOT NULL,

    montant_total REAL NOT NULL,

    race TEXT,

    statut TEXT NOT NULL DEFAULT 'EN_ATTENTE',

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now'))

);


CREATE TABLE IF NOT EXISTS livraisons_poussins (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    commande_id INTEGER NOT NULL,

    date_livraison TEXT NOT NULL,

    quantite_recue REAL NOT NULL,

    fournisseur TEXT,

    etat_livraison TEXT NOT NULL DEFAULT 'CONFORME',

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (commande_id)
        REFERENCES commandes_poussins(id)

);


CREATE TABLE IF NOT EXISTS ventes_poussins (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    client TEXT,

    date_vente TEXT NOT NULL,

    quantite REAL NOT NULL,

    prix_unitaire REAL NOT NULL,

    montant_total REAL NOT NULL,

    mode_paiement TEXT NOT NULL DEFAULT 'comptant',

    montant_paye REAL NOT NULL DEFAULT 0,

    solde_du REAL NOT NULL DEFAULT 0,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now'))

);


/* =========================================================
   DÉPENSES DU DÉPÔT (loyer, personnel, autres frais)
   =========================================================
 *
 * Indépendant des dépenses d'élevage (depenses_elevage).
 * Permet un vrai résultat net du dépôt (CA - coût des
 * marchandises - loyer - personnel - autres frais).
 * ========================================================= */

CREATE TABLE IF NOT EXISTS depenses_depot (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    date_depense TEXT NOT NULL,

    categorie TEXT NOT NULL,

    libelle TEXT,

    montant REAL NOT NULL DEFAULT 0,

    observation TEXT,

    created_at TEXT DEFAULT (datetime('now'))

);


/* =========================================================
   INDEX — DÉPÔT
   ========================================================= */

CREATE INDEX IF NOT EXISTS idx_produits_categorie
ON produits(categorie_id);


CREATE INDEX IF NOT EXISTS idx_produits_actif
ON produits(actif);

CREATE INDEX IF NOT EXISTS idx_unites_vente_produit
ON unites_vente(produit_id);

CREATE INDEX IF NOT EXISTS idx_appro_produit
ON approvisionnements(produit_id);

CREATE INDEX IF NOT EXISTS idx_appro_date
ON approvisionnements(date_appro);

CREATE INDEX IF NOT EXISTS idx_ventes_client
ON ventes(client_id);

CREATE INDEX IF NOT EXISTS idx_ventes_date
ON ventes(date_vente);

CREATE INDEX IF NOT EXISTS idx_lignes_vente_vente
ON lignes_vente(vente_id);

CREATE INDEX IF NOT EXISTS idx_lignes_vente_produit
ON lignes_vente(produit_id);

CREATE INDEX IF NOT EXISTS idx_paiements_client
ON paiements_clients(client_id);


/* =========================================================
   INDEX — ÉLEVAGE
   ========================================================= */

CREATE INDEX IF NOT EXISTS idx_band_date_depart
ON bandes(date_depart);

CREATE INDEX IF NOT EXISTS idx_band_statut
ON bandes(statut);

CREATE INDEX IF NOT EXISTS idx_consommation_bande
ON consommations_elevage(bande_id);

CREATE INDEX IF NOT EXISTS idx_consommation_date
ON consommations_elevage(date_consommation);

CREATE INDEX IF NOT EXISTS idx_mortalite_bande
ON mortalites(bande_id);

CREATE INDEX IF NOT EXISTS idx_mortalite_date
ON mortalites(date_mortalite);

CREATE INDEX IF NOT EXISTS idx_vaccination_bande
ON vaccinations(bande_id);

CREATE INDEX IF NOT EXISTS idx_vaccination_date_prevue
ON vaccinations(date_prevue);

CREATE INDEX IF NOT EXISTS idx_vaccination_rappel
ON vaccinations(date_rappel);

CREATE INDEX IF NOT EXISTS idx_vaccination_statut
ON vaccinations(statut);

CREATE INDEX IF NOT EXISTS idx_resultat_bande
ON resultats_band(bande_id);

CREATE INDEX IF NOT EXISTS idx_sorties_bande
ON sorties_elevage(bande_id);

CREATE INDEX IF NOT EXISTS idx_sorties_date
ON sorties_elevage(date_sortie);

CREATE INDEX IF NOT EXISTS idx_depenses_bande
ON depenses_elevage(bande_id);

CREATE INDEX IF NOT EXISTS idx_depenses_date
ON depenses_elevage(date_depense);

CREATE INDEX IF NOT EXISTS idx_observations_bande
ON observations_elevage(bande_id);


/* =========================================================
   INDEX — POUSSINS / DÉPENSES DÉPÔT
   ========================================================= */

CREATE INDEX IF NOT EXISTS idx_commandes_poussins_date
ON commandes_poussins(date_commande);

CREATE INDEX IF NOT EXISTS idx_commandes_poussins_statut
ON commandes_poussins(statut);

CREATE INDEX IF NOT EXISTS idx_livraisons_poussins_commande
ON livraisons_poussins(commande_id);

CREATE INDEX IF NOT EXISTS idx_livraisons_poussins_date
ON livraisons_poussins(date_livraison);

CREATE INDEX IF NOT EXISTS idx_ventes_poussins_date
ON ventes_poussins(date_vente);

CREATE INDEX IF NOT EXISTS idx_depenses_depot_date
ON depenses_depot(date_depense);

`;


/* =========================================================
   INDEXEDDB
   ========================================================= */

function openIndexedDB() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                'depot-aviculture',
                DB_VERSION
            );


        request.onupgradeneeded =
            (event) => {

                const idb =
                    event.target.result;


                if (
                    !idb.objectStoreNames.contains(
                        DB_STORE_NAME
                    )
                ) {

                    idb.createObjectStore(
                        DB_STORE_NAME
                    );
                }
            };


        request.onsuccess =
            (event) => {

                resolve(
                    event.target.result
                );
            };


        request.onerror =
            (event) => {

                reject(
                    event.target.error
                );
            };
    });
}


/* =========================================================
   CHARGEMENT DE LA BASE
   ========================================================= */

async function chargerFichierSQLiteDepuisIndexedDB() {

    const idb =
        await openIndexedDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                idb.transaction(
                    DB_STORE_NAME,
                    'readonly'
                );


            const store =
                tx.objectStore(
                    DB_STORE_NAME
                );


            const request =
                store.get(DB_KEY);


            request.onsuccess =
                () => {

                    resolve(
                        request.result ||
                        null
                    );
                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );
                };
        }
    );
}


/* =========================================================
   SAUVEGARDE DE LA BASE
   ========================================================= */

async function sauvegarderBaseVersIndexedDB() {

    if (!db) {

        throw new Error(
            "La base de données n'est pas initialisée."
        );
    }


    const idb =
        await openIndexedDB();


    const donnees =
        db.export();


    return new Promise(
        (resolve, reject) => {

            const tx =
                idb.transaction(
                    DB_STORE_NAME,
                    'readwrite'
                );


            const store =
                tx.objectStore(
                    DB_STORE_NAME
                );


            const request =
                store.put(
                    donnees,
                    DB_KEY
                );


            request.onsuccess =
                () => {

                    resolve();
                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );
                };
        }
    );
}


/* =========================================================
   UTILITAIRE — VÉRIFIER UNE COLONNE
   ========================================================= */

function colonneExiste(
    table,
    colonne
) {

    const resultats =
        db.exec(
            `PRAGMA table_info(${table});`
        );


    if (
        !resultats.length
        ||
        !resultats[0].values
    ) {

        return false;
    }


    return resultats[0].values.some(
        ligne =>
            String(ligne[1]) === colonne
    );
}


/* =========================================================
   MIGRATION DES ANCIENNES BASES
   =========================================================
 *
 * Très important :
 *
 * CREATE TABLE IF NOT EXISTS ne modifie PAS une table
 * déjà existante.
 *
 * Cette fonction ajoute donc les colonnes manquantes
 * aux anciennes bases.
 * ========================================================= */

function executerMigrations() {

    const migrations = [

        {
            table: 'categories',
            colonne: 'actif',
            sql: `
                ALTER TABLE categories
                ADD COLUMN actif
                INTEGER NOT NULL DEFAULT 1
            `
        },

        {
            table: 'categories',
            colonne: 'updated_at',
            sql: `
                ALTER TABLE categories
                ADD COLUMN updated_at TEXT;

                UPDATE categories
                SET updated_at = datetime('now')
                WHERE updated_at IS NULL;
            `
        },

        {
            table: 'produits',
            colonne: 'updated_at',
            sql: `
                ALTER TABLE produits
                ADD COLUMN updated_at TEXT;

                UPDATE produits
                SET updated_at = datetime('now')
                WHERE updated_at IS NULL;
            `
        },

        {
            table: 'unites_vente',
            colonne: 'updated_at',
            sql: `
                ALTER TABLE unites_vente
                ADD COLUMN updated_at TEXT;

                UPDATE unites_vente
                SET updated_at = datetime('now')
                WHERE updated_at IS NULL;
            `
        },

        {
            table: 'approvisionnements',
            colonne: 'observation',
            sql: `
                ALTER TABLE approvisionnements
                ADD COLUMN observation TEXT
            `
        },

        {
            table: 'clients',
            colonne: 'actif',
            sql: `
                ALTER TABLE clients
                ADD COLUMN actif
                INTEGER NOT NULL DEFAULT 1
            `
        },

        {
            table: 'clients',
            colonne: 'updated_at',
            sql: `
                ALTER TABLE clients
                ADD COLUMN updated_at TEXT;

                UPDATE clients
                SET updated_at = datetime('now')
                WHERE updated_at IS NULL;
            `
        },

        {
            table: 'paiements_clients',
            colonne: 'observation',
            sql: `
                ALTER TABLE paiements_clients
                ADD COLUMN observation TEXT
            `
        },

        /*
         * =================================================
         * MIGRATIONS — GESTION DES POULAILLERS (ÉLEVAGE)
         * =================================================
         * Colonnes ajoutées pour le module Elevage
         * (elevage.js), en plus des colonnes déjà prévues
         * dans le CREATE TABLE d'origine.
         * ================================================= */

        {
            table: 'bandes',
            colonne: 'code',
            sql: `
                ALTER TABLE bandes
                ADD COLUMN code TEXT
            `
        },

        {
            table: 'bandes',
            colonne: 'type_volaille',
            sql: `
                ALTER TABLE bandes
                ADD COLUMN type_volaille TEXT
            `
        },

        {
            table: 'bandes',
            colonne: 'emplacement',
            sql: `
                ALTER TABLE bandes
                ADD COLUMN emplacement TEXT
            `
        },

        {
            table: 'bandes',
            colonne: 'poids_initial_moyen',
            sql: `
                ALTER TABLE bandes
                ADD COLUMN poids_initial_moyen REAL
            `
        },

        {
            table: 'bandes',
            colonne: 'poids_final_moyen',
            sql: `
                ALTER TABLE bandes
                ADD COLUMN poids_final_moyen REAL
            `
        },

        {
            table: 'consommations_elevage',
            colonne: 'produit_id',
            sql: `
                ALTER TABLE consommations_elevage
                ADD COLUMN produit_id INTEGER
                REFERENCES produits(id)
            `
        },

        {
            table: 'consommations_elevage',
            colonne: 'prix_par_sac',
            sql: `
                ALTER TABLE consommations_elevage
                ADD COLUMN prix_par_sac REAL
            `
        },

        /*
         * =================================================
         * MIGRATIONS — VACCINATIONS
         * =================================================
         * Colonnes ajoutées pour le module Vaccination
         * (vaccination.js), en plus des colonnes déjà
         * prévues dans le CREATE TABLE d'origine
         * (nom_vaccin, date_prevue, date_effective,
         * date_rappel, statut, resultat, observation).
         * ================================================= */

        {
            table: 'vaccinations',
            colonne: 'maladie',
            sql: `
                ALTER TABLE vaccinations
                ADD COLUMN maladie TEXT
            `
        },

        {
            table: 'vaccinations',
            colonne: 'dose',
            sql: `
                ALTER TABLE vaccinations
                ADD COLUMN dose REAL
            `
        },

        {
            table: 'vaccinations',
            colonne: 'unite_dose',
            sql: `
                ALTER TABLE vaccinations
                ADD COLUMN unite_dose TEXT
            `
        },

        {
            table: 'vaccinations',
            colonne: 'voie_administration',
            sql: `
                ALTER TABLE vaccinations
                ADD COLUMN voie_administration TEXT
            `
        },

        {
            table: 'vaccinations',
            colonne: 'fournisseur',
            sql: `
                ALTER TABLE vaccinations
                ADD COLUMN fournisseur TEXT
            `
        },

        {
            table: 'vaccinations',
            colonne: 'numero_lot',
            sql: `
                ALTER TABLE vaccinations
                ADD COLUMN numero_lot TEXT
            `
        },

        {
            table: 'vaccinations',
            colonne: 'cout',
            sql: `
                ALTER TABLE vaccinations
                ADD COLUMN cout REAL
            `
        },

        /*
         * =================================================
         * MIGRATIONS — POUSSINS
         * =================================================
         * Date de livraison prévue, utilisée pour les
         * alertes "à livrer sous X jours" sur le tableau
         * de bord (voir poussins-ui.js).
         * ================================================= */

        {
            table: 'commandes_poussins',
            colonne: 'date_livraison_prevue',
            sql: `
                ALTER TABLE commandes_poussins
                ADD COLUMN date_livraison_prevue TEXT
            `
        },

        /*
         * ventes_poussins peut avoir été créée par une
         * version antérieure du module (sans gestion du
         * crédit). On ajoute les colonnes manquantes et on
         * les remplit pour les lignes déjà existantes :
         * - mode_paiement : toutes les anciennes ventes
         *   sont considérées comme déjà payées comptant.
         * - montant_paye  : égal au montant total pour les
         *   anciennes lignes (rien n'était dû avant).
         * - solde_du      : 0 pour les anciennes lignes.
         */

        {
            table: 'ventes_poussins',
            colonne: 'mode_paiement',
            sql: `
                ALTER TABLE ventes_poussins
                ADD COLUMN mode_paiement TEXT
                NOT NULL DEFAULT 'comptant'
            `
        },

        {
            table: 'ventes_poussins',
            colonne: 'montant_paye',
            sql: `
                ALTER TABLE ventes_poussins
                ADD COLUMN montant_paye REAL;

                UPDATE ventes_poussins
                SET montant_paye = montant_total
                WHERE montant_paye IS NULL;
            `
        },

        {
            table: 'ventes_poussins',
            colonne: 'solde_du',
            sql: `
                ALTER TABLE ventes_poussins
                ADD COLUMN solde_du REAL;

                UPDATE ventes_poussins
                SET solde_du = 0
                WHERE solde_du IS NULL;
            `
        }
    ];


    for (
        const migration
        of migrations
    ) {

        try {

            if (
                !colonneExiste(
                    migration.table,
                    migration.colonne
                )
            ) {

                db.run(
                    migration.sql
                );
            }

        } catch (erreur) {

            console.error(
                `Migration ${migration.table}.${migration.colonne} impossible :`,
                erreur
            );
        }
    }
}


/* =========================================================
   INITIALISATION
   ========================================================= */

async function initialiserBaseDeDonnees() {

    if (db) {

        return db;
    }


    /*
     * Chargement de sql.js.
     */

    SQL =
        await initSqlJs({

            locateFile:
                (fichier) => {

                    return `assets/${fichier}`;
                }
        });


    /*
     * Recherche d'une ancienne base.
     */

    const fichierExistant =
        await chargerFichierSQLiteDepuisIndexedDB();


    if (fichierExistant) {

        db =
            new SQL.Database(
                new Uint8Array(
                    fichierExistant
                )
            );

    } else {

        db =
            new SQL.Database();
    }


    /*
     * Activation des clés étrangères.
     */

    db.run(
        'PRAGMA foreign_keys = ON;'
    );


    /*
     * Création des tables/index manquants.
     */

    db.run(
        SCHEMA_SQL
    );


    /*
     * Migration des anciennes structures.
     */

    executerMigrations();


    /*
     * Sauvegarde de la structure finale.
     */

    await sauvegarderBaseVersIndexedDB();


    return db;
}


/* =========================================================
   LECTURE SIMPLE
   ========================================================= */

function requeteLecture(
    sql,
    params = []
) {

    if (!db) {

        throw new Error(
            "La base de données n'est pas initialisée."
        );
    }


    const stmt =
        db.prepare(sql);


    try {

        stmt.bind(params);


        const resultats = [];


        while (
            stmt.step()
        ) {

            resultats.push(
                stmt.getAsObject()
            );
        }


        return resultats;

    } finally {

        stmt.free();
    }
}


/* =========================================================
   ÉCRITURE SIMPLE
   ========================================================= */

async function requeteEcriture(
    sql,
    params = []
) {

    if (!db) {

        throw new Error(
            "La base de données n'est pas initialisée."
        );
    }


    db.run(
        sql,
        params
    );


    const resultatId =
        db.exec(
            `
            SELECT
                last_insert_rowid()
                AS id
            `
        );


    const dernierIdInsere =
        resultatId[0]
            ?.values[0]
            ?.[0]
        ?? null;


    await sauvegarderBaseVersIndexedDB();


    return dernierIdInsere;
}


/* =========================================================
   TRANSACTION
   =========================================================
 *
 * Utilisée pour les opérations importantes :
 *
 * - vente
 * - crédit
 * - paiement
 * - approvisionnement
 * - opérations d'élevage complexes
 *
 * Si une opération échoue :
 *
 * BEGIN
 *   ↓
 * opérations
 *   ↓
 * ERREUR
 *   ↓
 * ROLLBACK
 *
 * Sinon :
 *
 * COMMIT
 *   ↓
 * sauvegarde IndexedDB
 * ========================================================= */

async function transaction(
    callback
) {

    if (!db) {

        throw new Error(
            "La base de données n'est pas initialisée."
        );
    }


    db.run(
        'BEGIN TRANSACTION;'
    );


    let terminee =
        false;


    try {

        const tx = {

            lire(
                sql,
                params = []
            ) {

                const stmt =
                    db.prepare(sql);


                try {

                    stmt.bind(params);


                    const resultats = [];


                    while (
                        stmt.step()
                    ) {

                        resultats.push(
                            stmt.getAsObject()
                        );
                    }


                    return resultats;

                } finally {

                    stmt.free();
                }
            },


            ecrire(
                sql,
                params = []
            ) {

                db.run(
                    sql,
                    params
                );


                const resultatId =
                    db.exec(
                        `
                        SELECT
                            last_insert_rowid()
                            AS id
                        `
                    );


                return (
                    resultatId[0]
                        ?.values[0]
                        ?.[0]
                    ?? null
                );
            }
        };


        const resultat =
            await callback(tx);


        db.run(
            'COMMIT;'
        );


        terminee =
            true;


        await sauvegarderBaseVersIndexedDB();


        return resultat;


    } catch (erreur) {

        if (!terminee) {

            try {

                db.run(
                    'ROLLBACK;'
                );

            } catch (rollbackErreur) {

                console.error(
                    'Erreur ROLLBACK :',
                    rollbackErreur
                );
            }
        }


        throw erreur;
    }
}


/* =========================================================
   UTILITAIRES ÉLEVAGE
   =========================================================
 *
 * Utilisés par elevage.js pour la conversion sacs ↔ kg.
 * ========================================================= */

function obtenirPoidsSacStandard() {

    /*
     * Poids par défaut d'un sac d'aliment, en kg.
     * Cohérent avec la valeur par défaut de la colonne
     * consommations_elevage.poids_sac_kg (DEFAULT 50).
     */

    return 50;
}


function convertirSacsEnKg(
    sacs,
    poidsSacKg
) {

    sacs =
        Number(sacs) || 0;


    poidsSacKg =
        Number(poidsSacKg) || 0;


    return sacs * poidsSacKg;
}


/* =========================================================
   EXPORT DE LA BASE
   ========================================================= */

function exporterBaseSQLite() {

    if (!db) {

        throw new Error(
            "La base de données n'est pas initialisée."
        );
    }


    return db.export();
}


/* =========================================================
   REMPLACER LA BASE PAR UN FICHIER SQLITE
   =========================================================
 *
 * Cette fonction sera utilisée plus tard pour la
 * restauration/import.
 * ========================================================= */

async function importerBaseSQLite(
    donnees
) {

    if (!SQL) {

        throw new Error(
            "SQLite n'est pas initialisé."
        );
    }


    if (
        !(donnees instanceof Uint8Array)
        &&
        !(donnees instanceof ArrayBuffer)
    ) {

        throw new Error(
            "Le fichier SQLite est invalide."
        );
    }


    const bytes =
        donnees instanceof Uint8Array
            ? donnees
            : new Uint8Array(donnees);


    const nouvelleBase =
        new SQL.Database(
            bytes
        );


    nouvelleBase.run(
        'PRAGMA foreign_keys = ON;'
    );


    db =
        nouvelleBase;


    /*
     * Vérification/recréation des éléments manquants.
     */

    db.run(
        SCHEMA_SQL
    );


    executerMigrations();


    await sauvegarderBaseVersIndexedDB();


    return db;
}


/* =========================================================
   EFFACER LA BASE LOCALE
   =========================================================
 *
 * ATTENTION :
 * Fonction volontairement exposée uniquement pour les
 * opérations administratives/tests.
 * ========================================================= */

async function supprimerBaseLocale() {

    const idb =
        await openIndexedDB();


    return new Promise(
        (resolve, reject) => {

            const tx =
                idb.transaction(
                    DB_STORE_NAME,
                    'readwrite'
                );


            const store =
                tx.objectStore(
                    DB_STORE_NAME
                );


            const request =
                store.delete(
                    DB_KEY
                );


            request.onsuccess =
                () => {

                    db =
                        null;

                    resolve();
                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );
                };
        }
    );
}


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.DB = {

    initialiserBaseDeDonnees,

    requeteLecture,

    requeteEcriture,

    transaction,

    exporterBaseSQLite,

    importerBaseSQLite,

    sauvegarderBaseVersIndexedDB,

    supprimerBaseLocale,

    obtenirPoidsSacStandard,

    convertirSacsEnKg

};