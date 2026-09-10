/**
 * =========================================================
 * depenses.js — GESTION DES DÉPENSES DU DÉPÔT
 * DÉPÔT & AVICULTURE MARONE
 * =========================================================
 *
 * Utilise la table existante :
 *
 * depenses_depot
 *
 * Colonnes :
 * - id
 * - date_depense
 * - categorie
 * - libelle
 * - montant
 * - observation
 * - created_at
 *
 * IMPORTANT :
 * Ce module ne touche pas aux autres tables.
 * =========================================================
 */


const Depenses = {

    /* =====================================================
       LISTER LES DÉPENSES
       ===================================================== */

    lister() {

        return DB.requeteLecture(`
            SELECT *
            FROM depenses_depot
            ORDER BY
                date_depense DESC,
                id DESC
        `);

    },


    /* =====================================================
       OBTENIR UNE DÉPENSE
       ===================================================== */

    obtenir(id) {

        const resultat =
            DB.requeteLecture(`
                SELECT *
                FROM depenses_depot
                WHERE id = ?
                LIMIT 1
            `, [id]);

        return resultat[0] || null;

    },


    /* =====================================================
       AJOUTER UNE DÉPENSE
       ===================================================== */

    async ajouter({
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
                "Le montant doit être supérieur à zéro."
            );

        }


        return DB.requeteEcriture(`
            INSERT INTO depenses_depot
            (
                date_depense,
                categorie,
                libelle,
                montant,
                observation
            )
            VALUES
            (?, ?, ?, ?, ?)
        `, [
            date_depense,
            categorie,
            libelle,
            montant,
            observation
        ]);

    },


    /* =====================================================
       MODIFIER UNE DÉPENSE
       ===================================================== */

    async modifier(
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
            this.obtenir(id);


        if (!depense) {

            throw new Error(
                "Dépense introuvable."
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
                "La catégorie de la dépense est obligatoire."
            );

        }


        if (
            !Number.isFinite(montant)
            ||
            montant <= 0
        ) {

            throw new Error(
                "Le montant doit être supérieur à zéro."
            );

        }


        await DB.requeteEcriture(`
            UPDATE depenses_depot
            SET
                date_depense = ?,
                categorie = ?,
                libelle = ?,
                montant = ?,
                observation = ?
            WHERE id = ?
        `, [
            date_depense,
            categorie,
            libelle,
            montant,
            observation,
            id
        ]);

    },


    /* =====================================================
       SUPPRIMER UNE DÉPENSE
       ===================================================== */

    async supprimer(id) {

        const depense =
            this.obtenir(id);


        if (!depense) {

            throw new Error(
                "Dépense introuvable."
            );

        }


        await DB.requeteEcriture(`
            DELETE FROM depenses_depot
            WHERE id = ?
        `, [id]);

    },


    /* =====================================================
       TOTAL DES DÉPENSES
       ===================================================== */

    total() {

        const resultat =
            DB.requeteLecture(`
                SELECT
                    COALESCE(
                        SUM(montant),
                        0
                    ) AS total
                FROM depenses_depot
            `);

        return Number(
            resultat[0]?.total || 0
        );

    },


    /* =====================================================
       TOTAL POUR UNE PÉRIODE
       ===================================================== */

    totalPeriode(
        dateDebut,
        dateFin
    ) {

        const resultat =
            DB.requeteLecture(`
                SELECT
                    COALESCE(
                        SUM(montant),
                        0
                    ) AS total
                FROM depenses_depot
                WHERE date_depense >= ?
                  AND date_depense <= ?
            `, [
                dateDebut,
                dateFin
            ]);

        return Number(
            resultat[0]?.total || 0
        );

    }

};


/* =========================================================
   INTERFACE UTILISATEUR
   ========================================================= */


const DepensesUI = {


    /* =====================================================
       CHARGER LA PAGE
       ===================================================== */

    charger() {

        const conteneur =
            document.getElementById(
                'liste-depenses'
            );

        if (!conteneur) return;


        try {

            const depenses =
                Depenses.lister();


            this.mettreAJourStatistiques(
                depenses
            );


            if (!depenses.length) {

                conteneur.innerHTML = `
                    <div class="texte-secondaire"
                         style="padding:20px; text-align:center;">

                        Aucune dépense enregistrée.

                    </div>
                `;

                return;

            }


            conteneur.innerHTML =
                depenses
                    .map(
                        depense =>
                            this.creerCarteDepense(
                                depense
                            )
                    )
                    .join('');


        } catch (erreur) {

            console.error(
                "Erreur chargement dépenses :",
                erreur
            );

            conteneur.innerHTML = `
                <div class="texte-secondaire"
                     style="padding:20px;">

                    Impossible de charger les dépenses.

                </div>
            `;

        }

    },


    /* =====================================================
       STATISTIQUES
       ===================================================== */

    mettreAJourStatistiques(
        depenses
    ) {

        const total =
            depenses.reduce(
                (
                    somme,
                    depense
                ) => {

                    return somme +
                        Number(
                            depense.montant || 0
                        );

                },
                0
            );


        const element =
            document.getElementById(
                'total-depenses'
            );


        if (element) {

            element.textContent =
                this.formaterMontant(
                    total
                );

        }

    },


    /* =====================================================
       CRÉER UNE CARTE DÉPENSE
       ===================================================== */

    creerCarteDepense(
        depense
    ) {

        const id =
            Number(depense.id);


        const date =
            this.formaterDate(
                depense.date_depense
            );


        const montant =
            this.formaterMontant(
                depense.montant
            );


        const categorie =
            this.echapperHTML(
                depense.categorie
            );


        const libelle =
            this.echapperHTML(
                depense.libelle || ''
            );


        const observation =
            this.echapperHTML(
                depense.observation || ''
            );


        return `

            <div class="carte"
                 style="margin-bottom:12px;">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:10px;
                ">

                    <div>

                        <div style="
                            font-weight:800;
                            font-size:16px;
                        ">

                            ${categorie}

                        </div>


                        ${
                            libelle
                                ? `
                                    <div class="texte-secondaire"
                                         style="margin-top:4px;">

                                        ${libelle}

                                    </div>
                                  `
                                : ''
                        }


                        <div class="texte-secondaire"
                             style="margin-top:5px;">

                            ${date}

                        </div>

                    </div>


                    <div style="
                        font-weight:800;
                        font-size:18px;
                        color:#b54a3f;
                        white-space:nowrap;
                    ">

                        ${montant}

                    </div>

                </div>


                ${
                    observation
                        ? `
                            <div style="
                                margin-top:10px;
                                padding-top:10px;
                                border-top:1px solid #eee;
                            ">

                                <div class="texte-secondaire">

                                    ${observation}

                                </div>

                            </div>
                          `
                        : ''
                }


                <div style="
                    display:flex;
                    gap:8px;
                    margin-top:12px;
                ">

                    <button
                        class="btn btn-secondaire"
                        type="button"
                        onclick="DepensesUI.modifier(${id})">

                        Modifier

                    </button>


                    <button
                        class="btn btn-danger"
                        type="button"
                        onclick="DepensesUI.supprimer(${id})">

                        Supprimer

                    </button>

                </div>

            </div>

        `;

    },


    /* =====================================================
       FORMULAIRE
       ===================================================== */

    ouvrirFormulaire(
        id = null
    ) {

        const depense =
            id !== null
                ? Depenses.obtenir(id)
                : null;


        const titre =
            depense
                ? "Modifier la dépense"
                : "Nouvelle dépense";


        const date =
            depense?.date_depense
            ||
            new Date()
                .toISOString()
                .slice(0, 10);


        const categorie =
            depense?.categorie || '';


        const libelle =
            depense?.libelle || '';


        const montant =
            depense?.montant || '';


        const observation =
            depense?.observation || '';


        const contenu =
            document.getElementById(
                'modale-contenu'
            );


        const fond =
            document.getElementById(
                'modale-fond'
            );


        if (!contenu || !fond) {

            alert(
                "La modale de l'application est introuvable."
            );

            return;

        }


        contenu.innerHTML = `

            <div class="modale__entete">

                <span class="modale__titre">

                    ${titre}

                </span>


                <button
                    class="modale__fermer"
                    type="button"
                    onclick="fermerModale()">

                    ✕

                </button>

            </div>


            <form
                onsubmit="DepensesUI.enregistrer(event, ${id === null ? 'null' : id})">


                <div class="champ">

                    <label for="depense-date">

                        Date

                    </label>


                    <input
                        type="date"
                        id="depense-date"
                        value="${this.echapperHTML(date)}"
                        required>

                </div>


                <div class="champ">

                    <label for="depense-categorie">

                        Catégorie

                    </label>


                    <select
                        id="depense-categorie"
                        required>

                        <option value="">

                            Choisir une catégorie

                        </option>


                        <option value="Loyer"
                            ${categorie === 'Loyer' ? 'selected' : ''}>

                            Loyer

                        </option>


                        <option value="Personnel"
                            ${categorie === 'Personnel' ? 'selected' : ''}>

                            Personnel

                        </option>


                        <option value="Transport"
                            ${categorie === 'Transport' ? 'selected' : ''}>

                            Transport

                        </option>


                        <option value="Électricité"
                            ${categorie === 'Électricité' ? 'selected' : ''}>

                            Électricité

                        </option>


                        <option value="Eau"
                            ${categorie === 'Eau' ? 'selected' : ''}>

                            Eau

                        </option>


                        <option value="Entretien"
                            ${categorie === 'Entretien' ? 'selected' : ''}>

                            Entretien

                        </option>


                        <option value="Communication"
                            ${categorie === 'Communication' ? 'selected' : ''}>

                            Communication

                        </option>


                        <option value="Autre"
                            ${categorie === 'Autre' ? 'selected' : ''}>

                            Autre

                        </option>

                    </select>

                </div>


                <div class="champ">

                    <label for="depense-libelle">

                        Libellé

                    </label>


                    <input
                        type="text"
                        id="depense-libelle"
                        value="${this.echapperHTML(libelle)}"
                        placeholder="Ex : Loyer du mois">

                </div>


                <div class="champ">

                    <label for="depense-montant">

                        Montant

                    </label>


                    <input
                        type="number"
                        id="depense-montant"
                        value="${montant}"
                        min="1"
                        step="1"
                        placeholder="Ex : 50000"
                        required>

                </div>


                <div class="champ">

                    <label for="depense-observation">

                        Observation

                    </label>


                    <textarea
                        id="depense-observation"
                        rows="3"
                        placeholder="Observation éventuelle">${this.echapperHTML(observation)}</textarea>

                </div>


                <button
                    type="submit"
                    class="btn btn-principal">

                    ${depense ? 'Enregistrer les modifications' : 'Enregistrer'}

                </button>

            </form>

        `;


        fond.classList.add('actif');

    },


    /* =====================================================
       ENREGISTRER
       ===================================================== */

    async enregistrer(
        event,
        id
    ) {

        event.preventDefault();


        try {

            const donnees = {

                date_depense:
                    document.getElementById(
                        'depense-date'
                    ).value,

                categorie:
                    document.getElementById(
                        'depense-categorie'
                    ).value,

                libelle:
                    document.getElementById(
                        'depense-libelle'
                    ).value,

                montant:
                    document.getElementById(
                        'depense-montant'
                    ).value,

                observation:
                    document.getElementById(
                        'depense-observation'
                    ).value

            };


            if (id === null) {

                await Depenses.ajouter(
                    donnees
                );


                this.notification(
                    "Dépense enregistrée avec succès."
                );

            } else {

                await Depenses.modifier(
                    id,
                    donnees
                );


                this.notification(
                    "Dépense modifiée avec succès."
                );

            }


            fermerModale();


            this.charger();


            this.actualiserTableauDeBord();


        } catch (erreur) {

            console.error(
                erreur
            );


            this.notification(
                erreur.message ||
                "Une erreur est survenue."
            );

        }

    },


    /* =====================================================
       MODIFIER
       ===================================================== */

    modifier(id) {

        this.ouvrirFormulaire(
            id
        );

    },


    /* =====================================================
       SUPPRIMER
       ===================================================== */

    async supprimer(id) {

        const depense =
            Depenses.obtenir(id);


        if (!depense) {

            this.notification(
                "Dépense introuvable."
            );

            return;

        }


        const confirmation =
            confirm(
                `Voulez-vous vraiment supprimer cette dépense de ${this.formaterMontant(depense.montant)} ?`
            );


        if (!confirmation) {

            return;

        }


        try {

            await Depenses.supprimer(
                id
            );


            this.notification(
                "Dépense supprimée."
            );


            this.charger();


            this.actualiserTableauDeBord();


        } catch (erreur) {

            console.error(
                erreur
            );


            this.notification(
                erreur.message ||
                "Impossible de supprimer la dépense."
            );

        }

    },


    /* =====================================================
       ACTUALISER TABLEAU DE BORD
       ===================================================== */

    actualiserTableauDeBord() {

        /*
         * On appelle la fonction existante si elle existe.
         *
         * Cela évite de casser app.js.
         */

        try {

            if (
                typeof mettreAJourTableauDeBord ===
                'function'
            ) {

                mettreAJourTableauDeBord();

            }

        } catch (erreur) {

            console.warn(
                "Actualisation du tableau de bord impossible :",
                erreur
            );

        }

    },


    /* =====================================================
       NOTIFICATION
       ===================================================== */

    notification(
        message
    ) {

        const toast =
            document.getElementById(
                'toast'
            );


        if (!toast) {

            alert(message);

            return;

        }


        toast.textContent =
            message;


        toast.classList.add(
            'visible'
        );


        setTimeout(
            () => {

                toast.classList.remove(
                    'visible'
                );

            },
            2500
        );

    },


    /* =====================================================
       FORMAT MONTANT
       ===================================================== */

    formaterMontant(
        montant
    ) {

        return (
            Number(montant) || 0
        ).toLocaleString(
            'fr-FR'
        ) + ' F';

    },


    /* =====================================================
       FORMAT DATE
       ===================================================== */

    formaterDate(
        date
    ) {

        if (!date) {

            return '';

        }


        const morceaux =
            String(date).split('-');


        if (morceaux.length !== 3) {

            return date;

        }


        return `${morceaux[2]}/${morceaux[1]}/${morceaux[0]}`;

    },


    /* =====================================================
       PROTECTION HTML
       ===================================================== */

    echapperHTML(
        valeur
    ) {

        return String(
            valeur ?? ''
        )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );

    }

};


/* =========================================================
   INITIALISATION
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    async () => {

        /*
         * La base est généralement initialisée
         * par app.js.
         *
         * On attend simplement que DB soit disponible.
         */

        try {

            if (
                typeof initialiserBaseDeDonnees ===
                'function'
            ) {

                await initialiserBaseDeDonnees();

            }

            DepensesUI.charger();

        } catch (erreur) {

            console.error(
                "Initialisation dépenses impossible :",
                erreur
            );

        }

    }
);


/* =========================================================
   FONCTIONS GLOBALES
   ========================================================= */

function ouvrirFormulaireDepense() {

    DepensesUI.ouvrirFormulaire();

}


function ouvrirFormulaireDepenseModification(
    id
) {

    DepensesUI.ouvrirFormulaire(
        id
    );

}