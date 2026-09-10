/**
 * =========================================================
 * elevage.js — Gestion des bandes d'élevage
 * =========================================================
 *
 * Gestion :
 *   - création des bandes
 *   - modification des bandes
 *   - démarrage / clôture
 *   - effectif
 *   - mortalité
 *   - consommation
 *   - sorties / ventes
 *   - dépenses
 *   - observations
 *   - statistiques
 *   - résultat d'une bande
 *
 * IMPORTANT :
 * Chaque bande possède ses propres données.
 *
 * Plusieurs bandes peuvent être en cours en même temps
 * sans mélanger leurs informations.
 *
 * COHÉRENCE AVEC db.js :
 * - La colonne réelle pour le nombre de morts est
 *   `mortalites.nombre_morts` (pas `quantite`).
 * - Les colonnes réelles pour l'aliment sont
 *   `consommations_elevage.nombre_sacs` et `.prix_total`
 *   (pas `quantite_sacs` / `cout_total`).
 * - `bandes.nom` est NOT NULL en base : si aucun nom n'est
 *   donné, on retombe sur le `code` de la bande.
 * =========================================================
 */

const Elevage = {


    /* =====================================================
       BANDES
       ===================================================== */

    listerBandes(
        statut = null
    ) {

        let sql = `
            SELECT
                b.*,

                (
                    SELECT COALESCE(
                        SUM(m.nombre_morts),
                        0
                    )
                    FROM mortalites m
                    WHERE m.bande_id = b.id
                ) AS mortalite_totale,

                (
                    SELECT COALESCE(
                        SUM(s.quantite),
                        0
                    )
                    FROM sorties_elevage s
                    WHERE s.bande_id = b.id
                ) AS quantite_sortie

            FROM bandes b
        `;

        const params = [];


        if (statut) {

            sql += `
                WHERE b.statut = ?
            `;

            params.push(
                statut
            );
        }


        sql += `
            ORDER BY
                CASE
                    WHEN b.statut = 'EN_COURS'
                    THEN 0
                    ELSE 1
                END,
                b.date_depart DESC,
                b.id DESC
        `;


        return DB.requeteLecture(
            sql,
            params
        );
    },


    listerBandesEnCours() {

        return this.listerBandes(
            'EN_COURS'
        );
    },


    listerBandesTerminees() {

        return this.listerBandes(
            'TERMINEE'
        );
    },


    obtenirBande(id) {

        const resultats =
            DB.requeteLecture(
                `
                SELECT *
                FROM bandes
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        return resultats[0] || null;
    },


    obtenirBandeParCode(code) {

        const resultats =
            DB.requeteLecture(
                `
                SELECT *
                FROM bandes
                WHERE code COLLATE NOCASE = ?
                LIMIT 1
                `,
                [
                    String(
                        code || ''
                    ).trim()
                ]
            );


        return resultats[0] || null;
    },


    /**
     * Crée une nouvelle bande.
     */
    async ajouterBande({

        code,
        nom,
        type_volaille,
        fournisseur,
        emplacement,
        date_depart,
        effectif_initial,
        poids_initial_moyen,
        observation

    }) {

        code =
            String(
                code || ''
            ).trim();


        nom =
            String(
                nom || ''
            ).trim();


        type_volaille =
            String(
                type_volaille || ''
            ).trim();


        fournisseur =
            String(
                fournisseur || ''
            ).trim();


        emplacement =
            String(
                emplacement || ''
            ).trim();


        observation =
            String(
                observation || ''
            ).trim();


        const effectif =
            Number(
                effectif_initial
            );


        const poidsInitial =
            poids_initial_moyen === null
            || poids_initial_moyen === undefined
            || String(
                poids_initial_moyen
            ).trim() === ''
                ? null
                : Number(
                    poids_initial_moyen
                );


        if (!code) {

            throw new Error(
                "Le code de la bande est obligatoire."
            );
        }


        if (!date_depart) {

            throw new Error(
                "La date de départ est obligatoire."
            );
        }


        if (
            !Number.isInteger(effectif)
            || effectif <= 0
        ) {

            throw new Error(
                "L'effectif initial doit être un nombre entier supérieur à zéro."
            );
        }


        if (
            poidsInitial !== null
            &&
            (
                !Number.isFinite(
                    poidsInitial
                )
                ||
                poidsInitial < 0
            )
        ) {

            throw new Error(
                "Le poids initial moyen est invalide."
            );
        }


        const existante =
            this.obtenirBandeParCode(
                code
            );


        if (existante) {

            throw new Error(
                "Une bande portant ce code existe déjà."
            );
        }


        return DB.requeteEcriture(
            `
            INSERT INTO bandes
            (
                code,
                nom,
                type_volaille,
                fournisseur,
                emplacement,
                date_depart,
                effectif_initial,
                effectif_actuel,
                statut,
                poids_initial_moyen,
                observation
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, 'EN_COURS', ?, ?)
            `,
            [
                code,
                /*
                 * bandes.nom est NOT NULL en base : si
                 * aucun nom n'est saisi, on utilise le code
                 * (toujours renseigné à ce stade) pour
                 * éviter une violation de contrainte.
                 */
                nom || code,
                type_volaille || null,
                fournisseur || null,
                emplacement || null,
                date_depart,
                effectif,
                effectif,
                poidsInitial,
                observation || null
            ]
        );
    },


    /**
     * Modifie les informations générales d'une bande.
     *
     * L'effectif actuel n'est pas modifié ici.
     * Il doit évoluer uniquement par les mouvements
     * réels : mortalités et sorties.
     */
    async modifierBande(
        id,
        {
            code,
            nom,
            type_volaille,
            fournisseur,
            emplacement,
            date_depart,
            poids_initial_moyen,
            observation
        }
    ) {

        const bande =
            this.obtenirBande(id);


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        code =
            String(
                code || ''
            ).trim();


        nom =
            String(
                nom || ''
            ).trim();


        type_volaille =
            String(
                type_volaille || ''
            ).trim();


        fournisseur =
            String(
                fournisseur || ''
            ).trim();


        emplacement =
            String(
                emplacement || ''
            ).trim();


        observation =
            String(
                observation || ''
            ).trim();


        if (!code) {

            throw new Error(
                "Le code de la bande est obligatoire."
            );
        }


        if (!date_depart) {

            throw new Error(
                "La date de départ est obligatoire."
            );
        }


        const doublon =
            DB.requeteLecture(
                `
                SELECT id
                FROM bandes
                WHERE code COLLATE NOCASE = ?
                  AND id <> ?
                LIMIT 1
                `,
                [
                    code,
                    id
                ]
            );


        if (doublon.length) {

            throw new Error(
                "Une autre bande porte déjà ce code."
            );
        }


        const poidsInitial =
            poids_initial_moyen === null
            || poids_initial_moyen === undefined
            || String(
                poids_initial_moyen
            ).trim() === ''
                ? null
                : Number(
                    poids_initial_moyen
                );


        if (
            poidsInitial !== null
            &&
            (
                !Number.isFinite(
                    poidsInitial
                )
                ||
                poidsInitial < 0
            )
        ) {

            throw new Error(
                "Le poids initial moyen est invalide."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE bandes
            SET
                code = ?,
                nom = ?,
                type_volaille = ?,
                fournisseur = ?,
                emplacement = ?,
                date_depart = ?,
                poids_initial_moyen = ?,
                observation = ?,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                code,
                /*
                 * Même règle que pour ajouterBande :
                 * bandes.nom est NOT NULL.
                 */
                nom || code,
                type_volaille || null,
                fournisseur || null,
                emplacement || null,
                date_depart,
                poidsInitial,
                observation || null,
                id
            ]
        );
    },


    /* =====================================================
       EFFECTIF
       ===================================================== */

    calculerEffectifActuel(
        bandeId
    ) {

        const bande =
            this.obtenirBande(
                bandeId
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        const mortalite =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(nombre_morts),
                        0
                    ) AS total
                FROM mortalites
                WHERE bande_id = ?
                `,
                [bandeId]
            );


        const sorties =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(quantite),
                        0
                    ) AS total
                FROM sorties_elevage
                WHERE bande_id = ?
                `,
                [bandeId]
            );


        const totalMortalite =
            Number(
                mortalite[0]?.total
            ) || 0;


        const totalSorties =
            Number(
                sorties[0]?.total
            ) || 0;


        const effectif =
            Number(
                bande.effectif_initial
            )
            -
            totalMortalite
            -
            totalSorties;


        return Math.max(
            0,
            effectif
        );
    },


    async actualiserEffectif(
        bandeId
    ) {

        const effectif =
            this.calculerEffectifActuel(
                bandeId
            );


        await DB.requeteEcriture(
            `
            UPDATE bandes
            SET
                effectif_actuel = ?,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                effectif,
                bandeId
            ]
        );


        return effectif;
    },


    /* =====================================================
       MORTALITÉ
       ===================================================== */

    listerMortalites(
        bandeId
    ) {

        return DB.requeteLecture(
            `
            SELECT *
            FROM mortalites
            WHERE bande_id = ?
            ORDER BY
                date_mortalite DESC,
                id DESC
            `,
            [bandeId]
        );
    },


    obtenirMortalite(id) {

        const resultats =
            DB.requeteLecture(
                `
                SELECT *
                FROM mortalites
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        return resultats[0] || null;
    },


    async ajouterMortalite({

        bande_id,
        date_mortalite,
        quantite,
        cause,
        observation

    }) {

        const bande =
            this.obtenirBande(
                bande_id
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        if (
            bande.statut !== 'EN_COURS'
        ) {

            throw new Error(
                "Cette bande est déjà terminée."
            );
        }


        const quantiteMorte =
            Number(
                quantite
            );


        if (
            !Number.isInteger(
                quantiteMorte
            )
            ||
            quantiteMorte <= 0
        ) {

            throw new Error(
                "La mortalité doit être un nombre entier supérieur à zéro."
            );
        }


        if (!date_mortalite) {

            throw new Error(
                "La date de mortalité est obligatoire."
            );
        }


        const effectifActuel =
            this.calculerEffectifActuel(
                bande_id
            );


        if (
            quantiteMorte >
            effectifActuel
        ) {

            throw new Error(
                `Impossible d'enregistrer ${quantiteMorte} mortalités : l'effectif actuel est de ${effectifActuel}.`
            );
        }


        const dateDepart =
            String(
                bande.date_depart
            );


        if (
            String(date_mortalite)
            <
            dateDepart
        ) {

            throw new Error(
                "La date de mortalité ne peut pas être antérieure à la date de départ."
            );
        }


        cause =
            String(
                cause || ''
            ).trim();


        observation =
            String(
                observation || ''
            ).trim();


        return DB.transaction(
            async (tx) => {

                const id =
                    tx.ecrire(
                        `
                        INSERT INTO mortalites
                        (
                            bande_id,
                            date_mortalite,
                            nombre_morts,
                            cause,
                            observation
                        )
                        VALUES
                        (?, ?, ?, ?, ?)
                        `,
                        [
                            bande_id,
                            date_mortalite,
                            quantiteMorte,
                            cause || null,
                            observation || null
                        ]
                    );


                const nouveauEffectif =
                    effectifActuel
                    -
                    quantiteMorte;


                tx.ecrire(
                    `
                    UPDATE bandes
                    SET
                        effectif_actuel = ?,
                        updated_at = datetime('now')
                    WHERE id = ?
                    `,
                    [
                        nouveauEffectif,
                        bande_id
                    ]
                );


                return {

                    id,

                    bande_id,

                    quantite:
                        quantiteMorte,

                    ancien_effectif:
                        effectifActuel,

                    nouvel_effectif:
                        nouveauEffectif
                };
            }
        );
    },


    /* =====================================================
       CONSOMMATION D'ALIMENT
       ===================================================== */

    listerConsommations(
        bandeId
    ) {

        return DB.requeteLecture(
            `
            SELECT
                c.*,
                p.nom AS produit_nom
            FROM consommations_elevage c
            LEFT JOIN produits p
                ON p.id = c.produit_id
            WHERE c.bande_id = ?
            ORDER BY
                c.date_consommation DESC,
                c.id DESC
            `,
            [bandeId]
        );
    },


    obtenirConsommation(id) {

        const resultats =
            DB.requeteLecture(
                `
                SELECT *
                FROM consommations_elevage
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        return resultats[0] || null;
    },


    async ajouterConsommation({

        bande_id,
        date_consommation,
        produit_id,
        quantite_sacs,
        poids_sac_kg,
        prix_par_sac,
        observation

    }) {

        const bande =
            this.obtenirBande(
                bande_id
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        if (
            bande.statut !== 'EN_COURS'
        ) {

            throw new Error(
                "Impossible d'ajouter une consommation à une bande terminée."
            );
        }


        if (!date_consommation) {

            throw new Error(
                "La date de consommation est obligatoire."
            );
        }


        const sacs =
            Number(
                quantite_sacs
            );


        if (
            !Number.isFinite(sacs)
            ||
            sacs <= 0
        ) {

            throw new Error(
                "La quantité de sacs doit être supérieure à zéro."
            );
        }


        const poidsSac =
            poids_sac_kg === null
            || poids_sac_kg === undefined
            || String(
                poids_sac_kg
            ).trim() === ''
                ? DB.obtenirPoidsSacStandard()
                : Number(
                    poids_sac_kg
                );


        if (
            !Number.isFinite(poidsSac)
            ||
            poidsSac <= 0
        ) {

            throw new Error(
                "Le poids d'un sac doit être supérieur à zéro."
            );
        }


        const quantiteKg =
            DB.convertirSacsEnKg(
                sacs,
                poidsSac
            );


        const prixSac =
            prix_par_sac === null
            || prix_par_sac === undefined
            || String(
                prix_par_sac
            ).trim() === ''
                ? 0
                : Number(
                    prix_par_sac
                );


        if (
            !Number.isFinite(prixSac)
            ||
            prixSac < 0
        ) {

            throw new Error(
                "Le prix par sac est invalide."
            );
        }


        const coutTotal =
            sacs * prixSac;


        observation =
            String(
                observation || ''
            ).trim();


        /*
         * Si un produit d'aliment est fourni,
         * on vérifie qu'il existe.
         */
        if (
            produit_id !== null
            &&
            produit_id !== undefined
            &&
            String(produit_id).trim() !== ''
        ) {

            const produit =
                Depot.obtenirProduit(
                    produit_id
                );


            if (!produit) {

                throw new Error(
                    "Le produit d'alimentation est introuvable."
                );
            }
        }


        return DB.requeteEcriture(
            `
            INSERT INTO consommations_elevage
            (
                bande_id,
                date_consommation,
                produit_id,
                nombre_sacs,
                poids_sac_kg,
                quantite_kg,
                prix_par_sac,
                prix_total,
                observation
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                bande_id,
                date_consommation,
                produit_id || null,
                sacs,
                poidsSac,
                quantiteKg,
                prixSac,
                coutTotal,
                observation || null
            ]
        );
    },


    /* =====================================================
       SORTIES / VENTES DE VOLAILLES
       ===================================================== */

    listerSorties(
        bandeId
    ) {

        return DB.requeteLecture(
            `
            SELECT *
            FROM sorties_elevage
            WHERE bande_id = ?
            ORDER BY
                date_sortie DESC,
                id DESC
            `,
            [bandeId]
        );
    },


    obtenirSortie(id) {

        const resultats =
            DB.requeteLecture(
                `
                SELECT *
                FROM sorties_elevage
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        return resultats[0] || null;
    },


    async ajouterSortie({

        bande_id,
        date_sortie,
        quantite,
        poids_total_kg,
        prix_unitaire,
        motif,
        client,
        observation

    }) {

        const bande =
            this.obtenirBande(
                bande_id
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        if (
            bande.statut !== 'EN_COURS'
        ) {

            throw new Error(
                "Cette bande est déjà terminée."
            );
        }


        if (!date_sortie) {

            throw new Error(
                "La date de sortie est obligatoire."
            );
        }


        const quantiteSortie =
            Number(
                quantite
            );


        if (
            !Number.isInteger(
                quantiteSortie
            )
            ||
            quantiteSortie <= 0
        ) {

            throw new Error(
                "La quantité sortie doit être un nombre entier supérieur à zéro."
            );
        }


        const effectifActuel =
            this.calculerEffectifActuel(
                bande_id
            );


        if (
            quantiteSortie >
            effectifActuel
        ) {

            throw new Error(
                `Impossible de sortir ${quantiteSortie} sujets : l'effectif actuel est de ${effectifActuel}.`
            );
        }


        const poidsTotal =
            poids_total_kg === null
            || poids_total_kg === undefined
            || String(
                poids_total_kg
            ).trim() === ''
                ? null
                : Number(
                    poids_total_kg
                );


        if (
            poidsTotal !== null
            &&
            (
                !Number.isFinite(
                    poidsTotal
                )
                ||
                poidsTotal < 0
            )
        ) {

            throw new Error(
                "Le poids total est invalide."
            );
        }


        const prix =
            Number(
                prix_unitaire
            );


        if (
            !Number.isFinite(prix)
            ||
            prix < 0
        ) {

            throw new Error(
                "Le prix unitaire est invalide."
            );
        }


        const montantTotal =
            quantiteSortie * prix;


        motif =
            String(
                motif || 'VENTE'
            ).trim()
            ||
            'VENTE';


        client =
            String(
                client || ''
            ).trim();


        observation =
            String(
                observation || ''
            ).trim();


        return DB.transaction(
            async (tx) => {

                const id =
                    tx.ecrire(
                        `
                        INSERT INTO sorties_elevage
                        (
                            bande_id,
                            date_sortie,
                            quantite,
                            poids_total_kg,
                            prix_unitaire,
                            montant_total,
                            motif,
                            client,
                            observation
                        )
                        VALUES
                        (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                        [
                            bande_id,
                            date_sortie,
                            quantiteSortie,
                            poidsTotal,
                            prix,
                            montantTotal,
                            motif,
                            client || null,
                            observation || null
                        ]
                    );


                const nouveauEffectif =
                    effectifActuel
                    -
                    quantiteSortie;


                tx.ecrire(
                    `
                    UPDATE bandes
                    SET
                        effectif_actuel = ?,
                        updated_at = datetime('now')
                    WHERE id = ?
                    `,
                    [
                        nouveauEffectif,
                        bande_id
                    ]
                );


                return {

                    id,

                    bande_id,

                    quantite:
                        quantiteSortie,

                    montant_total:
                        montantTotal,

                    ancien_effectif:
                        effectifActuel,

                    nouvel_effectif:
                        nouveauEffectif
                };
            }
        );
    },


    /* =====================================================
       DÉPENSES
       ===================================================== */

    listerDepenses(
        bandeId
    ) {

        return DB.requeteLecture(
            `
            SELECT *
            FROM depenses_elevage
            WHERE bande_id = ?
            ORDER BY
                date_depense DESC,
                id DESC
            `,
            [bandeId]
        );
    },


    async ajouterDepense({

        bande_id,
        date_depense,
        categorie,
        libelle,
        montant,
        observation

    }) {

        const bande =
            this.obtenirBande(
                bande_id
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        if (!date_depense) {

            throw new Error(
                "La date de dépense est obligatoire."
            );
        }


        categorie =
            String(
                categorie || ''
            ).trim();


        if (!categorie) {

            throw new Error(
                "La catégorie de dépense est obligatoire."
            );
        }


        const montantNombre =
            Number(
                montant
            );


        if (
            !Number.isFinite(
                montantNombre
            )
            ||
            montantNombre < 0
        ) {

            throw new Error(
                "Le montant de la dépense est invalide."
            );
        }


        libelle =
            String(
                libelle || ''
            ).trim();


        observation =
            String(
                observation || ''
            ).trim();


        return DB.requeteEcriture(
            `
            INSERT INTO depenses_elevage
            (
                bande_id,
                date_depense,
                categorie,
                libelle,
                montant,
                observation
            )
            VALUES
            (?, ?, ?, ?, ?, ?)
            `,
            [
                bande_id,
                date_depense,
                categorie,
                libelle || null,
                montantNombre,
                observation || null
            ]
        );
    },


    /* =====================================================
       OBSERVATIONS
       ===================================================== */

    listerObservations(
        bandeId
    ) {

        return DB.requeteLecture(
            `
            SELECT *
            FROM observations_elevage
            WHERE bande_id = ?
            ORDER BY
                date_observation DESC,
                id DESC
            `,
            [bandeId]
        );
    },


    async ajouterObservation({

        bande_id,
        date_observation,
        type_observation,
        contenu

    }) {

        const bande =
            this.obtenirBande(
                bande_id
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        if (!date_observation) {

            throw new Error(
                "La date de l'observation est obligatoire."
            );
        }


        contenu =
            String(
                contenu || ''
            ).trim();


        if (!contenu) {

            throw new Error(
                "Le contenu de l'observation est obligatoire."
            );
        }


        type_observation =
            String(
                type_observation || ''
            ).trim();


        return DB.requeteEcriture(
            `
            INSERT INTO observations_elevage
            (
                bande_id,
                date_observation,
                type_observation,
                contenu
            )
            VALUES
            (?, ?, ?, ?)
            `,
            [
                bande_id,
                date_observation,
                type_observation || null,
                contenu
            ]
        );
    },


    /* =====================================================
       STATISTIQUES D'UNE BANDE
       ===================================================== */

    statistiquesBande(
        bandeId
    ) {

        const bande =
            this.obtenirBande(
                bandeId
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        const mortalite =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(nombre_morts),
                        0
                    ) AS total
                FROM mortalites
                WHERE bande_id = ?
                `,
                [bandeId]
            );


        const consommation =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(nombre_sacs),
                        0
                    ) AS sacs,

                    COALESCE(
                        SUM(quantite_kg),
                        0
                    ) AS kg,

                    COALESCE(
                        SUM(prix_total),
                        0
                    ) AS cout
                FROM consommations_elevage
                WHERE bande_id = ?
                `,
                [bandeId]
            );


        const sorties =
            DB.requeteLecture(
                `
                SELECT

                    COALESCE(
                        SUM(quantite),
                        0
                    ) AS quantite,

                    COALESCE(
                        SUM(poids_total_kg),
                        0
                    ) AS poids,

                    COALESCE(
                        SUM(montant_total),
                        0
                    ) AS recettes

                FROM sorties_elevage

                WHERE bande_id = ?
                `,
                [bandeId]
            );


        const depenses =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(montant),
                        0
                    ) AS total
                FROM depenses_elevage
                WHERE bande_id = ?
                `,
                [bandeId]
            );


        const totalMortalite =
            Number(
                mortalite[0]?.total
            ) || 0;


        const sacs =
            Number(
                consommation[0]?.sacs
            ) || 0;


        const kg =
            Number(
                consommation[0]?.kg
            ) || 0;


        const coutAliment =
            Number(
                consommation[0]?.cout
            ) || 0;


        const quantiteSortie =
            Number(
                sorties[0]?.quantite
            ) || 0;


        const poidsSortie =
            Number(
                sorties[0]?.poids
            ) || 0;


        const recettes =
            Number(
                sorties[0]?.recettes
            ) || 0;


        const autresDepenses =
            Number(
                depenses[0]?.total
            ) || 0;


        const effectifActuel =
            Math.max(
                0,
                Number(
                    bande.effectif_initial
                )
                -
                totalMortalite
                -
                quantiteSortie
            );


        const tauxMortalite =
            Number(
                bande.effectif_initial
            ) > 0
                ? (
                    totalMortalite
                    /
                    Number(
                        bande.effectif_initial
                    )
                )
                * 100
                : 0;


        const totalDepenses =
            coutAliment
            +
            autresDepenses;


        const resultat =
            recettes
            -
            totalDepenses;


        return {

            bande_id:
                bande.id,

            code:
                bande.code,

            nom:
                bande.nom,

            date_depart:
                bande.date_depart,

            date_fin:
                bande.date_fin,

            statut:
                bande.statut,

            effectif_initial:
                Number(
                    bande.effectif_initial
                ) || 0,

            effectif_actuel:
                effectifActuel,

            mortalite_totale:
                totalMortalite,

            taux_mortalite:
                tauxMortalite,

            quantite_sortie:
                quantiteSortie,

            poids_sortie_kg:
                poidsSortie,

            consommation_sacs:
                sacs,

            consommation_kg:
                kg,

            cout_aliment:
                coutAliment,

            autres_depenses:
                autresDepenses,

            total_depenses:
                totalDepenses,

            recettes:
                recettes,

            resultat:
                resultat
        };
    },


    /* =====================================================
       CLÔTURE D'UNE BANDE
       ===================================================== */

    async terminerBande({

        bande_id,
        date_fin,
        poids_final_moyen,
        observation

    }) {

        const bande =
            this.obtenirBande(
                bande_id
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        if (
            bande.statut !== 'EN_COURS'
        ) {

            throw new Error(
                "Cette bande est déjà terminée."
            );
        }


        if (!date_fin) {

            throw new Error(
                "La date de fin est obligatoire."
            );
        }


        if (
            String(date_fin)
            <
            String(bande.date_depart)
        ) {

            throw new Error(
                "La date de fin ne peut pas être antérieure à la date de départ."
            );
        }


        const poidsFinal =
            poids_final_moyen === null
            || poids_final_moyen === undefined
            || String(
                poids_final_moyen
            ).trim() === ''
                ? null
                : Number(
                    poids_final_moyen
                );


        if (
            poidsFinal !== null
            &&
            (
                !Number.isFinite(
                    poidsFinal
                )
                ||
                poidsFinal < 0
            )
        ) {

            throw new Error(
                "Le poids final moyen est invalide."
            );
        }


        observation =
            String(
                observation || ''
            ).trim();


        return DB.requeteEcriture(
            `
            UPDATE bandes
            SET
                date_fin = ?,
                poids_final_moyen = ?,
                observation = ?,
                statut = 'TERMINEE',
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                date_fin,
                poidsFinal,
                observation || bande.observation || null,
                bande_id
            ]
        );
    },


    /* =====================================================
       RÉOUVERTURE D'UNE BANDE
       =====================================================
       Utile en cas d'erreur de clôture.
       */

    async rouvrirBande(
        bandeId
    ) {

        const bande =
            this.obtenirBande(
                bandeId
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        if (
            bande.statut === 'EN_COURS'
        ) {

            return;
        }


        return DB.requeteEcriture(
            `
            UPDATE bandes
            SET
                statut = 'EN_COURS',
                date_fin = NULL,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [bandeId]
        );
    },


    /* =====================================================
       RÉSULTAT FINAL
       ===================================================== */

    resultatBande(
        bandeId
    ) {

        const stats =
            this.statistiquesBande(
                bandeId
            );


        const marge =
            stats.recettes
            -
            stats.total_depenses;


        let rentabilite = 0;


        if (
            stats.total_depenses > 0
        ) {

            rentabilite =
                (
                    marge
                    /
                    stats.total_depenses
                )
                * 100;
        }


        return {

            ...stats,

            marge,

            rentabilite
        };
    }
};


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.Elevage = Elevage;
