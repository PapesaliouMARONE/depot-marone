/**
 * =========================================================
 * depenses-ui.js
 * INTERFACE DÉPENSES DU DÉPÔT
 * =========================================================
 */

window.DepensesUI = {


    /* =====================================================
       INITIALISATION
    ===================================================== */

    async initialiser() {

        await this.charger();

    },


    /* =====================================================
       CHARGER LES DÉPENSES
    ===================================================== */

    async charger() {

        const liste =
            document.getElementById(
                'liste-depenses'
            );


        if (!liste) return;


        try {

            const filtreElement =
                document.getElementById(
                    'filtre-depenses-date'
                );


            const filtre =
                filtreElement
                    ? filtreElement.value
                    : 'TOUT';


            let depenses =
                await Depenses.lister();


            /* FILTRE */

            if (filtre === 'MOIS') {

                const maintenant =
                    new Date();

                const annee =
                    maintenant.getFullYear();

                const mois =
                    String(
                        maintenant.getMonth() + 1
                    ).padStart(2, '0');


                const prefixe =
                    `${annee}-${mois}`;


                depenses =
                    depenses.filter(
                        depense =>
                            String(
                                depense.date_depense
                            ).startsWith(prefixe)
                    );

            }


            if (filtre === 'ANNEE') {

                const annee =
                    String(
                        new Date()
                            .getFullYear()
                    );


                depenses =
                    depenses.filter(
                        depense =>
                            String(
                                depense.date_depense
                            ).startsWith(annee)
                    );

            }


            this.afficherListe(
                depenses
            );


            this.mettreAJourStatistiques(
                depenses,
                filtre
            );

            this.mettreAJourTableauDeBord();
        } catch (erreur) {

            console.error(
                'Erreur chargement dépenses :',
                erreur
            );


            liste.innerHTML = `

                <div class="texte-secondaire">

                    Impossible de charger les dépenses.

                </div>

            `;

        }

    },


    /* =====================================================
       AFFICHER LA LISTE
    ===================================================== */

    afficherListe(depenses) {

        const liste =
            document.getElementById(
                'liste-depenses'
            );


        if (!liste) return;


        if (!depenses.length) {

            liste.innerHTML = `

                <div
                    class="texte-secondaire"
                    style="padding:20px; text-align:center;"
                >

                    Aucune dépense enregistrée.

                </div>

            `;

            return;

        }


        liste.innerHTML =
            depenses.map(
                depense =>
                    this.creerCarte(depense)
            ).join('');

    },


    /* =====================================================
       CRÉER UNE CARTE DÉPENSE
    ===================================================== */

    creerCarte(depense) {

        const montant =
            this.formatMontant(
                depense.montant
            );


        const date =
            this.formatDate(
                depense.date_depense
            );


        const libelle =
            depense.libelle
                ? this.echapperHTML(
                    depense.libelle
                )
                : 'Sans libellé';


        const categorie =
            this.echapperHTML(
                depense.categorie
            );


        const observation =
            depense.observation
                ? this.echapperHTML(
                    depense.observation
                )
                : '';


        return `

            <div
                class="item-depense"
                style="
                    padding:15px 0;
                    border-bottom:1px solid #e5ddd0;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:flex-start;
                        gap:15px;
                    "
                >

                    <div style="flex:1;">

                        <div
                            style="
                                font-weight:700;
                                font-size:16px;
                                margin-bottom:5px;
                            "
                        >

                            ${libelle}

                        </div>


                        <div
                            class="texte-secondaire"
                            style="font-size:13px;"
                        >

                            ${date}
                            •
                            ${categorie}

                        </div>


                        ${
                            observation
                                ? `
                                    <div
                                        class="texte-secondaire"
                                        style="
                                            margin-top:6px;
                                            font-size:13px;
                                        "
                                    >
                                        ${observation}
                                    </div>
                                  `
                                : ''
                        }

                    </div>


                    <div
                        style="
                            text-align:right;
                            min-width:110px;
                        "
                    >

                        <div
                            style="
                                font-weight:800;
                                color:#b54a3f;
                                margin-bottom:8px;
                            "
                        >

                            ${montant}

                        </div>


                        <div
                            style="
                                display:flex;
                                gap:5px;
                                justify-content:flex-end;
                            "
                        >

                            <button
                                type="button"
                                class="btn-icone"
                                title="Modifier"
                                onclick="
                                    DepensesUI.ouvrirModification(
                                        ${depense.id}
                                    )
                                "
                            >

                                ✎

                            </button>


                            <button
                                type="button"
                                class="btn-icone"
                                title="Supprimer"
                                onclick="
                                    DepensesUI.confirmerSuppression(
                                        ${depense.id}
                                    )
                                "
                                style="
                                    color:#b54a3f;
                                "
                            >

                                🗑

                            </button>

                        </div>

                    </div>

                </div>

            </div>

        `;

    },


    /* =====================================================
       STATISTIQUES
    ===================================================== */

    mettreAJourStatistiques(
        depenses,
        filtre
    ) {

        const total =
            depenses.reduce(
                (
                    somme,
                    depense
                ) =>
                    somme +
                    Number(
                        depense.montant || 0
                    ),
                0
            );


        const elementTotal =
            document.getElementById(
                'stat-depenses-total'
            );


        if (elementTotal) {

            elementTotal.textContent =
                this.formatMontant(total);

        }


        /*
         * Pour le résultat net, on utilise la marge
         * globale du dépôt puis on retire les dépenses
         * du filtre sélectionné.
         */

        const marge =
            Depenses.totalMarge();


        const resultat =
            marge - total;


        const elementResultat =
            document.getElementById(
                'stat-resultat-net'
            );


        if (elementResultat) {

            elementResultat.textContent =
                this.formatMontant(
                    resultat
                );


            elementResultat.style.color =
                resultat >= 0
                    ? 'var(--vert-fonce)'
                    : '#b54a3f';

        }

    },


    /* =====================================================
       OUVRIR FORMULAIRE AJOUT
    ===================================================== */

    ouvrirFormulaire() {

        const aujourdHui =
            new Date()
                .toISOString()
                .split('T')[0];


        this.ouvrirModale(`
            
            <div class="modale__entete">

                <span class="modale__titre">

                    Nouvelle dépense

                </span>

                <button
                    class="modale__fermer"
                    onclick="fermerModale()"
                >
                    ✕
                </button>

            </div>


            <form
                onsubmit="
                    DepensesUI.enregistrer(event)
                "
            >

                <div class="champ">

                    <label>
                        Date
                    </label>

                    <input
                        type="date"
                        id="depense-date"
                        value="${aujourdHui}"
                        required
                    >

                </div>


                <div class="champ">

                    <label>
                        Catégorie
                    </label>

                    <select
                        id="depense-categorie"
                        required
                    >

                        <option value="">
                            -- Choisir une catégorie --
                        </option>

                        <option value="LOYER">
                            Loyer
                        </option>

                        <option value="PERSONNEL">
                            Personnel
                        </option>

                        <option value="ELECTRICITE">
                            Électricité
                        </option>

                        <option value="EAU">
                            Eau
                        </option>

                        <option value="TRANSPORT">
                            Transport
                        </option>

                        <option value="ENTRETIEN">
                            Entretien
                        </option>

                        <option value="COMMUNICATION">
                            Communication
                        </option>

                        <option value="IMPOTS_TAXES">
                            Impôts / Taxes
                        </option>

                        <option value="AUTRES">
                            Autres
                        </option>

                    </select>

                </div>


                <div class="champ">

                    <label>
                        Libellé
                    </label>

                    <input
                        type="text"
                        id="depense-libelle"
                        placeholder="Ex : Loyer du dépôt"
                    >

                </div>


                <div class="champ">

                    <label>
                        Montant
                    </label>

                    <input
                        type="number"
                        id="depense-montant"
                        min="1"
                        step="1"
                        placeholder="Ex : 150000"
                        required
                    >

                </div>


                <div class="champ">

                    <label>
                        Observation
                    </label>

                    <textarea
                        id="depense-observation"
                        rows="3"
                        placeholder="Observation éventuelle"
                    ></textarea>

                </div>


                <button
                    type="submit"
                    class="btn btn-principal"
                >

                    Enregistrer la dépense

                </button>

            </form>

        `);

    },


    /* =====================================================
       ENREGISTRER
    ===================================================== */

    async enregistrer(event) {

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


            await Depenses.ajouter(
                donnees
            );


            fermerModale();


            this.charger();


            this.toast(
                'Dépense enregistrée avec succès.'
            );


        } catch (erreur) {

            console.error(erreur);


            alert(
                erreur.message
                ||
                "Impossible d'enregistrer la dépense."
            );

        }

    },


    /* =====================================================
       MODIFICATION
    ===================================================== */

    ouvrirModification(id) {

        const depense =
            Depenses.obtenir(id);


        if (!depense) {

            alert(
                "Dépense introuvable."
            );

            return;

        }


        this.ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">

                    Modifier la dépense

                </span>

                <button
                    class="modale__fermer"
                    onclick="fermerModale()"
                >
                    ✕
                </button>

            </div>


            <form
                onsubmit="
                    DepensesUI.modifier(
                        event,
                        ${depense.id}
                    )
                "
            >

                <div class="champ">

                    <label>
                        Date
                    </label>

                    <input
                        type="date"
                        id="depense-date"
                        value="${depense.date_depense}"
                        required
                    >

                </div>


                <div class="champ">

                    <label>
                        Catégorie
                    </label>

                    <select
                        id="depense-categorie"
                        required
                    >

                        ${this.optionsCategories(
                            depense.categorie
                        )}

                    </select>

                </div>


                <div class="champ">

                    <label>
                        Libellé
                    </label>

                    <input
                        type="text"
                        id="depense-libelle"
                        value="${this.echapperHTML(
                            depense.libelle || ''
                        )}"
                    >

                </div>


                <div class="champ">

                    <label>
                        Montant
                    </label>

                    <input
                        type="number"
                        id="depense-montant"
                        min="1"
                        step="1"
                        value="${Number(
                            depense.montant || 0
                        )}"
                        required
                    >

                </div>


                <div class="champ">

                    <label>
                        Observation
                    </label>

                    <textarea
                        id="depense-observation"
                        rows="3"
                    >${this.echapperHTML(
                        depense.observation || ''
                    )}</textarea>

                </div>


                <button
                    type="submit"
                    class="btn btn-principal"
                >

                    Enregistrer les modifications

                </button>

            </form>

        `);

    },


    /* =====================================================
       MODIFIER
    ===================================================== */

    async modifier(event, id) {

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


            await Depenses.modifier(
                id,
                donnees
            );


            fermerModale();


            this.charger();


            this.toast(
                'Dépense modifiée avec succès.'
            );


        } catch (erreur) {

            console.error(erreur);


            alert(
                erreur.message
                ||
                "Impossible de modifier la dépense."
            );

        }

    },


    /* =====================================================
       SUPPRESSION
    ===================================================== */

    async confirmerSuppression(id) {

        const depense =
            Depenses.obtenir(id);


        if (!depense) {

            alert(
                "Dépense introuvable."
            );

            return;

        }


        const confirmation =
            confirm(

                `Voulez-vous vraiment supprimer cette dépense ?\n\n`
                +
                `${depense.libelle || depense.categorie}\n`
                +
                `${this.formatMontant(
                    depense.montant
                )}`

            );


        if (!confirmation) {

            return;

        }


        try {

            await Depenses.supprimer(
                id
            );


            await this.charger();


            this.toast(
                'Dépense supprimée.'
            );


        } catch (erreur) {

            console.error(erreur);


            alert(
                "Impossible de supprimer la dépense."
            );

        }

    },


    /* =====================================================
       CATÉGORIES
    ===================================================== */

    optionsCategories(selection = '') {

        const categories = [

            ['LOYER', 'Loyer'],

            ['PERSONNEL', 'Personnel'],

            ['ELECTRICITE', 'Électricité'],

            ['EAU', 'Eau'],

            ['TRANSPORT', 'Transport'],

            ['ENTRETIEN', 'Entretien'],

            ['COMMUNICATION', 'Communication'],

            ['IMPOTS_TAXES', 'Impôts / Taxes'],

            ['AUTRES', 'Autres']

        ];


        return `

            <option value="">
                -- Choisir une catégorie --
            </option>

            ${
                categories.map(
                    categorie => `

                        <option
                            value="${categorie[0]}"
                            ${
                                selection === categorie[0]
                                    ? 'selected'
                                    : ''
                            }
                        >

                            ${categorie[1]}

                        </option>

                    `
                ).join('')
            }

        `;

    },


    /* =====================================================
       OUVRIR MODALE
    ===================================================== */

    ouvrirModale(contenu) {

        const fond =
            document.getElementById(
                'modale-fond'
            );

        const contenuElement =
            document.getElementById(
                'modale-contenu'
            );


        if (!fond || !contenuElement) {

            alert(
                "La modale principale est introuvable."
            );

            return;

        }


        contenuElement.innerHTML =
            contenu;


        fond.classList.add(
            'actif'
        );

    },


    /* =====================================================
       FORMAT MONTANT
    ===================================================== */

    formatMontant(montant) {

        return (
            Number(montant || 0)
                .toLocaleString(
                    'fr-FR'
                )
            + ' F'
        );

    },


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    formatDate(date) {

        if (!date) return '';

        const morceaux =
            String(date).split('-');


        if (morceaux.length !== 3) {

            return date;

        }


        return `
            ${morceaux[2]}/${morceaux[1]}/${morceaux[0]}
        `;

    },


    /* =====================================================
       ÉCHAPPER HTML
    ===================================================== */

    echapperHTML(texte) {

        return String(
            texte ?? ''
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

    },


    /* =====================================================
       NOTIFICATION
    ===================================================== */

    toast(message) {

        const toast =
            document.getElementById(
                'toast'
            );


        if (!toast) {

            return;

        }


        toast.textContent =
            message;


        toast.classList.add(
            'actif'
        );


        setTimeout(() => {

            toast.classList.remove(
                'actif'
            );

        }, 2500);

    }

};
/* =====================================================
   METTRE À JOUR LE RÉSULTAT DU TABLEAU DE BORD
===================================================== */

mettreAJourTableauDeBord() {

    try {

        const marge =
            Depenses.totalMarge();

        const depenses =
            Depenses.total('TOUT');

        const resultat =
            marge - depenses;


        const element =
            document.getElementById(
                'stat-resultat-net-tableau'
            );


        if (!element) return;


        element.textContent =
            this.formatMontant(
                resultat
            );


        element.style.color =
            resultat >= 0
                ? 'var(--vert-fonce)'
                : '#b54a3f';


    } catch (erreur) {

        console.error(
            'Erreur calcul résultat net :',
            erreur
        );

    }

}
document.addEventListener(
    'DOMContentLoaded',
    async () => {

        try {

            await DB.initialiserBaseDeDonnees();

            await DepensesUI.initialiser();

        } catch (erreur) {

            console.error(
                'Erreur initialisation dépenses :',
                erreur
            );

        }

    }
);