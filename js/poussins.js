/**
 * =========================================================
 * poussins.js — ACHAT / REVENTE DE POUSSINS
 * DÉPÔT & AVICULTURE MARONE
 * =========================================================
 *
 * Troisième activité, TOTALEMENT INDÉPENDANTE :
 * - du dépôt (Depot / Ventes)
 * - de l'élevage (Elevage)
 *
 * Ce module ne lit ni n'écrit JAMAIS dans une table d'un
 * autre module.
 *
 * Processus en 3 étapes :
 *
 * 1. COMMANDE  (commandes_poussins)
 *    Ce qui est commandé au fournisseur : quantité, prix
 *    unitaire, montant total, race/type éventuel.
 *
 * 2. LIVRAISON (livraisons_poussins)
 *    Ce qui est effectivement reçu, rattaché à une
 *    commande précise. Peut différer en quantité
 *    (livraison partielle) ou en date.
 *
 * 3. VENTE     (ventes_poussins)
 *    Revente des poussins, comptant ou à crédit (avec
 *    suivi du paiement, indépendant du module Clients
 *    du dépôt — "client" est juste un champ texte ici).
 *
 * IMPORTANT — Pas de stock ni de coût moyen pondéré :
 * le coût d'achat par poussin, le prix de vente moyen et
 * la marge sont calculés GLOBALEMENT sur une période, à
 * partir des commandes et des ventes (pas ligne par ligne,
 * pas de lien entre une vente précise et une commande
 * précise).
 * =========================================================
 */

const Poussins = {

    /* =====================================================
       COMMANDES
       ===================================================== */

    listerCommandes(
        statut = null,
        limite = 200
    ) {

        limite =
            Number(limite);

        if (
            !Number.isInteger(limite)
            ||
            limite <= 0
        ) {

            limite = 200;
        }

        let sql = `
            SELECT *
            FROM commandes_poussins
            WHERE 1 = 1
        `;

        const params = [];

        if (statut) {

            sql += `
                AND statut = ?
            `;

            params.push(statut);
        }

        sql += `
            ORDER BY
                date_commande DESC,
                id DESC
            LIMIT ${limite}
        `;

        return DB.requeteLecture(
            sql,
            params
        );
    },


    obtenirCommande(id) {

        const resultat =
            DB.requeteLecture(
                `
                SELECT *
                FROM commandes_poussins
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        return resultat[0] || null;
    },


    /**
     * =====================================================
     * AJOUTER UNE COMMANDE
     * =====================================================
     *
     * Exemple :
     *
     * 100 poussins (2 cartons de 50) à 500 F/poussin
     * => montant_total = 100 × 500 = 50 000 F
     * =====================================================
     */

    async ajouterCommande({

        fournisseur,
        date_commande,
        date_livraison_prevue,
        quantite_commandee,
        poussins_par_carton,
        prix_achat_unitaire,
        race,
        observation

    }) {

        fournisseur =
            String(
                fournisseur || ''
            ).trim();

        if (!fournisseur) {

            throw new Error(
                "Le fournisseur est obligatoire."
            );
        }

        if (!date_commande) {

            throw new Error(
                "La date de commande est obligatoire."
            );
        }

        const quantiteCommandee =
            Number(quantite_commandee);

        if (
            !Number.isFinite(quantiteCommandee)
            ||
            quantiteCommandee <= 0
        ) {

            throw new Error(
                "La quantité commandée doit être supérieure à zéro."
            );
        }

        const poussinsParCarton =
            poussins_par_carton === null
            || poussins_par_carton === undefined
            || String(poussins_par_carton).trim() === ''
                ? 50
                : Number(poussins_par_carton);

        if (
            !Number.isFinite(poussinsParCarton)
            ||
            poussinsParCarton <= 0
        ) {

            throw new Error(
                "Le nombre de poussins par carton est invalide."
            );
        }

        const prixUnitaireNombre =
            Number(prix_achat_unitaire);

        if (
            !Number.isFinite(prixUnitaireNombre)
            ||
            prixUnitaireNombre <= 0
        ) {

            throw new Error(
                "Le prix d'achat unitaire est invalide."
            );
        }

        const montantTotal =
            quantiteCommandee *
            prixUnitaireNombre;

        race =
            String(
                race || ''
            ).trim();

        observation =
            String(
                observation || ''
            ).trim();

        return DB.requeteEcriture(
            `
            INSERT INTO commandes_poussins
            (
                fournisseur,
                date_commande,
                date_livraison_prevue,
                quantite_commandee,
                poussins_par_carton,
                prix_achat_unitaire,
                montant_total,
                race,
                statut,
                observation
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, 'EN_ATTENTE', ?)
            `,
            [
                fournisseur,
                date_commande,
                date_livraison_prevue || null,
                quantiteCommandee,
                poussinsParCarton,
                prixUnitaireNombre,
                montantTotal,
                race || null,
                observation || null
            ]
        );
    },


    /**
     * Commandes non encore livrées (EN_ATTENTE ou
     * PARTIELLE) ayant une date de livraison prévue
     * renseignée. Utilisé pour l'alerte "à livrer sous
     * X jours" du tableau de bord (voir poussins-ui.js,
     * qui calcule ensuite le retard/l'échéance exacte).
     */

    commandesASurveiller() {

        return DB.requeteLecture(
            `
            SELECT *
            FROM commandes_poussins
            WHERE
                statut IN ('EN_ATTENTE', 'PARTIELLE')
                AND date_livraison_prevue IS NOT NULL
            ORDER BY
                date_livraison_prevue ASC
            `
        );
    },


    async annulerCommande(id) {

        const commande =
            this.obtenirCommande(id);

        if (!commande) {

            throw new Error(
                "Commande introuvable."
            );
        }

        return DB.requeteEcriture(
            `
            UPDATE commandes_poussins
            SET statut = 'ANNULEE'
            WHERE id = ?
            `,
            [id]
        );
    },


    /* =====================================================
       LIVRAISONS
       ===================================================== */

    listerLivraisons(
        commandeId = null
    ) {

        let sql = `
            SELECT
                l.*,
                c.fournisseur AS commande_fournisseur,
                c.date_commande,
                c.quantite_commandee
            FROM livraisons_poussins l
            JOIN commandes_poussins c
                ON c.id = l.commande_id
        `;

        const params = [];

        if (commandeId !== null && commandeId !== undefined) {

            sql += `
                WHERE l.commande_id = ?
            `;

            params.push(commandeId);
        }

        sql += `
            ORDER BY
                l.date_livraison DESC,
                l.id DESC
        `;

        return DB.requeteLecture(
            sql,
            params
        );
    },


    obtenirLivraison(id) {

        const resultat =
            DB.requeteLecture(
                `
                SELECT *
                FROM livraisons_poussins
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        return resultat[0] || null;
    },


    /**
     * =====================================================
     * AJOUTER UNE LIVRAISON
     * =====================================================
     *
     * Rattachée à une commande précise. Met aussi à jour
     * le statut de la commande :
     *   - quantite_recue >= quantite_commandee -> LIVREE
     *   - quantite_recue  < quantite_commandee -> PARTIELLE
     * =====================================================
     */

    async ajouterLivraison({

        commande_id,
        date_livraison,
        quantite_recue,
        fournisseur,
        etat_livraison,
        observation

    }) {

        if (!date_livraison) {

            throw new Error(
                "La date de livraison est obligatoire."
            );
        }

        const quantiteRecue =
            Number(quantite_recue);

        if (
            !Number.isFinite(quantiteRecue)
            ||
            quantiteRecue <= 0
        ) {

            throw new Error(
                "La quantité reçue doit être supérieure à zéro."
            );
        }

        etat_livraison =
            String(
                etat_livraison || 'CONFORME'
            ).trim()
            ||
            'CONFORME';

        fournisseur =
            String(
                fournisseur || ''
            ).trim();

        observation =
            String(
                observation || ''
            ).trim();

        return DB.transaction(
            async (tx) => {

                const commande =
                    tx.lire(
                        `
                        SELECT *
                        FROM commandes_poussins
                        WHERE id = ?
                        LIMIT 1
                        `,
                        [commande_id]
                    )[0];

                if (!commande) {

                    throw new Error(
                        "Commande introuvable."
                    );
                }

                const livraisonId =
                    tx.ecrire(
                        `
                        INSERT INTO livraisons_poussins
                        (
                            commande_id,
                            date_livraison,
                            quantite_recue,
                            fournisseur,
                            etat_livraison,
                            observation
                        )
                        VALUES
                        (?, ?, ?, ?, ?, ?)
                        `,
                        [
                            commande_id,
                            date_livraison,
                            quantiteRecue,
                            fournisseur
                                || commande.fournisseur
                                || null,
                            etat_livraison,
                            observation || null
                        ]
                    );

                const nouveauStatut =
                    quantiteRecue >=
                    Number(commande.quantite_commandee)
                        ? 'LIVREE'
                        : 'PARTIELLE';

                tx.ecrire(
                    `
                    UPDATE commandes_poussins
                    SET statut = ?
                    WHERE id = ?
                    `,
                    [
                        nouveauStatut,
                        commande_id
                    ]
                );

                return {

                    id:
                        livraisonId,

                    statutCommande:
                        nouveauStatut
                };
            }
        );
    },


    /* =====================================================
       VENTES
       ===================================================== */

    listerVentes(
        limite = 200
    ) {

        limite =
            Number(limite);

        if (
            !Number.isInteger(limite)
            ||
            limite <= 0
        ) {

            limite = 200;
        }

        return DB.requeteLecture(
            `
            SELECT *
            FROM ventes_poussins
            ORDER BY
                date_vente DESC,
                id DESC
            LIMIT ${limite}
            `
        );
    },


    obtenirVente(id) {

        const resultat =
            DB.requeteLecture(
                `
                SELECT *
                FROM ventes_poussins
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );

        return resultat[0] || null;
    },


    /**
     * =====================================================
     * AJOUTER UNE VENTE
     * =====================================================
     *
     * mode_paiement : 'comptant' ou 'credit'.
     * - comptant : montant_paye = montant_total, solde = 0.
     * - credit   : montant_paye = ce qui est payé
     *              immédiatement (peut être 0), le reste
     *              devient solde_du, à régler plus tard
     *              via enregistrerPaiement().
     * =====================================================
     */

    async ajouterVente({

        client,
        date_vente,
        quantite,
        prix_unitaire,
        mode_paiement,
        montant_paye,
        observation

    }) {

        if (!date_vente) {

            throw new Error(
                "La date de vente est obligatoire."
            );
        }

        const quantiteVendue =
            Number(quantite);

        if (
            !Number.isFinite(quantiteVendue)
            ||
            quantiteVendue <= 0
        ) {

            throw new Error(
                "La quantité vendue doit être supérieure à zéro."
            );
        }

        const prixUnitaireNombre =
            Number(prix_unitaire);

        if (
            !Number.isFinite(prixUnitaireNombre)
            ||
            prixUnitaireNombre <= 0
        ) {

            throw new Error(
                "Le prix de vente unitaire est invalide."
            );
        }

        mode_paiement =
            String(
                mode_paiement || 'comptant'
            ).trim()
            .toLowerCase();

        if (
            !['comptant', 'credit'].includes(
                mode_paiement
            )
        ) {

            throw new Error(
                "Le mode de paiement est invalide."
            );
        }

        client =
            String(
                client || ''
            ).trim();

        observation =
            String(
                observation || ''
            ).trim();

        const montantTotal =
            quantiteVendue *
            prixUnitaireNombre;

        let montantPayeNombre;

        if (mode_paiement === 'comptant') {

            montantPayeNombre =
                montantTotal;

        } else {

            montantPayeNombre =
                montant_paye === null
                || montant_paye === undefined
                || String(montant_paye).trim() === ''
                    ? 0
                    : Number(montant_paye);

            if (
                !Number.isFinite(montantPayeNombre)
                ||
                montantPayeNombre < 0
            ) {

                throw new Error(
                    "Le montant payé est invalide."
                );
            }

            if (montantPayeNombre > montantTotal) {

                throw new Error(
                    "Le montant payé ne peut pas dépasser le montant total."
                );
            }
        }

        const soldeDu =
            montantTotal -
            montantPayeNombre;

        return DB.requeteEcriture(
            `
            INSERT INTO ventes_poussins
            (
                client,
                date_vente,
                quantite,
                prix_unitaire,
                montant_total,
                mode_paiement,
                montant_paye,
                solde_du,
                observation
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                client || null,
                date_vente,
                quantiteVendue,
                prixUnitaireNombre,
                montantTotal,
                mode_paiement,
                montantPayeNombre,
                soldeDu,
                observation || null
            ]
        );
    },


    /**
     * Enregistre un paiement supplémentaire sur une vente
     * à crédit (encaissement ultérieur du solde restant).
     */

    async enregistrerPaiement(
        venteId,
        montant
    ) {

        const montantNombre =
            Number(montant);

        if (
            !Number.isFinite(montantNombre)
            ||
            montantNombre <= 0
        ) {

            throw new Error(
                "Le montant du paiement doit être supérieur à zéro."
            );
        }

        return DB.transaction(
            async (tx) => {

                const vente =
                    tx.lire(
                        `
                        SELECT *
                        FROM ventes_poussins
                        WHERE id = ?
                        LIMIT 1
                        `,
                        [venteId]
                    )[0];

                if (!vente) {

                    throw new Error(
                        "Vente introuvable."
                    );
                }

                const soldeActuel =
                    Number(vente.solde_du) || 0;

                if (montantNombre > soldeActuel) {

                    throw new Error(
                        `Le paiement dépasse le solde dû (${soldeActuel} F).`
                    );
                }

                const nouveauMontantPaye =
                    Number(vente.montant_paye)
                    +
                    montantNombre;

                const nouveauSolde =
                    soldeActuel -
                    montantNombre;

                tx.ecrire(
                    `
                    UPDATE ventes_poussins
                    SET
                        montant_paye = ?,
                        solde_du = ?
                    WHERE id = ?
                    `,
                    [
                        nouveauMontantPaye,
                        nouveauSolde,
                        venteId
                    ]
                );

                return {

                    venteId,

                    nouveauMontantPaye,

                    nouveauSolde
                };
            }
        );
    },


    /* =====================================================
       CALCULS ÉCONOMIQUES (globaux, sur une période)
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
            FROM ventes_poussins
            WHERE 1 = 1
        `;

        const params = [];

        if (dateDebut) {

            sql += ` AND date_vente >= ? `;
            params.push(dateDebut);
        }

        if (dateFin) {

            sql += ` AND date_vente <= ? `;
            params.push(dateFin);
        }

        const resultat =
            DB.requeteLecture(sql, params);

        return Number(
            resultat[0]?.total
        ) || 0;
    },


    totalAchats({
        dateDebut = null,
        dateFin = null
    } = {}) {

        let sql = `
            SELECT
                COALESCE(
                    SUM(montant_total),
                    0
                ) AS total,
                COALESCE(
                    SUM(quantite_commandee),
                    0
                ) AS quantite
            FROM commandes_poussins
            WHERE
                statut <> 'ANNULEE'
        `;

        const params = [];

        if (dateDebut) {

            sql += ` AND date_commande >= ? `;
            params.push(dateDebut);
        }

        if (dateFin) {

            sql += ` AND date_commande <= ? `;
            params.push(dateFin);
        }

        const resultat =
            DB.requeteLecture(sql, params);

        return {

            montant:
                Number(
                    resultat[0]?.total
                ) || 0,

            quantite:
                Number(
                    resultat[0]?.quantite
                ) || 0
        };
    },


    totalVentesQuantite({
        dateDebut = null,
        dateFin = null
    } = {}) {

        let sql = `
            SELECT
                COALESCE(
                    SUM(quantite),
                    0
                ) AS quantite
            FROM ventes_poussins
            WHERE 1 = 1
        `;

        const params = [];

        if (dateDebut) {

            sql += ` AND date_vente >= ? `;
            params.push(dateDebut);
        }

        if (dateFin) {

            sql += ` AND date_vente <= ? `;
            params.push(dateFin);
        }

        const resultat =
            DB.requeteLecture(sql, params);

        return Number(
            resultat[0]?.quantite
        ) || 0;
    },


    totalCreances() {

        const resultat =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(solde_du),
                        0
                    ) AS total
                FROM ventes_poussins
                WHERE mode_paiement = 'credit'
                `
            );

        return Number(
            resultat[0]?.total
        ) || 0;
    },


    /**
     * Calcul économique complet sur une période :
     * - coût d'achat moyen par poussin (commandes)
     * - prix de vente moyen par poussin (ventes)
     * - marge moyenne par poussin
     * - chiffre d'affaires
     * - résultat de l'activité (CA - total achats)
     */

    calculEconomique({
        dateDebut = null,
        dateFin = null
    } = {}) {

        const achats =
            this.totalAchats({
                dateDebut,
                dateFin
            });

        const ca =
            this.chiffreAffaires({
                dateDebut,
                dateFin
            });

        const quantiteVendue =
            this.totalVentesQuantite({
                dateDebut,
                dateFin
            });

        const coutAchatParPoussin =
            achats.quantite > 0
                ? achats.montant / achats.quantite
                : 0;

        const prixVenteParPoussin =
            quantiteVendue > 0
                ? ca / quantiteVendue
                : 0;

        const margeParPoussin =
            prixVenteParPoussin -
            coutAchatParPoussin;

        const resultat =
            ca -
            achats.montant;

        return {

            coutAchatParPoussin,

            prixVenteParPoussin,

            margeParPoussin,

            chiffreAffaires:
                ca,

            totalAchats:
                achats.montant,

            resultat,

            creancesEnCours:
                this.totalCreances()
        };
    }
};


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.Poussins = Poussins;
