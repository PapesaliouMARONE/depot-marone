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


    /**
     * Quantité restant à livrer pour une commande précise
     * (quantité commandée moins ce qui a déjà été livré).
     */

    resteALivrer(commandeId) {

        const commande =
            this.obtenirCommande(commandeId);

        if (!commande) {

            return 0;
        }

        const dejaLivre =
            Number(
                DB.requeteLecture(
                    `
                    SELECT
                        COALESCE(
                            SUM(quantite_recue),
                            0
                        ) AS total
                    FROM livraisons_poussins
                    WHERE commande_id = ?
                    `,
                    [commandeId]
                )[0]?.total
            ) || 0;

        const reste =
            Number(commande.quantite_commandee) -
            dejaLivre;

        return reste > 0 ? reste : 0;
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

        if (
            commande_id === null
            ||
            commande_id === undefined
            ||
            commande_id === ''
        ) {

            throw new Error(
                "Une livraison doit obligatoirement être rattachée à une commande."
            );
        }

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

                if (commande.statut === 'ANNULEE') {

                    throw new Error(
                        "Impossible de livrer une commande annulée."
                    );
                }

                /*
                 * On calcule ce qui a DÉJÀ été livré pour
                 * cette commande (livraisons précédentes),
                 * pour vérifier le cumul — pas seulement
                 * cette livraison isolée.
                 */

                const dejaLivre =
                    Number(
                        tx.lire(
                            `
                            SELECT
                                COALESCE(
                                    SUM(quantite_recue),
                                    0
                                ) AS total
                            FROM livraisons_poussins
                            WHERE commande_id = ?
                            `,
                            [commande_id]
                        )[0]?.total
                    ) || 0;

                const quantiteCommandee =
                    Number(
                        commande.quantite_commandee
                    );

                const nouveauTotalLivre =
                    dejaLivre +
                    quantiteRecue;

                if (nouveauTotalLivre > quantiteCommandee) {

                    const reste =
                        quantiteCommandee -
                        dejaLivre;

                    throw new Error(
                        reste > 0
                            ? `Cette livraison dépasse la commande. Il reste ${reste} poussin(s) à livrer sur cette commande.`
                            : "Cette commande a déjà été entièrement livrée."
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
                    nouveauTotalLivre >=
                        quantiteCommandee
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
                        nouveauStatut,

                    totalLivre:
                        nouveauTotalLivre
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

        return DB.transaction(
            async (tx) => {

                /*
                 * Stock réellement disponible = tout ce qui
                 * a été livré (toutes commandes confondues)
                 * moins tout ce qui a déjà été vendu.
                 *
                 * On ne peut pas vendre plus que ce qui a
                 * physiquement été reçu.
                 */

                const totalLivre =
                    Number(
                        tx.lire(
                            `
                            SELECT
                                COALESCE(
                                    SUM(quantite_recue),
                                    0
                                ) AS total
                            FROM livraisons_poussins
                            `
                        )[0]?.total
                    ) || 0;

                const totalVendu =
                    Number(
                        tx.lire(
                            `
                            SELECT
                                COALESCE(
                                    SUM(quantite),
                                    0
                                ) AS total
                            FROM ventes_poussins
                            `
                        )[0]?.total
                    ) || 0;

                const stockDisponible =
                    totalLivre -
                    totalVendu;

                if (quantiteVendue > stockDisponible) {

                    throw new Error(
                        stockDisponible > 0
                            ? `Stock de poussins insuffisant. Il reste seulement ${stockDisponible} poussin(s) disponible(s).`
                            : "Aucun poussin en stock. Enregistrez d'abord une livraison avant de vendre."
                    );
                }

                return tx.ecrire(
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
            }
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


    /**
     * Stock de poussins réellement disponible à la vente :
     * total livré (toutes commandes confondues) moins
     * total déjà vendu.
     */

    stockDisponible() {

        const totalLivre =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(quantite_recue),
                        0
                    ) AS total
                FROM livraisons_poussins
                `
            )[0]?.total;

        const totalVendu =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(quantite),
                        0
                    ) AS total
                FROM ventes_poussins
                `
            )[0]?.total;

        return (
            (Number(totalLivre) || 0)
            -
            (Number(totalVendu) || 0)
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
    },


    /**
     * =====================================================
     * DÉTAIL DU BÉNÉFICE PAR COMMANDE (méthode FIFO)
     * =====================================================
     *
     * Les poussins de différentes commandes sont mélangés
     * physiquement (pas de lien direct vente ↔ commande en
     * base de données). Pour quand même donner un détail
     * par commande, on applique la méthode comptable FIFO
     * ("premier entré, premier sorti") :
     *
     * On suppose que chaque vente consomme en priorité les
     * poussins de la commande livrée la plus ANCIENNE qui a
     * encore du stock disponible, dans l'ordre chronologique
     * des ventes.
     *
     * Pour chaque commande, on obtient ainsi :
     * - quantiteLivree      : total reçu pour cette commande
     * - quantiteVendue      : combien de CE lot a été vendu
     * - quantiteEnStock     : combien de CE lot reste à vendre
     * - montantAchat        : coût total du lot
     * - revenuAlloue        : revenu généré par CE lot
     * - benefice            : revenuAlloue − coût du lot vendu
     *
     * C'est une estimation basée sur l'ordre chronologique,
     * pas un suivi physique réel lot par lot.
     * =====================================================
     */

    calculEconomiqueParCommande() {

        // 1. Les "lots" = livraisons regroupées par commande,
        //    triés du plus ancien au plus récent (FIFO).

        const lots =
            DB.requeteLecture(
                `
                SELECT
                    c.id AS commande_id,
                    c.fournisseur,
                    c.date_commande,
                    c.prix_achat_unitaire,
                    c.statut,
                    COALESCE(
                        SUM(l.quantite_recue),
                        0
                    ) AS quantite_livree,
                    MIN(l.date_livraison) AS premiere_livraison
                FROM commandes_poussins c
                LEFT JOIN livraisons_poussins l
                    ON l.commande_id = c.id
                GROUP BY c.id
                HAVING quantite_livree > 0
                ORDER BY
                    premiere_livraison ASC,
                    c.id ASC
                `
            ).map(lot => ({

                commandeId:
                    lot.commande_id,

                fournisseur:
                    lot.fournisseur,

                dateCommande:
                    lot.date_commande,

                prixAchatUnitaire:
                    Number(lot.prix_achat_unitaire) || 0,

                statut:
                    lot.statut,

                quantiteLivree:
                    Number(lot.quantite_livree) || 0,

                // Quantité de ce lot pas encore allouée
                // à une vente (file FIFO, décrémentée
                // au fil de l'allocation ci-dessous).
                resteDansLot:
                    Number(lot.quantite_livree) || 0,

                quantiteVendue: 0,

                revenuAlloue: 0
            }));

        // 2. Les ventes, triées chronologiquement
        //    (plus ancienne d'abord).

        const ventes =
            DB.requeteLecture(
                `
                SELECT
                    quantite,
                    prix_unitaire,
                    date_vente
                FROM ventes_poussins
                ORDER BY
                    date_vente ASC,
                    id ASC
                `
            );

        // 3. Allocation FIFO : chaque vente consomme les
        //    lots disponibles en commençant par le plus
        //    ancien.

        let indexLot = 0;

        for (const vente of ventes) {

            let quantiteRestanteAAllouer =
                Number(vente.quantite) || 0;

            const prixVenteUnitaire =
                Number(vente.prix_unitaire) || 0;

            while (
                quantiteRestanteAAllouer > 0
                &&
                indexLot < lots.length
            ) {

                const lot =
                    lots[indexLot];

                if (lot.resteDansLot <= 0) {

                    indexLot++;
                    continue;
                }

                const quantitePriseDansCeLot =
                    Math.min(
                        lot.resteDansLot,
                        quantiteRestanteAAllouer
                    );

                lot.resteDansLot -=
                    quantitePriseDansCeLot;

                lot.quantiteVendue +=
                    quantitePriseDansCeLot;

                lot.revenuAlloue +=
                    quantitePriseDansCeLot *
                    prixVenteUnitaire;

                quantiteRestanteAAllouer -=
                    quantitePriseDansCeLot;
            }

            // Si quantiteRestanteAAllouer > 0 ici, ça veut
            // dire qu'une vente historique dépasse le stock
            // livré connu (données antérieures à la mise en
            // place du contrôle de stock) — on l'ignore pour
            // ce détail par commande, elle reste comptée
            // dans le chiffre d'affaires global.
        }

        // 4. Mise en forme finale.

        return lots.map(lot => {

            const coutDuLotVendu =
                lot.quantiteVendue *
                lot.prixAchatUnitaire;

            const coutTotalDuLot =
                lot.quantiteLivree *
                lot.prixAchatUnitaire;

            return {

                commandeId:
                    lot.commandeId,

                fournisseur:
                    lot.fournisseur,

                dateCommande:
                    lot.dateCommande,

                statut:
                    lot.statut,

                prixAchatUnitaire:
                    lot.prixAchatUnitaire,

                quantiteLivree:
                    lot.quantiteLivree,

                quantiteVendue:
                    lot.quantiteVendue,

                quantiteEnStock:
                    lot.resteDansLot,

                montantAchat:
                    coutTotalDuLot,

                revenuAlloue:
                    lot.revenuAlloue,

                benefice:
                    lot.revenuAlloue -
                    coutDuLotVendu
            };
        });
    }
};


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.Poussins = Poussins;
