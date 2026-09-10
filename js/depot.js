/**
 * =========================================================
 * depot.js — MODULE DÉPÔT
 * DÉPÔT & AVICULTURE MARONE
 * =========================================================
 *
 * Gestion :
 *   - catégories
 *   - produits
 *   - unités de vente
 *   - approvisionnements
 *   - stock
 *   - coût moyen pondéré
 *   - alertes de stock
 *   - historique
 *
 * Ce module ne gère PAS les ventes.
 * Les ventes sont gérées par ventes.js.
 * =========================================================
 */

const Depot = {

    /* =====================================================
       CATÉGORIES
       ===================================================== */

    listerCategories(
        inclureInactives = false
    ) {

        const condition =
            inclureInactives
                ? ''
                : 'WHERE actif = 1';


        return DB.requeteLecture(
            `
            SELECT *
            FROM categories
            ${condition}
            ORDER BY nom COLLATE NOCASE
            `
        );
    },


    obtenirCategorie(id) {

        const resultat =
            DB.requeteLecture(
                `
                SELECT *
                FROM categories
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        return resultat[0] || null;
    },


    async ajouterCategorie(
        nom
    ) {

        nom =
            String(
                nom || ''
            ).trim();


        if (!nom) {

            throw new Error(
                "Le nom de la catégorie est obligatoire."
            );
        }


        const existante =
            DB.requeteLecture(
                `
                SELECT id
                FROM categories
                WHERE LOWER(TRIM(nom))
                      = LOWER(TRIM(?))
                LIMIT 1
                `,
                [nom]
            );


        if (existante.length) {

            throw new Error(
                "Cette catégorie existe déjà."
            );
        }


        return DB.requeteEcriture(
            `
            INSERT INTO categories
            (
                nom
            )
            VALUES
            (?)
            `,
            [nom]
        );
    },


    async modifierCategorie(
        id,
        nom
    ) {

        const categorie =
            this.obtenirCategorie(id);


        if (!categorie) {

            throw new Error(
                "Catégorie introuvable."
            );
        }


        nom =
            String(
                nom || ''
            ).trim();


        if (!nom) {

            throw new Error(
                "Le nom de la catégorie est obligatoire."
            );
        }


        const doublon =
            DB.requeteLecture(
                `
                SELECT id
                FROM categories
                WHERE
                    LOWER(TRIM(nom))
                    =
                    LOWER(TRIM(?))
                    AND id <> ?
                LIMIT 1
                `,
                [
                    nom,
                    id
                ]
            );


        if (doublon.length) {

            throw new Error(
                "Une autre catégorie porte déjà ce nom."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE categories
            SET
                nom = ?,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                nom,
                id
            ]
        );
    },


    async supprimerCategorie(
        id
    ) {

        const categorie =
            this.obtenirCategorie(id);


        if (!categorie) {

            throw new Error(
                "Catégorie introuvable."
            );
        }


        const produitsLies =
            DB.requeteLecture(
                `
                SELECT COUNT(*) AS total
                FROM produits
                WHERE categorie_id = ?
                `,
                [id]
            );


        if (
            Number(
                produitsLies[0]?.total
            ) > 0
        ) {

            throw new Error(
                "Impossible de supprimer cette catégorie : des produits lui sont encore associés."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE categories
            SET
                actif = 0,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [id]
        );
    },


    /* =====================================================
       PRODUITS
       ===================================================== */

    listerProduits(
        inclureInactifs = false
    ) {

        const condition =
            inclureInactifs
                ? ''
                : 'WHERE p.actif = 1';


        return DB.requeteLecture(
            `
            SELECT
                p.*,
                c.nom AS categorie_nom
            FROM produits p
            JOIN categories c
                ON c.id = p.categorie_id
            ${condition}
            ORDER BY
                p.nom COLLATE NOCASE
            `
        );
    },


    obtenirProduit(
        id
    ) {

        const resultats =
            DB.requeteLecture(
                `
                SELECT
                    p.*,
                    c.nom AS categorie_nom
                FROM produits p
                JOIN categories c
                    ON c.id = p.categorie_id
                WHERE p.id = ?
                LIMIT 1
                `,
                [id]
            );


        return resultats[0] || null;
    },


    async ajouterProduit({

        categorie_id,
        nom,
        unite_stock,
        seuil_alerte

    }) {

        nom =
            String(
                nom || ''
            ).trim();


        unite_stock =
            String(
                unite_stock || ''
            ).trim();


        categorie_id =
            Number(categorie_id);


        seuil_alerte =
            Number(
                seuil_alerte
            );


        if (!categorie_id) {

            throw new Error(
                "La catégorie est obligatoire."
            );
        }


        if (!nom) {

            throw new Error(
                "Le nom du produit est obligatoire."
            );
        }


        if (!unite_stock) {

            throw new Error(
                "L'unité de stock est obligatoire."
            );
        }


        if (
            !Number.isFinite(
                seuil_alerte
            )
            ||
            seuil_alerte < 0
        ) {

            throw new Error(
                "Le seuil d'alerte est invalide."
            );
        }


        const categorie =
            this.obtenirCategorie(
                categorie_id
            );


        if (
            !categorie
            ||
            Number(categorie.actif) !== 1
        ) {

            throw new Error(
                "Catégorie introuvable ou inactive."
            );
        }


        const doublon =
            DB.requeteLecture(
                `
                SELECT id
                FROM produits
                WHERE
                    LOWER(TRIM(nom))
                    =
                    LOWER(TRIM(?))
                    AND actif = 1
                LIMIT 1
                `,
                [nom]
            );


        if (doublon.length) {

            throw new Error(
                "Ce produit existe déjà."
            );
        }


        return DB.requeteEcriture(
            `
            INSERT INTO produits
            (
                categorie_id,
                nom,
                unite_stock,
                cout_moyen_actuel,
                quantite_en_stock,
                seuil_alerte,
                actif
            )
            VALUES
            (
                ?,
                ?,
                ?,
                0,
                0,
                ?,
                1
            )
            `,
            [
                categorie_id,
                nom,
                unite_stock,
                seuil_alerte
            ]
        );
    },


    async modifierProduit(
        id,
        {
            categorie_id,
            nom,
            unite_stock,
            seuil_alerte
        }
    ) {

        const produit =
            this.obtenirProduit(id);


        if (!produit) {

            throw new Error(
                "Produit introuvable."
            );
        }


        nom =
            String(
                nom || ''
            ).trim();


        unite_stock =
            String(
                unite_stock || ''
            ).trim();


        categorie_id =
            Number(categorie_id);


        seuil_alerte =
            Number(
                seuil_alerte
            );


        if (!categorie_id) {

            throw new Error(
                "La catégorie est obligatoire."
            );
        }


        if (!nom) {

            throw new Error(
                "Le nom du produit est obligatoire."
            );
        }


        if (!unite_stock) {

            throw new Error(
                "L'unité de stock est obligatoire."
            );
        }


        if (
            !Number.isFinite(
                seuil_alerte
            )
            ||
            seuil_alerte < 0
        ) {

            throw new Error(
                "Le seuil d'alerte est invalide."
            );
        }


        const categorie =
            this.obtenirCategorie(
                categorie_id
            );


        if (!categorie) {

            throw new Error(
                "Catégorie introuvable."
            );
        }


        const doublon =
            DB.requeteLecture(
                `
                SELECT id
                FROM produits
                WHERE
                    LOWER(TRIM(nom))
                    =
                    LOWER(TRIM(?))
                    AND id <> ?
                    AND actif = 1
                LIMIT 1
                `,
                [
                    nom,
                    id
                ]
            );


        if (doublon.length) {

            throw new Error(
                "Un autre produit porte déjà ce nom."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE produits
            SET
                categorie_id = ?,
                nom = ?,
                unite_stock = ?,
                seuil_alerte = ?,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                categorie_id,
                nom,
                unite_stock,
                seuil_alerte,
                id
            ]
        );
    },


    async archiverProduit(
        id
    ) {

        const produit =
            this.obtenirProduit(id);


        if (!produit) {

            throw new Error(
                "Produit introuvable."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE produits
            SET
                actif = 0,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [id]
        );
    },


    /* =====================================================
       UNITÉS DE VENTE
       ===================================================== */

    listerUnitesVente(
        produitId,
        inclureInactives = false
    ) {

        const condition =
            inclureInactives
                ? ''
                : 'AND actif = 1';


        return DB.requeteLecture(
            `
            SELECT *
            FROM unites_vente
            WHERE
                produit_id = ?
                ${condition}
            ORDER BY
                id ASC
            `,
            [produitId]
        );
    },


    obtenirUniteVente(
        id
    ) {

        const resultat =
            DB.requeteLecture(
                `
                SELECT *
                FROM unites_vente
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        return resultat[0] || null;
    },


    async ajouterUniteVente(
        produitId,
        {
            nom_unite,
            quantite_en_unite_stock,
            prix_vente
        }
    ) {

        const produit =
            this.obtenirProduit(
                produitId
            );


        if (!produit) {

            throw new Error(
                "Produit introuvable."
            );
        }


        nom_unite =
            String(
                nom_unite || ''
            ).trim();


        quantite_en_unite_stock =
            Number(
                quantite_en_unite_stock
            );


        prix_vente =
            Number(
                prix_vente
            );


        if (!nom_unite) {

            throw new Error(
                "Le nom de l'unité est obligatoire."
            );
        }


        if (
            !Number.isFinite(
                quantite_en_unite_stock
            )
            ||
            quantite_en_unite_stock <= 0
        ) {

            throw new Error(
                "L'équivalence doit être supérieure à zéro."
            );
        }


        if (
            !Number.isFinite(
                prix_vente
            )
            ||
            prix_vente < 0
        ) {

            throw new Error(
                "Le prix de vente est invalide."
            );
        }


        const doublon =
            DB.requeteLecture(
                `
                SELECT id
                FROM unites_vente
                WHERE
                    produit_id = ?
                    AND LOWER(TRIM(nom_unite))
                        =
                        LOWER(TRIM(?))
                    AND actif = 1
                LIMIT 1
                `,
                [
                    produitId,
                    nom_unite
                ]
            );


        if (doublon.length) {

            throw new Error(
                "Cette unité de vente existe déjà pour ce produit."
            );
        }


        return DB.requeteEcriture(
            `
            INSERT INTO unites_vente
            (
                produit_id,
                nom_unite,
                quantite_en_unite_stock,
                prix_vente,
                actif
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                1
            )
            `,
            [
                produitId,
                nom_unite,
                quantite_en_unite_stock,
                prix_vente
            ]
        );
    },


    async modifierUniteVente(
        id,
        {
            nom_unite,
            quantite_en_unite_stock,
            prix_vente
        }
    ) {

        const unite =
            this.obtenirUniteVente(
                id
            );


        if (!unite) {

            throw new Error(
                "Unité de vente introuvable."
            );
        }


        nom_unite =
            String(
                nom_unite || ''
            ).trim();


        quantite_en_unite_stock =
            Number(
                quantite_en_unite_stock
            );


        prix_vente =
            Number(
                prix_vente
            );


        if (!nom_unite) {

            throw new Error(
                "Le nom de l'unité est obligatoire."
            );
        }


        if (
            !Number.isFinite(
                quantite_en_unite_stock
            )
            ||
            quantite_en_unite_stock <= 0
        ) {

            throw new Error(
                "L'équivalence doit être supérieure à zéro."
            );
        }


        if (
            !Number.isFinite(
                prix_vente
            )
            ||
            prix_vente < 0
        ) {

            throw new Error(
                "Le prix de vente est invalide."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE unites_vente
            SET
                nom_unite = ?,
                quantite_en_unite_stock = ?,
                prix_vente = ?,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                nom_unite,
                quantite_en_unite_stock,
                prix_vente,
                id
            ]
        );
    },


    async supprimerUniteVente(
        id
    ) {

        const unite =
            this.obtenirUniteVente(
                id
            );


        if (!unite) {

            throw new Error(
                "Unité de vente introuvable."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE unites_vente
            SET
                actif = 0,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [id]
        );
    },


    /* =====================================================
       APPROVISIONNEMENTS
       ===================================================== */

    listerApprovisionnements(
        produitId = null
    ) {

        let sql = `
            SELECT
                a.*,
                p.nom AS produit_nom,
                p.unite_stock
            FROM approvisionnements a
            JOIN produits p
                ON p.id = a.produit_id
        `;


        const params = [];


        if (
            produitId !== null
            &&
            produitId !== undefined
        ) {

            sql += `
                WHERE a.produit_id = ?
            `;

            params.push(
                produitId
            );
        }


        sql += `
            ORDER BY
                a.date_appro DESC,
                a.id DESC
        `;


        return DB.requeteLecture(
            sql,
            params
        );
    },


    obtenirApprovisionnement(
        id
    ) {

        const resultat =
            DB.requeteLecture(
                `
                SELECT
                    a.*,
                    p.nom AS produit_nom,
                    p.unite_stock
                FROM approvisionnements a
                JOIN produits p
                    ON p.id = a.produit_id
                WHERE a.id = ?
                LIMIT 1
                `,
                [id]
            );


        return resultat[0] || null;
    },


    /**
     * =====================================================
     * AJOUTER UN APPROVISIONNEMENT
     * =====================================================
     *
     * Le stock et le coût moyen sont modifiés dans UNE
     * transaction.
     *
     * Exemple :
     *
     * ancien stock = 100 kg
     * coût moyen = 500 FCFA/kg
     *
     * nouvel apport = 50 kg
     * achat = 30 000 FCFA
     *
     * nouveau coût moyen =
     *
     * ((100 × 500) + 30 000)
     * / 150
     *
     * =====================================================
     */

    async ajouterApprovisionnement({

        produit_id,
        date_appro,
        fournisseur,
        quantite_sacs,
        quantite_ajoutee_stock,
        prix_achat_total,
        observation

    }) {

        const produit =
            this.obtenirProduit(
                produit_id
            );


        if (!produit) {

            throw new Error(
                "Produit introuvable."
            );
        }


        if (
            !date_appro
        ) {

            throw new Error(
                "La date d'approvisionnement est obligatoire."
            );
        }


        quantite_ajoutee_stock =
            Number(
                quantite_ajoutee_stock
            );


        prix_achat_total =
            Number(
                prix_achat_total
            );


        if (
            !Number.isFinite(
                quantite_ajoutee_stock
            )
            ||
            quantite_ajoutee_stock <= 0
        ) {

            throw new Error(
                "La quantité ajoutée doit être supérieure à zéro."
            );
        }


        if (
            !Number.isFinite(
                prix_achat_total
            )
            ||
            prix_achat_total < 0
        ) {

            throw new Error(
                "Le prix d'achat total est invalide."
            );
        }


        let sacs = null;


        if (
            quantite_sacs !== undefined
            &&
            quantite_sacs !== null
            &&
            String(
                quantite_sacs
            ).trim() !== ''
        ) {

            sacs =
                Number(
                    quantite_sacs
                );


            if (
                !Number.isFinite(
                    sacs
                )
                ||
                sacs <= 0
            ) {

                throw new Error(
                    "Le nombre de sacs est invalide."
                );
            }
        }


        const coutUnitaireNouveau =
            prix_achat_total /
            quantite_ajoutee_stock;


        const stockActuel =
            Number(
                produit.quantite_en_stock
            ) || 0;


        const coutActuel =
            Number(
                produit.cout_moyen_actuel
            ) || 0;


        const nouveauStock =
            stockActuel +
            quantite_ajoutee_stock;


        const nouveauCoutMoyen =
            (
                (
                    stockActuel *
                    coutActuel
                )
                +
                (
                    quantite_ajoutee_stock *
                    coutUnitaireNouveau
                )
            )
            /
            nouveauStock;


        return DB.transaction(
            async (tx) => {

                const approId =
                    tx.ecrire(
                        `
                        INSERT INTO approvisionnements
                        (
                            produit_id,
                            date_appro,
                            fournisseur,
                            quantite_sacs,
                            quantite_ajoutee_stock,
                            prix_achat_total,
                            cout_unitaire,
                            observation
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        `,
                        [
                            produit_id,
                            date_appro,
                            fournisseur
                                ? String(
                                    fournisseur
                                ).trim()
                                : null,
                            sacs,
                            quantite_ajoutee_stock,
                            prix_achat_total,
                            coutUnitaireNouveau,
                            observation
                                ? String(
                                    observation
                                ).trim()
                                : null
                        ]
                    );


                tx.ecrire(
                    `
                    UPDATE produits
                    SET
                        quantite_en_stock = ?,
                        cout_moyen_actuel = ?,
                        updated_at = datetime('now')
                    WHERE id = ?
                    `,
                    [
                        nouveauStock,
                        nouveauCoutMoyen,
                        produit_id
                    ]
                );


                return {

                    id:
                        approId,

                    nouveauStock,

                    nouveauCoutMoyen,

                    coutUnitaireNouveau
                };
            }
        );
    },
/* =====================================================
   DÉPENSES DU DÉPÔT
   ===================================================== */

async ajouterDepenseDepot({

    date_depense,
    categorie,
    libelle,
    montant,
    observation

}) {

    date_depense =
        String(date_depense || '').trim();

    categorie =
        String(categorie || '').trim();

    libelle =
        String(libelle || '').trim();

    observation =
        String(observation || '').trim();

    montant =
        Number(montant);


    if (!date_depense) {

        throw new Error(
            "La date de la dépense est obligatoire."
        );
    }


    if (!categorie) {

        throw new Error(
            "La catégorie de la dépense est obligatoire."
        );
    }


    if (
        !Number.isFinite(montant)
        ||
        montant <= 0
    ) {

        throw new Error(
            "Le montant de la dépense doit être supérieur à zéro."
        );
    }


    return DB.requeteEcriture(
        `
        INSERT INTO depenses_depot
        (
            date_depense,
            categorie,
            libelle,
            montant,
            observation
        )
        VALUES
        (
            ?,
            ?,
            ?,
            ?,
            ?
        )
        `,
        [
            date_depense,
            categorie,
            libelle || null,
            montant,
            observation || null
        ]
    );
},


listerDepensesDepot() {

    return DB.requeteLecture(
        `
        SELECT *
        FROM depenses_depot
        ORDER BY
            date_depense DESC,
            id DESC
        `
    );
},


obtenirDepenseDepot(id) {

    const resultat =
        DB.requeteLecture(
            `
            SELECT *
            FROM depenses_depot
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );


    return resultat[0] || null;
},


async modifierDepenseDepot(
    id,
    {
        date_depense,
        categorie,
        libelle,
        montant,
        observation
    }
) {

    const depense =
        this.obtenirDepenseDepot(id);


    if (!depense) {

        throw new Error(
            "Dépense du dépôt introuvable."
        );
    }


    date_depense =
        String(date_depense || '').trim();

    categorie =
        String(categorie || '').trim();

    libelle =
        String(libelle || '').trim();

    observation =
        String(observation || '').trim();

    montant =
        Number(montant);


    if (!date_depense) {

        throw new Error(
            "La date de la dépense est obligatoire."
        );
    }


    if (!categorie) {

        throw new Error(
            "La catégorie est obligatoire."
        );
    }


    if (
        !Number.isFinite(montant)
        ||
        montant <= 0
    ) {

        throw new Error(
            "Le montant est invalide."
        );
    }


    return DB.requeteEcriture(
        `
        UPDATE depenses_depot
        SET
            date_depense = ?,
            categorie = ?,
            libelle = ?,
            montant = ?,
            observation = ?
        WHERE id = ?
        `,
        [
            date_depense,
            categorie,
            libelle || null,
            montant,
            observation || null,
            id
        ]
    );
},


async supprimerDepenseDepot(id) {

    const depense =
        this.obtenirDepenseDepot(id);


    if (!depense) {

        throw new Error(
            "Dépense du dépôt introuvable."
        );
    }


    return DB.requeteEcriture(
        `
        DELETE FROM depenses_depot
        WHERE id = ?
        `,
        [id]
    );
},


totalDepensesDepot() {

    const resultat =
        DB.requeteLecture(
            `
            SELECT
                COALESCE(
                    SUM(montant),
                    0
                ) AS total
            FROM depenses_depot
            `
        );


    return Number(
        resultat[0]?.total
    ) || 0;
},

    /* =====================================================
       STOCK
       ===================================================== */

    obtenirStock(
        produitId
    ) {

        const produit =
            this.obtenirProduit(
                produitId
            );


        if (!produit) {

            throw new Error(
                "Produit introuvable."
            );
        }


        return {

            quantite:
                Number(
                    produit.quantite_en_stock
                ) || 0,

            unite:
                produit.unite_stock,

            coutMoyen:
                Number(
                    produit.cout_moyen_actuel
                ) || 0,

            valeur:
                (
                    Number(
                        produit.quantite_en_stock
                    ) || 0
                )
                *
                (
                    Number(
                        produit.cout_moyen_actuel
                    ) || 0
                ),

            seuilAlerte:
                Number(
                    produit.seuil_alerte
                ) || 0
        };
    },


    produitsEnAlerteStock() {

        return DB.requeteLecture(
            `
            SELECT
                p.*,
                c.nom AS categorie_nom
            FROM produits p
            JOIN categories c
                ON c.id = p.categorie_id
            WHERE
                p.actif = 1
                AND p.quantite_en_stock
                    <= p.seuil_alerte
            ORDER BY
                p.quantite_en_stock ASC,
                p.nom COLLATE NOCASE
            `
        );
    },


    valeurTotaleStock() {

        const resultat =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(
                            quantite_en_stock
                            *
                            cout_moyen_actuel
                        ),
                        0
                    ) AS valeur
                FROM produits
                WHERE actif = 1
                `
            );


        return Number(
            resultat[0]?.valeur
        ) || 0;
    },


    nombreProduitsEnStock() {

        const resultat =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM produits
                WHERE
                    actif = 1
                    AND quantite_en_stock > 0
                `
            );


        return Number(
            resultat[0]?.total
        ) || 0;
    },


    /* =====================================================
       HISTORIQUE GLOBAL
       ===================================================== */

    historiqueApprovisionnements(
        limite = 100
    ) {

        limite =
            Number(limite);


        if (
            !Number.isInteger(
                limite
            )
            ||
            limite <= 0
        ) {

            limite = 100;
        }


        return DB.requeteLecture(
            `
            SELECT
                a.*,
                p.nom AS produit_nom,
                p.unite_stock
            FROM approvisionnements a
            JOIN produits p
                ON p.id = a.produit_id
            ORDER BY
                a.date_appro DESC,
                a.id DESC
            LIMIT ${limite}
            `
        );
    },


    /* =====================================================
       STATISTIQUES DU DÉPÔT
       ===================================================== */

    statistiques() {

        const produits =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM produits
                WHERE actif = 1
                `
            );


        const categories =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM categories
                WHERE actif = 1
                `
            );


        const alertes =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM produits
                WHERE
                    actif = 1
                    AND quantite_en_stock
                        <= seuil_alerte
                `
            );


        const valeur =
            this.valeurTotaleStock();


        return {

            produits:
                Number(
                    produits[0]?.total
                ) || 0,

            categories:
                Number(
                    categories[0]?.total
                ) || 0,

            alertes:
                Number(
                    alertes[0]?.total
                ) || 0,

            valeurStock:
                valeur
        };
    }
};


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.Depot = Depot;
