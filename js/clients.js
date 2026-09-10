/**
 * =========================================================
 * clients.js — MODULE CLIENTS
 * DÉPÔT & AVICULTURE MARONE
 * =========================================================
 *
 * Gestion :
 * - liste des clients
 * - ajout / modification
 * - consultation de la dette
 * - enregistrement des paiements
 * - historique client (ventes à crédit + paiements)
 *
 * IMPORTANT — Cohérence avec db.js et ventes.js :
 *
 * Ce module ne délègue PAS à Ventes.xxx() : le module
 * Ventes ne gère que les tables `ventes` / `lignes_vente`
 * (il ne fait que LIRE la table `clients` pour vérifier
 * qu'un client existe avant une vente à crédit).
 *
 * La gestion des clients et des paiements est donc portée
 * ici, directement via DB.requeteLecture / DB.requeteEcriture
 * / DB.transaction — exactement comme le fait ventes.js
 * pour ses propres tables.
 * =========================================================
 */

const Clients = {

    /* =====================================================
       LISTE DES CLIENTS
       ===================================================== */

    lister() {

        return DB.requeteLecture(`
            SELECT *
            FROM clients
            WHERE
                actif = 1
            ORDER BY
                nom COLLATE NOCASE
        `);
    },


    /* =====================================================
       OBTENIR UN CLIENT
       ===================================================== */

    obtenir(id) {

        return DB.requeteLecture(`
            SELECT *
            FROM clients
            WHERE
                id = ?
            LIMIT 1
        `, [id])[0] || null;
    },


    /* =====================================================
       AJOUTER UN CLIENT
       ===================================================== */

    async ajouter(nom, telephone) {

        nom =
            String(nom || '').trim();

        if (!nom) {

            throw new Error(
                "Le nom du client est obligatoire."
            );
        }

        telephone =
            telephone
                ? String(telephone).trim()
                : null;

        return DB.requeteEcriture(`
            INSERT INTO clients
            (
                nom,
                telephone
            )
            VALUES
            (
                ?,
                ?
            )
        `, [
            nom,
            telephone
        ]);
    },


    /* =====================================================
       MODIFIER UN CLIENT
       ===================================================== */

    async modifier(id, nom, telephone) {

        const client =
            this.obtenir(id);

        if (!client) {

            throw new Error(
                "Client introuvable."
            );
        }

        nom =
            String(nom || '').trim();

        if (!nom) {

            throw new Error(
                "Le nom du client est obligatoire."
            );
        }

        telephone =
            telephone
                ? String(telephone).trim()
                : null;

        await DB.requeteEcriture(`
            UPDATE clients
            SET
                nom = ?,
                telephone = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `, [
            nom,
            telephone,
            id
        ]);

        return this.obtenir(id);
    },


    /* =====================================================
       ENREGISTRER UN PAIEMENT
       =====================================================
     *
     * Une seule transaction :
     * - insertion du paiement
     * - diminution de la dette du client
     * ===================================================== */

    async enregistrerPaiement(
        clientId,
        montant,
        datePaiement
    ) {

        montant =
            Number(montant);

        if (
            !Number.isFinite(montant)
            ||
            montant <= 0
        ) {

            throw new Error(
                "Le montant du paiement doit être supérieur à zéro."
            );
        }

        if (!datePaiement) {

            throw new Error(
                "La date de paiement est obligatoire."
            );
        }

        return DB.transaction(
            async (tx) => {

                const client =
                    tx.lire(`
                        SELECT *
                        FROM clients
                        WHERE
                            id = ?
                            AND actif = 1
                        LIMIT 1
                    `, [clientId])[0];


                if (!client) {

                    throw new Error(
                        "Client introuvable ou inactif."
                    );
                }


                const soldeActuel =
                    Number(client.solde_du) || 0;


                if (montant > soldeActuel) {

                    throw new Error(
                        `Le montant dépasse la dette actuelle (${soldeActuel} F).`
                    );
                }


                const nouveauSolde =
                    soldeActuel -
                    montant;


                const paiementId =
                    tx.ecrire(`
                        INSERT INTO paiements_clients
                        (
                            client_id,
                            montant,
                            date_paiement
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?
                        )
                    `, [
                        clientId,
                        montant,
                        datePaiement
                    ]);


                tx.ecrire(`
                    UPDATE clients
                    SET
                        solde_du = ?,
                        updated_at = datetime('now')
                    WHERE id = ?
                `, [
                    nouveauSolde,
                    clientId
                ]);


                return {

                    id:
                        paiementId,

                    clientId,

                    montant,

                    nouveauSolde
                };
            }
        );
    },


    /* =====================================================
       HISTORIQUE D'UN CLIENT
       =====================================================
     *
     * Renvoie { ventes, paiements } pour un client donné.
     * ===================================================== */

    historique(id) {

        const ventes =
            DB.requeteLecture(`
                SELECT *
                FROM ventes
                WHERE
                    client_id = ?
                ORDER BY
                    date_vente DESC,
                    id DESC
            `, [id]);


        const paiements =
            DB.requeteLecture(`
                SELECT *
                FROM paiements_clients
                WHERE
                    client_id = ?
                ORDER BY
                    date_paiement DESC,
                    id DESC
            `, [id]);


        return {
            ventes,
            paiements
        };
    },


    /* =====================================================
       PAIEMENTS D'UN CLIENT
       ===================================================== */

    paiements(id) {

        return DB.requeteLecture(`
            SELECT *
            FROM paiements_clients
            WHERE
                client_id = ?
            ORDER BY
                date_paiement DESC,
                id DESC
        `, [id]);
    },


    /* =====================================================
       TOTAL DES CRÉANCES (toutes les dettes clients)
       ===================================================== */

    totalCreances() {

        const resultat =
            DB.requeteLecture(`
                SELECT
                    COALESCE(
                        SUM(solde_du),
                        0
                    ) AS total
                FROM clients
                WHERE
                    actif = 1
            `);


        return Number(
            resultat[0]?.total
        ) || 0;
    }

};


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.Clients = Clients;