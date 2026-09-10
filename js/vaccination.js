/**
 * =========================================================
 * vaccination.js — Gestion des vaccinations des bandes
 * =========================================================
 *
 * Gestion :
 *   - programmes de vaccination par bande
 *   - date prévue
 *   - rappel
 *   - date réelle de vaccination
 *   - statut
 *   - produit / vaccin utilisé
 *   - dose
 *   - coût
 *   - observations
 *   - vaccinations à venir
 *   - vaccinations en retard
 *
 * IMPORTANT :
 * Chaque vaccination appartient à UNE bande.
 *
 * Deux bandes ayant des dates de départ différentes
 * peuvent donc avoir des calendriers complètement différents.
 *
 * COHÉRENCE AVEC db.js :
 * - La colonne réelle pour la date réelle de vaccination
 *   est `vaccinations.date_effective` (pas `date_effectuee`).
 * - Les colonnes `maladie`, `dose`, `unite_dose`,
 *   `voie_administration`, `fournisseur`, `numero_lot`,
 *   `cout` sont ajoutées via migration dans db.js, en plus
 *   de celles déjà prévues dans le CREATE TABLE d'origine.
 * =========================================================
 */

const Vaccination = {

    /* =====================================================
       STATUTS
       ===================================================== */

    STATUTS: {
        PREVU: 'PREVU',
        EFFECTUE: 'EFFECTUE',
        EN_RETARD: 'EN_RETARD',
        ANNULE: 'ANNULE'
    },


    /* =====================================================
       LISTE DES VACCINATIONS
       ===================================================== */

    listerVaccinations(bandeId = null) {

        let sql = `
            SELECT
                v.*,
                b.code AS bande_code,
                b.nom AS bande_nom
            FROM vaccinations v
            JOIN bandes b
                ON b.id = v.bande_id
        `;

        const params = [];

        if (bandeId !== null && bandeId !== undefined) {

            sql += `
                WHERE v.bande_id = ?
            `;

            params.push(bandeId);
        }

        sql += `
            ORDER BY
                v.date_prevue ASC,
                v.id ASC
        `;

        return DB.requeteLecture(
            sql,
            params
        );
    },


    listerVaccinationsBande(bandeId) {

        return this.listerVaccinations(
            bandeId
        );
    },


    obtenirVaccination(id) {

        const resultats =
            DB.requeteLecture(
                `
                SELECT
                    v.*,
                    b.code AS bande_code,
                    b.nom AS bande_nom
                FROM vaccinations v
                JOIN bandes b
                    ON b.id = v.bande_id
                WHERE v.id = ?
                LIMIT 1
                `,
                [id]
            );

        return resultats[0] || null;
    },


    /* =====================================================
       AJOUTER UNE VACCINATION
       ===================================================== */

    async ajouterVaccination({

        bande_id,
        nom_vaccin,
        maladie,
        date_prevue,
        date_rappel,
        dose,
        unite_dose,
        voie_administration,
        fournisseur,
        numero_lot,
        cout,
        observation

    }) {

        const bande =
            Elevage.obtenirBande(
                bande_id
            );


        if (!bande) {

            throw new Error(
                "Bande introuvable."
            );
        }


        nom_vaccin =
            String(
                nom_vaccin || ''
            ).trim();


        maladie =
            String(
                maladie || ''
            ).trim();


        voie_administration =
            String(
                voie_administration || ''
            ).trim();


        fournisseur =
            String(
                fournisseur || ''
            ).trim();


        numero_lot =
            String(
                numero_lot || ''
            ).trim();


        observation =
            String(
                observation || ''
            ).trim();


        if (!nom_vaccin) {

            throw new Error(
                "Le nom du vaccin est obligatoire."
            );
        }


        if (!date_prevue) {

            throw new Error(
                "La date prévue est obligatoire."
            );
        }


        if (
            String(date_prevue)
            <
            String(bande.date_depart)
        ) {

            throw new Error(
                "La date prévue ne peut pas être antérieure à la date de départ de la bande."
            );
        }


        if (
            date_rappel
            &&
            String(date_rappel)
            <
            String(date_prevue)
        ) {

            throw new Error(
                "La date de rappel ne peut pas être antérieure à la date prévue."
            );
        }


        const doseNombre =
            dose === null
            || dose === undefined
            || String(dose).trim() === ''
                ? null
                : Number(dose);


        if (
            doseNombre !== null
            &&
            (
                !Number.isFinite(doseNombre)
                ||
                doseNombre <= 0
            )
        ) {

            throw new Error(
                "La dose doit être supérieure à zéro."
            );
        }


        const coutNombre =
            cout === null
            || cout === undefined
            || String(cout).trim() === ''
                ? 0
                : Number(cout);


        if (
            !Number.isFinite(coutNombre)
            ||
            coutNombre < 0
        ) {

            throw new Error(
                "Le coût du vaccin est invalide."
            );
        }


        /*
         * Si aucun rappel n'est indiqué,
         * la vaccination reste simplement prévue.
         *
         * NOTE : la colonne réelle pour la date réelle
         * de vaccination est `date_effective` (et non
         * `date_effectuee`) — voir schéma dans db.js.
         */

        return DB.requeteEcriture(
            `
            INSERT INTO vaccinations
            (
                bande_id,
                nom_vaccin,
                maladie,
                date_prevue,
                date_rappel,
                date_effective,
                dose,
                unite_dose,
                voie_administration,
                fournisseur,
                numero_lot,
                cout,
                statut,
                observation
            )
            VALUES
            (
                ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'PREVU', ?
            )
            `,
            [
                bande_id,
                nom_vaccin,
                maladie || null,
                date_prevue,
                date_rappel || null,
                doseNombre,
                unite_dose || null,
                voie_administration || null,
                fournisseur || null,
                numero_lot || null,
                coutNombre,
                observation || null
            ]
        );
    },


    /* =====================================================
       MODIFIER UNE VACCINATION
       ===================================================== */

    async modifierVaccination(
        id,
        {

            nom_vaccin,
            maladie,
            date_prevue,
            date_rappel,
            dose,
            unite_dose,
            voie_administration,
            fournisseur,
            numero_lot,
            cout,
            observation

        }
    ) {

        const vaccination =
            this.obtenirVaccination(
                id
            );


        if (!vaccination) {

            throw new Error(
                "Vaccination introuvable."
            );
        }


        const bande =
            Elevage.obtenirBande(
                vaccination.bande_id
            );


        if (!bande) {

            throw new Error(
                "Bande associée introuvable."
            );
        }


        nom_vaccin =
            String(
                nom_vaccin || ''
            ).trim();


        maladie =
            String(
                maladie || ''
            ).trim();


        voie_administration =
            String(
                voie_administration || ''
            ).trim();


        fournisseur =
            String(
                fournisseur || ''
            ).trim();


        numero_lot =
            String(
                numero_lot || ''
            ).trim();


        observation =
            String(
                observation || ''
            ).trim();


        if (!nom_vaccin) {

            throw new Error(
                "Le nom du vaccin est obligatoire."
            );
        }


        if (!date_prevue) {

            throw new Error(
                "La date prévue est obligatoire."
            );
        }


        if (
            String(date_prevue)
            <
            String(bande.date_depart)
        ) {

            throw new Error(
                "La date prévue ne peut pas être antérieure à la date de départ de la bande."
            );
        }


        if (
            date_rappel
            &&
            String(date_rappel)
            <
            String(date_prevue)
        ) {

            throw new Error(
                "La date de rappel ne peut pas être antérieure à la date prévue."
            );
        }


        const doseNombre =
            dose === null
            || dose === undefined
            || String(dose).trim() === ''
                ? null
                : Number(dose);


        if (
            doseNombre !== null
            &&
            (
                !Number.isFinite(doseNombre)
                ||
                doseNombre <= 0
            )
        ) {

            throw new Error(
                "La dose est invalide."
            );
        }


        const coutNombre =
            cout === null
            || cout === undefined
            || String(cout).trim() === ''
                ? 0
                : Number(cout);


        if (
            !Number.isFinite(coutNombre)
            ||
            coutNombre < 0
        ) {

            throw new Error(
                "Le coût est invalide."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE vaccinations
            SET
                nom_vaccin = ?,
                maladie = ?,
                date_prevue = ?,
                date_rappel = ?,
                dose = ?,
                unite_dose = ?,
                voie_administration = ?,
                fournisseur = ?,
                numero_lot = ?,
                cout = ?,
                observation = ?,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                nom_vaccin,
                maladie || null,
                date_prevue,
                date_rappel || null,
                doseNombre,
                unite_dose || null,
                voie_administration || null,
                fournisseur || null,
                numero_lot || null,
                coutNombre,
                observation || null,
                id
            ]
        );
    },


    /* =====================================================
       MARQUER COMME EFFECTUÉ
       ===================================================== */

    async enregistrerVaccination({

        id,
        date_effectuee,
        observation

    }) {

        const vaccination =
            this.obtenirVaccination(
                id
            );


        if (!vaccination) {

            throw new Error(
                "Vaccination introuvable."
            );
        }


        if (!date_effectuee) {

            throw new Error(
                "La date de vaccination est obligatoire."
            );
        }


        if (
            String(date_effectuee)
            <
            String(
                vaccination.date_prevue
            )
        ) {

            /*
             * Une vaccination peut techniquement
             * être effectuée avant la date prévue.
             * On ne bloque donc pas l'opération.
             *
             * Cette information sera simplement conservée.
             */
        }


        observation =
            String(
                observation || ''
            ).trim();


        /*
         * NOTE : le paramètre de la fonction s'appelle
         * `date_effectuee` (nom "métier" plus naturel côté
         * appelant), mais la colonne réelle en base est
         * `date_effective` — voir schéma dans db.js.
         */

        return DB.requeteEcriture(
            `
            UPDATE vaccinations
            SET
                date_effective = ?,
                statut = 'EFFECTUE',
                observation = ?,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                date_effectuee,
                observation || vaccination.observation || null,
                id
            ]
        );
    },


    /* =====================================================
       ANNULER UNE VACCINATION
       ===================================================== */

    async annulerVaccination(
        id,
        raison = ''
    ) {

        const vaccination =
            this.obtenirVaccination(
                id
            );


        if (!vaccination) {

            throw new Error(
                "Vaccination introuvable."
            );
        }


        if (
            vaccination.statut ===
            'EFFECTUE'
        ) {

            throw new Error(
                "Une vaccination déjà effectuée ne peut pas être annulée."
            );
        }


        raison =
            String(
                raison || ''
            ).trim();


        return DB.requeteEcriture(
            `
            UPDATE vaccinations
            SET
                statut = 'ANNULE',
                observation = ?,
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [
                raison || vaccination.observation || null,
                id
            ]
        );
    },


    /* =====================================================
       RÉACTIVER UNE VACCINATION ANNULÉE
       ===================================================== */

    async reactiverVaccination(
        id
    ) {

        const vaccination =
            this.obtenirVaccination(
                id
            );


        if (!vaccination) {

            throw new Error(
                "Vaccination introuvable."
            );
        }


        if (
            vaccination.statut !==
            'ANNULE'
        ) {

            throw new Error(
                "Cette vaccination n'est pas annulée."
            );
        }


        return DB.requeteEcriture(
            `
            UPDATE vaccinations
            SET
                statut = 'PREVU',
                updated_at = datetime('now')
            WHERE id = ?
            `,
            [id]
        );
    },


    /* =====================================================
       VACCINATIONS À VENIR
       ===================================================== */

    vaccinationsAVenir(
        jours = 7,
        bandeId = null
    ) {

        jours =
            Number(jours);


        if (
            !Number.isFinite(jours)
            ||
            jours < 0
        ) {

            jours = 7;
        }


        /*
         * SQLite utilise ici les dates ISO :
         * YYYY-MM-DD
         */

        let sql = `
            SELECT
                v.*,
                b.code AS bande_code,
                b.nom AS bande_nom
            FROM vaccinations v
            JOIN bandes b
                ON b.id = v.bande_id
            WHERE
                v.statut = 'PREVU'
                AND date(v.date_prevue)
                    BETWEEN
                        date('now')
                        AND
                        date(
                            'now',
                            '+' || ? || ' days'
                        )
        `;


        const params = [
            jours
        ];


        if (
            bandeId !== null
            &&
            bandeId !== undefined
        ) {

            sql += `
                AND v.bande_id = ?
            `;

            params.push(
                bandeId
            );
        }


        sql += `
            ORDER BY
                v.date_prevue ASC,
                v.id ASC
        `;


        return DB.requeteLecture(
            sql,
            params
        );
    },


    /* =====================================================
       VACCINATIONS EN RETARD
       ===================================================== */

    vaccinationsEnRetard(
        bandeId = null
    ) {

        let sql = `
            SELECT
                v.*,
                b.code AS bande_code,
                b.nom AS bande_nom
            FROM vaccinations v
            JOIN bandes b
                ON b.id = v.bande_id
            WHERE
                (
                    v.statut = 'PREVU'
                    OR v.statut = 'EN_RETARD'
                )
                AND date(v.date_prevue)
                    < date('now')
        `;


        const params = [];


        if (
            bandeId !== null
            &&
            bandeId !== undefined
        ) {

            sql += `
                AND v.bande_id = ?
            `;

            params.push(
                bandeId
            );
        }


        sql += `
            ORDER BY
                v.date_prevue ASC,
                v.id ASC
        `;


        return DB.requeteLecture(
            sql,
            params
        );
    },


    /* =====================================================
       RAPPELS
       ===================================================== */

    rappelsAVenir(
        jours = 7,
        bandeId = null
    ) {

        jours =
            Number(jours);


        if (
            !Number.isFinite(jours)
            ||
            jours < 0
        ) {

            jours = 7;
        }


        let sql = `
            SELECT
                v.*,
                b.code AS bande_code,
                b.nom AS bande_nom
            FROM vaccinations v
            JOIN bandes b
                ON b.id = v.bande_id
            WHERE
                v.date_rappel IS NOT NULL
                AND v.statut = 'EFFECTUE'
                AND date(v.date_rappel)
                    BETWEEN
                        date('now')
                        AND
                        date(
                            'now',
                            '+' || ? || ' days'
                        )
        `;


        const params = [
            jours
        ];


        if (
            bandeId !== null
            &&
            bandeId !== undefined
        ) {

            sql += `
                AND v.bande_id = ?
            `;

            params.push(
                bandeId
            );
        }


        sql += `
            ORDER BY
                v.date_rappel ASC,
                v.id ASC
        `;


        return DB.requeteLecture(
            sql,
            params
        );
    },


    rappelsEnRetard(
        bandeId = null
    ) {

        let sql = `
            SELECT
                v.*,
                b.code AS bande_code,
                b.nom AS bande_nom
            FROM vaccinations v
            JOIN bandes b
                ON b.id = v.bande_id
            WHERE
                v.date_rappel IS NOT NULL
                AND v.statut = 'EFFECTUE'
                AND date(v.date_rappel)
                    < date('now')
        `;


        const params = [];


        if (
            bandeId !== null
            &&
            bandeId !== undefined
        ) {

            sql += `
                AND v.bande_id = ?
            `;

            params.push(
                bandeId
            );
        }


        sql += `
            ORDER BY
                v.date_rappel ASC,
                v.id ASC
        `;


        return DB.requeteLecture(
            sql,
            params
        );
    },


    /* =====================================================
       ACTUALISER LES STATUTS EN RETARD
       ===================================================== */

    async actualiserStatuts() {

        /*
         * Une vaccination prévue dont la date est dépassée
         * passe automatiquement à EN_RETARD.
         *
         * Les vaccinations effectuées ou annulées
         * ne sont jamais modifiées.
         */

        return DB.requeteEcriture(
            `
            UPDATE vaccinations
            SET
                statut = 'EN_RETARD',
                updated_at = datetime('now')
            WHERE
                statut = 'PREVU'
                AND date(date_prevue)
                    < date('now')
            `
        );
    },


    /* =====================================================
       TABLEAU DE BORD VACCINATION
       ===================================================== */

    statistiques(
        bandeId = null
    ) {

        let condition = '';
        const params = [];


        if (
            bandeId !== null
            &&
            bandeId !== undefined
        ) {

            condition =
                'WHERE bande_id = ?';

            params.push(
                bandeId
            );
        }


        const total =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM vaccinations
                ${condition}
                `,
                params
            );


        const effectuees =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM vaccinations
                ${condition}
                ${condition ? 'AND' : 'WHERE'}
                statut = 'EFFECTUE'
                `,
                params
            );


        const prevues =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM vaccinations
                ${condition}
                ${condition ? 'AND' : 'WHERE'}
                statut = 'PREVU'
                `,
                params
            );


        const retards =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM vaccinations
                ${condition}
                ${condition ? 'AND' : 'WHERE'}
                statut = 'EN_RETARD'
                `,
                params
            );


        const annulees =
            DB.requeteLecture(
                `
                SELECT
                    COUNT(*) AS total
                FROM vaccinations
                ${condition}
                ${condition ? 'AND' : 'WHERE'}
                statut = 'ANNULE'
                `,
                params
            );


        const cout =
            DB.requeteLecture(
                `
                SELECT
                    COALESCE(
                        SUM(cout),
                        0
                    ) AS total
                FROM vaccinations
                ${condition}
                `,
                params
            );


        return {

            total:
                Number(
                    total[0]?.total
                ) || 0,

            effectuees:
                Number(
                    effectuees[0]?.total
                ) || 0,

            prevues:
                Number(
                    prevues[0]?.total
                ) || 0,

            retards:
                Number(
                    retards[0]?.total
                ) || 0,

            annulees:
                Number(
                    annulees[0]?.total
                ) || 0,

            cout_total:
                Number(
                    cout[0]?.total
                ) || 0
        };
    }
};


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.Vaccination = Vaccination;
