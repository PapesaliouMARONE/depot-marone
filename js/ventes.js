/**
 * =========================================================
 * ventes.js — MODULE VENTES
 * DÉPÔT & AVICULTURE MARONE
 * =========================================================
 *
 * Gestion :
 * - ventes comptant
 * - ventes à crédit
 * - lignes de vente
 * - diminution du stock
 * - contrôle du stock disponible
 * - calcul du chiffre d'affaires
 * - calcul de la marge
 * - historique des ventes
 * - historique des lignes
 *
 * Règle importante :
 * Une vente complète est enregistrée dans UNE transaction.
 *
 * Si une erreur survient :
 * → aucune partie de la vente n'est conservée.
 *
 * Cohérence avec db.js :
 * - DB.requeteLecture(sql, params) est SYNCHRONE et renvoie
 *   directement un tableau de résultats (pas de Promise).
 * - DB.transaction(callback) exécute callback(tx) où :
 *      tx.lire(sql, params)   → SYNCHRONE, renvoie un tableau
 *      tx.ecrire(sql, params) → SYNCHRONE, renvoie l'id inséré
 *   DB.transaction se charge du BEGIN / COMMIT / ROLLBACK
 *   et de la sauvegarde IndexedDB après COMMIT.
 * =========================================================
 */

const Ventes = {

    /* =====================================================
       PRODUITS DISPONIBLES POUR LA VENTE
       ===================================================== */

    listerProduitsVendables() {

        return DB.requeteLecture(`
            SELECT
                p.*,
                c.nom AS categorie_nom
            FROM produits p
            JOIN categories c
                ON c.id = p.categorie_id
            WHERE
                p.actif = 1
            ORDER BY
                p.nom COLLATE NOCASE
        `);
    },


    listerUnitesProduit(produitId) {

        return DB.requeteLecture(`
            SELECT *
            FROM unites_vente
            WHERE
                produit_id = ?
                AND actif = 1
            ORDER BY id
        `, [produitId]);
    },


    /* =====================================================
       PRÉPARATION D'UNE LIGNE
       ===================================================== */

    calculerLigne({
        produit_id,
        unite_vente_id,
        quantite
    }) {

        const produit =
            DB.requeteLecture(`
                SELECT *
                FROM produits
                WHERE
                    id = ?
                    AND actif = 1
                LIMIT 1
            `, [produit_id])[0];


        if (!produit) {

            throw new Error(
                "Produit introuvable ou inactif."
            );
        }


        const unite =
            DB.requeteLecture(`
                SELECT *
                FROM unites_vente
                WHERE
                    id = ?
                    AND produit_id = ?
                    AND actif = 1
                LIMIT 1
            `, [
                unite_vente_id,
                produit_id
            ])[0];


        if (!unite) {

            throw new Error(
                "Unité de vente introuvable."
            );
        }


        quantite =
            Number(quantite);


        if (
            !Number.isFinite(quantite)
            ||
            quantite <= 0
        ) {

            throw new Error(
                "La quantité vendue doit être supérieure à zéro."
            );
        }


        const quantiteStockDecrementee =
            quantite *
            Number(
                unite.quantite_en_unite_stock
            );


        if (
            !Number.isFinite(
                quantiteStockDecrementee
            )
            ||
            quantiteStockDecrementee <= 0
        ) {

            throw new Error(
                "La quantité de stock calculée est invalide."
            );
        }


        const stockDisponible =
            Number(
                produit.quantite_en_stock
            ) || 0;


        if (
            quantiteStockDecrementee
            >
            stockDisponible
        ) {

            throw new Error(
                `Stock insuffisant pour "${produit.nom}". Disponible : ${stockDisponible} ${produit.unite_stock}.`
            );
        }


        const prixUnitaire =
            Number(
                unite.prix_vente
            ) || 0;


        const montant =
            quantite *
            prixUnitaire;


        const coutUnitaire =
            Number(
                produit.cout_moyen_actuel
            ) || 0;


        const coutTotal =
            quantiteStockDecrementee *
            coutUnitaire;


        const marge =
            montant -
            coutTotal;


        return {

            produit_id:
                Number(produit_id),

            unite_vente_id:
                Number(unite_vente_id),

            produit_nom:
                produit.nom,

            unite_nom:
                unite.nom_unite,

            quantite,

            quantiteStockDecrementee,

            prixUnitaire,

            montant,

            coutUnitaire,

            coutTotal,

            marge,

            stockAvant:
                stockDisponible,

            stockApres:
                stockDisponible -
                quantiteStockDecrementee
        };
    },


    /* =====================================================
       CRÉER UNE VENTE
       ===================================================== */

    async enregistrerVente({

        date_vente,
        mode_paiement,
        client_id,
        lignes

    }) {

        if (!date_vente) {

            throw new Error(
                "La date de vente est obligatoire."
            );
        }


        mode_paiement =
            String(
                mode_paiement || ''
            ).trim().toLowerCase();


        const modesAcceptes = [
            'comptant',
            'credit'
        ];


        if (
            !modesAcceptes.includes(
                mode_paiement
            )
        ) {

            throw new Error(
                "Le mode de paiement est invalide."
            );
        }


        if (
            !Array.isArray(lignes)
            ||
            lignes.length === 0
        ) {

            throw new Error(
                "La vente doit contenir au moins un produit."
            );
        }


        if (
            mode_paiement === 'credit'
            &&
            !client_id
        ) {

            throw new Error(
                "Un client est obligatoire pour une vente à crédit."
            );
        }


        if (
            mode_paiement === 'comptant'
            &&
            client_id
        ) {

            client_id =
                null;
        }


        /*
         * Vérification du client avant transaction.
         */

        if (client_id) {

            const client =
                DB.requeteLecture(`
                    SELECT *
                    FROM clients
                    WHERE
                        id = ?
                        AND actif = 1
                    LIMIT 1
                `, [client_id])[0];


            if (!client) {

                throw new Error(
                    "Client introuvable ou inactif."
                );
            }
        }


        /*
         * Calcul de toutes les lignes AVANT d'écrire.
         */

        const lignesCalculees = [];

        let montantTotal = 0;

        let coutTotal = 0;

        let margeTotale = 0;


        for (
            const ligne
            of lignes
        ) {

            const calculee =
                this.calculerLigne(
                    ligne
                );


            lignesCalculees.push(
                calculee
            );


            montantTotal +=
                calculee.montant;


            coutTotal +=
                calculee.coutTotal;


            margeTotale +=
                calculee.marge;
        }


        if (
            !Number.isFinite(
                montantTotal
            )
            ||
            montantTotal <= 0
        ) {

            throw new Error(
                "Le montant total de la vente est invalide."
            );
        }


        /*
         * Une seule transaction.
         *
         * DB.transaction gère lui-même BEGIN / COMMIT / ROLLBACK
         * et la sauvegarde IndexedDB (voir db.js).
         * tx.lire et tx.ecrire sont SYNCHRONES.
         */

        return DB.transaction(
            async (tx) => {

                const venteId =
                    tx.ecrire(
                        `
                        INSERT INTO ventes
                        (
                            client_id,
                            date_vente,
                            mode_paiement,
                            montant_total
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        `,
                        [
                            client_id || null,
                            date_vente,
                            mode_paiement,
                            montantTotal
                        ]
                    );


                /*
                 * Enregistrement des lignes
                 * + diminution du stock.
                 */

                for (
                    const ligne
                    of lignesCalculees
                ) {

                    /*
                     * Relecture du stock DANS la transaction.
                     *
                     * Cela évite d'utiliser uniquement le stock
                     * lu avant le début de la transaction.
                     */

                    const produitActuel =
                        tx.lire(
                            `
                            SELECT
                                id,
                                nom,
                                quantite_en_stock,
                                cout_moyen_actuel
                            FROM produits
                            WHERE
                                id = ?
                                AND actif = 1
                            LIMIT 1
                            `,
                            [
                                ligne.produit_id
                            ]
                        )[0];


                    if (!produitActuel) {

                        throw new Error(
                            `Le produit "${ligne.produit_nom}" est introuvable.`
                        );
                    }


                    const stockActuel =
                        Number(
                            produitActuel.quantite_en_stock
                        ) || 0;


                    if (
                        ligne.quantiteStockDecrementee
                        >
                        stockActuel
                    ) {

                        throw new Error(
                            `Stock insuffisant pour "${ligne.produit_nom}". Disponible : ${stockActuel}.`
                        );
                    }


                    const nouveauStock =
                        stockActuel -
                        ligne.quantiteStockDecrementee;


                    tx.ecrire(
                        `
                        INSERT INTO lignes_vente
                        (
                            vente_id,
                            produit_id,
                            unite_vente_id,
                            quantite_vendue,
                            quantite_stock_decrementee,
                            prix_unitaire_applique,
                            montant_ligne,
                            cout_unitaire_au_moment_vente
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
                            venteId,
                            ligne.produit_id,
                            ligne.unite_vente_id,
                            ligne.quantite,
                            ligne.quantiteStockDecrementee,
                            ligne.prixUnitaire,
                            ligne.montant,
                            Number(
                                produitActuel.cout_moyen_actuel
                            ) || 0
                        ]
                    );


                    tx.ecrire(
                        `
                        UPDATE produits
                        SET
                            quantite_en_stock = ?,
                            updated_at = datetime('now')
                        WHERE id = ?
                        `,
                        [
                            nouveauStock,
                            ligne.produit_id
                        ]
                    );
                }


                /*
                 * Vente à crédit :
                 * augmentation de la dette du client.
                 */

                if (
                    mode_paiement === 'credit'
                ) {

                    tx.ecrire(
                        `
                        UPDATE clients
                        SET
                            solde_du =
                                COALESCE(
                                    solde_du,
                                    0
                                )
                                + ?,
                            updated_at =
                                datetime('now')
                        WHERE id = ?
                        `,
                        [
                            montantTotal,
                            client_id
                        ]
                    );
                }


                return {

                    id:
                        venteId,

                    montantTotal,

                    coutTotal,

                    margeTotale,

                    modePaiement:
                        mode_paiement,

                    clientId:
                        client_id || null,

                    lignes:
                        lignesCalculees
                };
            }
        );
    },


    /* =====================================================
       OBTENIR UNE VENTE
       ===================================================== */

    obtenirVente(
        id
    ) {

        const vente =
            DB.requeteLecture(`
                SELECT
                    v.*,
                    c.nom AS client_nom,
                    c.telephone AS client_telephone
                FROM ventes v
                LEFT JOIN clients c
                    ON c.id = v.client_id
                WHERE
                    v.id = ?
                LIMIT 1
            `, [id])[0];


        if (!vente) {
            return null;
        }


        vente.lignes =
            DB.requeteLecture(`
                SELECT
                    lv.*,
                    p.nom AS produit_nom,
                    p.unite_stock,
                    uv.nom_unite
                FROM lignes_vente lv
                JOIN produits p
                    ON p.id = lv.produit_id
                JOIN unites_vente uv
                    ON uv.id = lv.unite_vente_id
                WHERE
                    lv.vente_id = ?
                ORDER BY
                    lv.id
            `, [id]);


        return vente;
    },


    /* =====================================================
       HISTORIQUE DES VENTES
       ===================================================== */

    listerVentes({
        dateDebut = null,
        dateFin = null,
        modePaiement = null,
        clientId = null,
        limite = 200
    } = {}) {

        let sql = `
            SELECT
                v.*,
                c.nom AS client_nom
            FROM ventes v
            LEFT JOIN clients c
                ON c.id = v.client_id
            WHERE 1 = 1
        `;


        const params = [];


        if (dateDebut) {

            sql += `
                AND v.date_vente >= ?
            `;

            params.push(
                dateDebut
            );
        }


        if (dateFin) {

            sql += `
                AND v.date_vente <= ?
            `;

            params.push(
                dateFin
            );
        }


        if (modePaiement) {

            sql += `
                AND v.mode_paiement = ?
            `;

            params.push(
                modePaiement
            );
        }


        if (clientId) {

            sql += `
                AND v.client_id = ?
            `;

            params.push(
                clientId
            );
        }


        limite =
            Number(limite);


        if (
            !Number.isInteger(limite)
            ||
            limite <= 0
        ) {

            limite = 200;
        }


        sql += `
            ORDER BY
                v.date_vente DESC,
                v.id DESC
            LIMIT ${limite}
        `;


        return DB.requeteLecture(
            sql,
            params
        );
    },


    /* =====================================================
       LIGNES DE VENTES
       ===================================================== */

    listerLignesVente(
        venteId
    ) {

        return DB.requeteLecture(`
            SELECT
                lv.*,
                p.nom AS produit_nom,
                p.unite_stock,
                uv.nom_unite
            FROM lignes_vente lv
            JOIN produits p
                ON p.id = lv.produit_id
            JOIN unites_vente uv
                ON uv.id = lv.unite_vente_id
            WHERE
                lv.vente_id = ?
            ORDER BY
                lv.id
        `, [venteId]);
    },


    /* =====================================================
       CHIFFRE D'AFFAIRES
       ===================================================== */

    chiffreAffaires({
        dateDebut = null,
        dateFin = null
    } = {}) {

        let sql = `
            SELECT
                COALESCE(
                    SUM(montant_total),
                    0
                ) AS total
            FROM ventes
            WHERE 1 = 1
        `;


        const params = [];


        if (dateDebut) {

            sql += `
                AND date_vente >= ?
            `;

            params.push(
                dateDebut
            );
        }


        if (dateFin) {

            sql += `
                AND date_vente <= ?
            `;

            params.push(
                dateFin
            );
        }


        const resultat =
            DB.requeteLecture(
                sql,
                params
            );


        return Number(
            resultat[0]?.total
        ) || 0;
    },


    /* =====================================================
       CHIFFRE D'AFFAIRES DU JOUR
       =====================================================
     *
     * Raccourci utilisé par le tableau de bord.
     * Calcule le chiffre d'affaires pour la date du jour
     * uniquement, en se basant sur chiffreAffaires().
     * ===================================================== */

    chiffreAffairesDuJour() {

        const aujourdHui =
            new Date()
                .toISOString()
                .slice(0, 10);


        return this.chiffreAffaires({
            dateDebut: aujourdHui,
            dateFin: aujourdHui
        });
    },


    /* =====================================================
       MARGE
       ===================================================== */

    margeTotale({
        dateDebut = null,
        dateFin = null
    } = {}) {

        let sql = `
            SELECT
                COALESCE(
                    SUM(
                        lv.montant_ligne
                        -
                        (
                            lv.quantite_stock_decrementee
                            *
                            lv.cout_unitaire_au_moment_vente
                        )
                    ),
                    0
                ) AS marge
            FROM lignes_vente lv
            JOIN ventes v
                ON v.id = lv.vente_id
            WHERE 1 = 1
        `;


        const params = [];


        if (dateDebut) {

            sql += `
                AND v.date_vente >= ?
            `;

            params.push(
                dateDebut
            );
        }


        if (dateFin) {

            sql += `
                AND v.date_vente <= ?
            `;

            params.push(
                dateFin
            );
        }


        const resultat =
            DB.requeteLecture(
                sql,
                params
            );


        return Number(
            resultat[0]?.marge
        ) || 0;
    },


    /* =====================================================
       MARGE PAR PRODUIT
       =====================================================
     *
     * Classement des produits par marge RÉELLE générée
     * (basée sur l'historique effectif des ventes, pas
     * une estimation théorique) : pour chaque ligne de
     * vente, marge = montant vendu - (quantité de stock
     * consommée × coût réel au moment de cette vente),
     * exactement la même formule que margeTotale(), mais
     * regroupée par produit.
     *
     * Permet de répondre à : "quel produit rapporte le
     * plus à l'entreprise ?"
     * ===================================================== */

    margeParProduit({
        dateDebut = null,
        dateFin = null
    } = {}) {

        let sql = `
            SELECT
                p.id AS produit_id,
                p.nom AS produit_nom,
                COALESCE(
                    SUM(lv.quantite_vendue),
                    0
                ) AS quantite_vendue,
                COALESCE(
                    SUM(lv.montant_ligne),
                    0
                ) AS chiffre_affaires,
                COALESCE(
                    SUM(
                        lv.quantite_stock_decrementee
                        *
                        lv.cout_unitaire_au_moment_vente
                    ),
                    0
                ) AS cout_total,
                COALESCE(
                    SUM(
                        lv.montant_ligne
                        -
                        (
                            lv.quantite_stock_decrementee
                            *
                            lv.cout_unitaire_au_moment_vente
                        )
                    ),
                    0
                ) AS marge
            FROM lignes_vente lv
            JOIN ventes v
                ON v.id = lv.vente_id
            JOIN produits p
                ON p.id = lv.produit_id
            WHERE 1 = 1
        `;


        const params = [];


        if (dateDebut) {

            sql += `
                AND v.date_vente >= ?
            `;

            params.push(
                dateDebut
            );
        }


        if (dateFin) {

            sql += `
                AND v.date_vente <= ?
            `;

            params.push(
                dateFin
            );
        }


        sql += `
            GROUP BY
                p.id,
                p.nom
            ORDER BY
                marge DESC
        `;


        return DB.requeteLecture(
            sql,
            params
        );
    },


    /* =====================================================
       TOTAL DES CRÉDITS
       ===================================================== */

    totalVentesCredit({
        dateDebut = null,
        dateFin = null
    } = {}) {

        let sql = `
            SELECT
                COALESCE(
                    SUM(montant_total),
                    0
                ) AS total
            FROM ventes
            WHERE
                mode_paiement = 'credit'
        `;


        const params = [];


        if (dateDebut) {

            sql += `
                AND date_vente >= ?
            `;

            params.push(
                dateDebut
            );
        }


        if (dateFin) {

            sql += `
                AND date_vente <= ?
            `;

            /*
             * BUG CORRIGÉ :
             * on poussait auparavant "dateDebut" au lieu de
             * "dateFin", ce qui faussait le filtre de fin de
             * période (les stats de ventes à crédit étaient
             * donc incorrectes dès qu'une dateFin était fournie).
             */
            params.push(
                dateFin
            );
        }


        const resultat =
            DB.requeteLecture(
                sql,
                params
            );


        return Number(
            resultat[0]?.total
        ) || 0;
    },


    /* =====================================================
       STATISTIQUES DES VENTES
       ===================================================== */

    statistiques({
        dateDebut = null,
        dateFin = null
    } = {}) {

        return {

            chiffreAffaires:
                this.chiffreAffaires({
                    dateDebut,
                    dateFin
                }),

            marge:
                this.margeTotale({
                    dateDebut,
                    dateFin
                }),

            ventesCredit:
                this.totalVentesCredit({
                    dateDebut,
                    dateFin
                })
        };
    }
};


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.Ventes = Ventes;
