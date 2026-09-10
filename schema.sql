-- =========================================================
-- SCHÉMA BASE DE DONNÉES - GESTION DÉPÔT AVICOLE
-- Module Dépôt (Phase 1)
-- =========================================================

-- Catégories de produits (Aliment volaille, Médicaments/Vaccins, Céréales...)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Produits (chaque article vendu au dépôt)
CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categorie_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    unite_stock TEXT NOT NULL,          -- ex: "kg", "tablette", "piece"
    cout_moyen_actuel REAL NOT NULL DEFAULT 0,
    quantite_en_stock REAL NOT NULL DEFAULT 0,
    seuil_alerte REAL DEFAULT 0,
    actif INTEGER NOT NULL DEFAULT 1,   -- 1 = visible, 0 = archivé
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (categorie_id) REFERENCES categories(id)
);

-- Unités de vente possibles pour un produit (flexible : sac, kg détail, tablette, pièce...)
CREATE TABLE IF NOT EXISTS unites_vente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produit_id INTEGER NOT NULL,
    nom_unite TEXT NOT NULL,             -- ex: "Sac 50kg", "Kg détail", "Tablette"
    quantite_en_unite_stock REAL NOT NULL, -- ex: 50 pour un sac de 50kg, 1 pour le kg détail
    prix_vente REAL NOT NULL,
    actif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (produit_id) REFERENCES produits(id)
);

-- Historique des réapprovisionnements (achats de stock)
CREATE TABLE IF NOT EXISTS approvisionnements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produit_id INTEGER NOT NULL,
    date_appro TEXT NOT NULL,
    fournisseur TEXT,
    quantite_sacs REAL,                  -- nullable, rempli si acheté en sacs
    quantite_ajoutee_stock REAL NOT NULL, -- toujours dans l'unité de stock du produit
    prix_achat_total REAL NOT NULL,
    cout_unitaire REAL NOT NULL,          -- = prix_achat_total / quantite_ajoutee_stock
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (produit_id) REFERENCES produits(id)
);

-- Clients (pour la gestion du crédit)
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    telephone TEXT,
    solde_du REAL NOT NULL DEFAULT 0,   -- montant total dû actuellement
    created_at TEXT DEFAULT (datetime('now'))
);

-- Ventes (l'en-tête d'une transaction)
CREATE TABLE IF NOT EXISTS ventes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,                   -- nullable si vente comptant anonyme
    date_vente TEXT NOT NULL,
    mode_paiement TEXT NOT NULL,         -- "comptant" ou "credit"
    montant_total REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Lignes de vente (le détail de chaque produit vendu dans une transaction)
CREATE TABLE IF NOT EXISTS lignes_vente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vente_id INTEGER NOT NULL,
    produit_id INTEGER NOT NULL,
    unite_vente_id INTEGER NOT NULL,
    quantite_vendue REAL NOT NULL,        -- quantité dans l'unité de vente choisie (ex: 5 sacs)
    quantite_stock_decrementee REAL NOT NULL, -- quantité réelle retirée du stock (ex: 250kg)
    prix_unitaire_applique REAL NOT NULL,
    montant_ligne REAL NOT NULL,
    cout_unitaire_au_moment_vente REAL NOT NULL, -- figé pour calcul de marge
    FOREIGN KEY (vente_id) REFERENCES ventes(id),
    FOREIGN KEY (produit_id) REFERENCES produits(id),
    FOREIGN KEY (unite_vente_id) REFERENCES unites_vente(id)
);

-- Paiements de crédit (remboursements progressifs des clients)
CREATE TABLE IF NOT EXISTS paiements_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    montant REAL NOT NULL,
    date_paiement TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Index utiles pour les performances
CREATE INDEX IF NOT EXISTS idx_produits_categorie ON produits(categorie_id);
CREATE INDEX IF NOT EXISTS idx_unites_vente_produit ON unites_vente(produit_id);
CREATE INDEX IF NOT EXISTS idx_appro_produit ON approvisionnements(produit_id);
CREATE INDEX IF NOT EXISTS idx_ventes_client ON ventes(client_id);
CREATE INDEX IF NOT EXISTS idx_ventes_date ON ventes(date_vente);
CREATE INDEX IF NOT EXISTS idx_lignes_vente_vente ON lignes_vente(vente_id);
CREATE INDEX IF NOT EXISTS idx_lignes_vente_produit ON lignes_vente(produit_id);
CREATE INDEX IF NOT EXISTS idx_paiements_client ON paiements_clients(client_id);
