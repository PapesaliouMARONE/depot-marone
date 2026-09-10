/**
 * =========================================================
 * elevage-ui.js
 * Interface utilisateur de la gestion des bandes
 * =========================================================
 */

/*
 * Protection contre un double chargement du fichier
 * (cache, balise script en double, etc.) : si
 * window.ElevageUI existe déjà, on ne le redéfinit
 * pas — ça évite tout plantage "already declared".
 */
window.ElevageUI = window.ElevageUI || {

    bandeEnModification: null,


    /* =====================================================
       INITIALISATION
    ===================================================== */

    initialiser() {

        this.chargerBandes();

    },


    /* =====================================================
       CHARGER LES BANDES
    ===================================================== */

    chargerBandes() {

        try {

            const select =
                document.getElementById(
                    'filtre-statut-bandes'
                );

            const statut =
                select
                    ? select.value
                    : '';

            const bandes =
                Elevage.listerBandes(
                    statut || null
                );

            this.afficherBandes(
                bandes
            );

            this.actualiserStatistiques(
                bandes
            );

        } catch (erreur) {

            console.error(
                erreur
            );

            this.afficherErreur(
                erreur.message
            );
        }
    },


    /* =====================================================
       AFFICHER LES BANDES
    ===================================================== */

    afficherBandes(bandes) {

        const conteneur =
            document.getElementById(
                'liste-bandes'
            );

        if (!conteneur) {
            return;
        }


        if (!bandes || bandes.length === 0) {

            conteneur.innerHTML = `

                <div class="etat-vide">

                    <p>
                        Aucune bande enregistrée.
                    </p>

                </div>

            `;

            return;
        }


        conteneur.innerHTML =
            bandes
                .map(
                    bande =>
                        this.creerCarteBande(
                            bande
                        )
                )
                .join('');
    },


    /* =====================================================
       CARTE D'UNE BANDE
    ===================================================== */

    creerCarteBande(bande) {

        const enCours =
            bande.statut === 'EN_COURS';


        const statutClasse =
            enCours
                ? 'badge-ok'
                : 'badge-or';


        const statutTexte =
            enCours
                ? 'En cours'
                : 'Terminée';


        const effectif =
            Number(
                bande.effectif_actuel
            ) || 0;


        const initial =
            Number(
                bande.effectif_initial
            ) || 0;


        const mortalite =
            Number(
                bande.mortalite_totale
            ) || 0;


        const sortie =
            Number(
                bande.quantite_sortie
            ) || 0;


        return `

            <div class="liste-item">

                <div class="liste-item__info">

                    <div class="liste-item__nom">

                        ${this.echapper(
                            bande.code
                        )}

                        ${
                            bande.nom
                                ? `
                                    — ${this.echapper(
                                        bande.nom
                                    )}
                                  `
                                : ''
                        }

                    </div>


                    <div class="liste-item__meta">

                        ${this.echapper(
                            bande.type_volaille || 'Volaille'
                        )}

                        ·

                        ${effectif} / ${initial}

                        sujets

                    </div>


                    <div class="liste-item__meta">

                        Mortalité :
                        ${mortalite}

                        ·

                        Sorties :
                        ${sortie}

                    </div>

                </div>


                <div>

                    <span class="badge ${statutClasse}">
                        ${statutTexte}
                    </span>


                    <div
                        class="liste-item__actions"
                        style="margin-top:6px;"
                    >

                        <button
                            type="button"
                            class="btn btn-icone"
                            title="Voir"
                            onclick="ElevageUI.voirBande(${bande.id})"
                        >
                            👁
                        </button>


                        <button
                            type="button"
                            class="btn btn-icone"
                            title="Modifier"
                            onclick="ElevageUI.modifierBande(${bande.id})"
                        >
                            ✏
                        </button>

                    </div>

                </div>

            </div>

        `;
    },


    /* =====================================================
       NOUVELLE BANDE
    ===================================================== */

    ouvrirNouvelleBande() {

        this.bandeEnModification = null;


        const form =
            document.getElementById(
                'form-bande'
            );

        if (form) {
            form.reset();
        }


        document.getElementById(
            'bande-id'
        ).value = '';


        document.getElementById(
            'titre-modale-bande'
        ).textContent =
            'Nouvelle bande';


        const modale =
            document.getElementById(
                'modale-bande'
            );

        modale.classList.add(
            'actif'
        );
    },


    /* =====================================================
       FERMER MODALE (bande)
    ===================================================== */

    fermerModale() {

        const modale =
            document.getElementById(
                'modale-bande'
            );

        if (modale) {

            modale.classList.remove(
                'actif'
            );
        }

        this.bandeEnModification = null;
    },


    /* =====================================================
       ENREGISTRER
    ===================================================== */

    async enregistrerBande(event) {

        event.preventDefault();


        try {

            const id =
                document.getElementById(
                    'bande-id'
                ).value;


            const donnees = {

                code:
                    document.getElementById(
                        'bande-code'
                    ).value,

                nom:
                    document.getElementById(
                        'bande-nom'
                    ).value,

                type_volaille:
                    document.getElementById(
                        'bande-type'
                    ).value,

                fournisseur:
                    document.getElementById(
                        'bande-fournisseur'
                    ).value,

                emplacement:
                    document.getElementById(
                        'bande-emplacement'
                    ).value,

                date_depart:
                    document.getElementById(
                        'bande-date-depart'
                    ).value,

                effectif_initial:
                    document.getElementById(
                        'bande-effectif'
                    ).value,

                poids_initial_moyen:
                    document.getElementById(
                        'bande-poids-initial'
                    ).value,

                observation:
                    document.getElementById(
                        'bande-observation'
                    ).value

            };


            if (id) {

                await Elevage.modifierBande(
                    id,
                    donnees
                );

                this.notifier(
                    'Bande modifiée avec succès.'
                );

            } else {

                await Elevage.ajouterBande(
                    donnees
                );

                this.notifier(
                    'Bande créée avec succès.'
                );
            }


            this.fermerModale();

            this.chargerBandes();

        } catch (erreur) {

            console.error(
                erreur
            );

            this.notifier(
                erreur.message,
                true
            );
        }
    },


    /* =====================================================
       MODIFIER
    ===================================================== */

    modifierBande(id) {

        const bande =
            Elevage.obtenirBande(
                id
            );


        if (!bande) {

            this.notifier(
                'Bande introuvable.',
                true
            );

            return;
        }


        this.bandeEnModification =
            bande;


        document.getElementById(
            'bande-id'
        ).value = bande.id;


        document.getElementById(
            'bande-code'
        ).value =
            bande.code || '';


        document.getElementById(
            'bande-nom'
        ).value =
            bande.nom || '';


        document.getElementById(
            'bande-type'
        ).value =
            bande.type_volaille || '';


        document.getElementById(
            'bande-fournisseur'
        ).value =
            bande.fournisseur || '';


        document.getElementById(
            'bande-emplacement'
        ).value =
            bande.emplacement || '';


        document.getElementById(
            'bande-date-depart'
        ).value =
            bande.date_depart || '';


        document.getElementById(
            'bande-effectif'
        ).value =
            bande.effectif_initial || '';


        document.getElementById(
            'bande-poids-initial'
        ).value =
            bande.poids_initial_moyen ?? '';


        document.getElementById(
            'bande-observation'
        ).value =
            bande.observation || '';


        document.getElementById(
            'titre-modale-bande'
        ).textContent =
            'Modifier la bande';


        document.getElementById(
            'modale-bande'
        ).classList.add(
            'actif'
        );
    },


    /* =====================================================
       FICHE DÉTAIL D'UNE BANDE
       =====================================================
     *
     * Utilise la modale générique (ouvrirModale / fermerModale
     * définies dans app.js), pas la modale dédiée "modale-bande"
     * (celle-ci reste réservée au formulaire créer/modifier).
     * ===================================================== */

    voirBande(id) {

        const bande =
            Elevage.obtenirBande(
                id
            );


        if (!bande) {

            this.notifier(
                'Bande introuvable.',
                true
            );

            return;
        }


        const stats =
            Elevage.resultatBande(
                id
            );


        const consommations =
            Elevage.listerConsommations(
                id
            );


        const depenses =
            Elevage.listerDepenses(
                id
            );


        const mortalites =
            Elevage.listerMortalites(
                id
            );


        const sorties =
            Elevage.listerSorties(
                id
            );


        const observations =
            Elevage.listerObservations(
                id
            );


        const enCours =
            bande.statut === 'EN_COURS';


        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">

                    ${this.echapper(bande.code)}

                    ${
                        bande.nom && bande.nom !== bande.code
                            ? ' — ' + this.echapper(bande.nom)
                            : ''
                    }

                </span>

                <button
                    class="modale__fermer"
                    onclick="fermerModale()">
                    ✕
                </button>

            </div>


            <div class="select-produit-info">

                Statut :
                <strong>
                    ${enCours ? 'En cours' : 'Terminée'}
                </strong>

                <br>

                Effectif :
                <strong>
                    ${stats.effectif_actuel} / ${stats.effectif_initial}
                </strong>

                <br>

                Taux de mortalité :
                <strong>
                    ${stats.taux_mortalite.toFixed(1)}%
                </strong>

                <br>

                Aliment consommé :
                <strong>
                    ${stats.consommation_kg} kg
                    (${stats.consommation_sacs} sacs)
                </strong>

                <br>

                Coût aliment :
                <strong>${formaterMontant(stats.cout_aliment)}</strong>

                <br>

                Autres dépenses :
                <strong>${formaterMontant(stats.autres_depenses)}</strong>

                <br>

                Recettes (sorties) :
                <strong>${formaterMontant(stats.recettes)}</strong>

                <br>

                Résultat :
                <strong style="color:${
                    stats.resultat >= 0 ? '#2E5945' : '#B54A3F'
                }">
                    ${formaterMontant(stats.resultat)}
                </strong>

            </div>


            ${
                enCours
                    ? `
                        <div style="display:grid; gap:8px; margin:16px 0;">

                            <button class="btn" type="button"
                                onclick="ElevageUI.ouvrirFormulaireConsommation(${id})">
                                + Alimentation
                            </button>

                            <button class="btn" type="button"
                                onclick="ElevageUI.ouvrirFormulaireDepense(${id})">
                                + Autre dépense
                            </button>

                            <button class="btn" type="button"
                                onclick="ElevageUI.ouvrirFormulaireMortalite(${id})">
                                + Mortalité
                            </button>

                            <button class="btn" type="button"
                                onclick="ElevageUI.ouvrirFormulaireSortie(${id})">
                                + Sortie / vente
                            </button>

                            <button class="btn" type="button"
                                onclick="VaccinationUI.ouvrirFormulaireVaccination(${id})">
                                + Vaccination
                            </button>

                            <button class="btn" type="button"
                                onclick="VaccinationUI.ouvrirFormulaireCalendrierStandard(${id})">
                                + Calendrier standard (J9 / J20)
                            </button>

                            <button class="btn" type="button"
                                onclick="ElevageUI.ouvrirFormulaireObservation(${id})">
                                + Observation
                            </button>

                            <button class="btn btn-principal" type="button"
                                onclick="ElevageUI.ouvrirFormulaireCloture(${id})">
                                Clôturer la bande
                            </button>

                        </div>
                    `
                    : `
                        <div style="margin:16px 0;">

                            <button class="btn" type="button"
                                onclick="ElevageUI.confirmerReouverture(${id})">
                                Rouvrir la bande
                            </button>

                        </div>
                    `
            }


            <h3>Alimentation</h3>

            ${
                consommations.length === 0
                    ? '<p class="texte-secondaire">Aucune consommation enregistrée.</p>'
                    : consommations.map(c => `
                        <div class="liste-item">
                            <div class="liste-item__info">
                                <div class="liste-item__nom">
                                    ${formaterDate(c.date_consommation)}
                                </div>
                                <div class="liste-item__meta">
                                    ${c.nombre_sacs} sacs
                                    (${c.quantite_kg} kg)
                                    ${
                                        c.produit_nom
                                            ? ' — ' + this.echapper(c.produit_nom)
                                            : ''
                                    }
                                </div>
                            </div>
                            <span class="badge badge-or">
                                ${formaterMontant(c.prix_total)}
                            </span>
                        </div>
                    `).join('')
            }


            <h3 style="margin-top:20px;">Autres dépenses</h3>

            ${
                depenses.length === 0
                    ? '<p class="texte-secondaire">Aucune dépense enregistrée.</p>'
                    : depenses.map(d => `
                        <div class="liste-item">
                            <div class="liste-item__info">
                                <div class="liste-item__nom">
                                    ${formaterDate(d.date_depense)}
                                    — ${this.echapper(d.categorie)}
                                </div>
                                <div class="liste-item__meta">
                                    ${
                                        d.libelle
                                            ? this.echapper(d.libelle)
                                            : 'Sans libellé'
                                    }
                                </div>
                            </div>
                            <span class="badge badge-or">
                                ${formaterMontant(d.montant)}
                            </span>
                        </div>
                    `).join('')
            }


            <h3 style="margin-top:20px;">Mortalité</h3>

            ${
                mortalites.length === 0
                    ? '<p class="texte-secondaire">Aucune mortalité enregistrée.</p>'
                    : mortalites.map(m => `
                        <div class="liste-item">
                            <div class="liste-item__info">
                                <div class="liste-item__nom">
                                    ${formaterDate(m.date_mortalite)}
                                    — ${m.nombre_morts} sujet(s)
                                </div>
                                <div class="liste-item__meta">
                                    ${
                                        m.cause
                                            ? this.echapper(m.cause)
                                            : 'Cause non renseignée'
                                    }
                                </div>
                            </div>
                        </div>
                    `).join('')
            }


            <h3 style="margin-top:20px;">Sorties / ventes</h3>

            ${
                sorties.length === 0
                    ? '<p class="texte-secondaire">Aucune sortie enregistrée.</p>'
                    : sorties.map(s => `
                        <div class="liste-item">
                            <div class="liste-item__info">
                                <div class="liste-item__nom">
                                    ${formaterDate(s.date_sortie)}
                                    — ${s.quantite} sujet(s)
                                </div>
                                <div class="liste-item__meta">
                                    ${
                                        s.client
                                            ? this.echapper(s.client)
                                            : this.echapper(s.motif)
                                    }
                                </div>
                            </div>
                            <span class="badge badge-or">
                                ${formaterMontant(s.montant_total)}
                            </span>
                        </div>
                    `).join('')
            }


            ${
                typeof VaccinationUI !== 'undefined'
                    ? VaccinationUI.genererSectionHTML(id)
                    : ''
            }


            <h3 style="margin-top:20px;">Observations</h3>

            ${
                observations.length === 0
                    ? '<p class="texte-secondaire">Aucune observation.</p>'
                    : observations.map(o => `
                        <div class="liste-item">
                            <div class="liste-item__info">
                                <div class="liste-item__nom">
                                    ${formaterDate(o.date_observation)}
                                    ${
                                        o.type_observation
                                            ? ' — ' + this.echapper(o.type_observation)
                                            : ''
                                    }
                                </div>
                                <div class="liste-item__meta">
                                    ${this.echapper(o.contenu)}
                                </div>
                            </div>
                        </div>
                    `).join('')
            }

        `);
    },


    /* =====================================================
       ALIMENTATION — FORMULAIRE
    ===================================================== */

    ouvrirFormulaireConsommation(bandeId) {

        const produits =
            typeof Depot !== 'undefined'
                ? Depot.listerProduits()
                : [];

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle consommation
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <form onsubmit="ElevageUI.soumettreConsommation(event, ${bandeId})">

                <div class="champ">
                    <label>Date</label>
                    <input type="date" name="date_consommation"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Produit du dépôt (optionnel)</label>
                    <select name="produit_id">
                        <option value="">Aucun / aliment externe</option>
                        ${produits.map(p => `
                            <option value="${p.id}">${this.echapper(p.nom)}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="champ">
                    <label>Nombre de sacs</label>
                    <input type="number" name="quantite_sacs"
                        min="0.01" step="0.01" placeholder="Ex : 2" required>
                </div>

                <div class="champ">
                    <label>Poids d'un sac (kg, optionnel)</label>
                    <input type="number" name="poids_sac_kg"
                        min="0.01" step="0.01" placeholder="Par défaut : 50">
                </div>

                <div class="champ">
                    <label>Prix par sac</label>
                    <input type="number" name="prix_par_sac"
                        min="0" step="1" placeholder="Ex : 17500">
                </div>

                <div class="champ">
                    <label>Observation</label>
                    <input type="text" name="observation" placeholder="Optionnel">
                </div>

                <button type="submit" class="btn btn-principal">
                    Enregistrer
                </button>

            </form>
        `);
    },


    async soumettreConsommation(event, bandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Elevage.ajouterConsommation({
                bande_id: bandeId,
                date_consommation: f.date_consommation.value,
                produit_id: f.produit_id.value || null,
                quantite_sacs: f.quantite_sacs.value,
                poids_sac_kg: f.poids_sac_kg.value || null,
                prix_par_sac: f.prix_par_sac.value || null,
                observation: f.observation.value
            });

            this.notifier('Consommation enregistrée.');

            this.voirBande(bandeId);

            this.chargerBandes();

        } catch (erreur) {

            this.notifier(erreur.message, true);
        }
    },


    /* =====================================================
       AUTRE DÉPENSE — FORMULAIRE
    ===================================================== */

    ouvrirFormulaireDepense(bandeId) {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle dépense
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <form onsubmit="ElevageUI.soumettreDepense(event, ${bandeId})">

                <div class="champ">
                    <label>Date</label>
                    <input type="date" name="date_depense"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Catégorie</label>
                    <select name="categorie" required>
                        <option value="">Choisir</option>
                        <option value="VACCIN">Vaccin / soin vétérinaire</option>
                        <option value="DESINFECTION">Désinfection</option>
                        <option value="TRANSPORT">Transport</option>
                        <option value="MAIN_OEUVRE">Main d'œuvre</option>
                        <option value="EQUIPEMENT">Équipement / matériel</option>
                        <option value="AUTRE">Autre</option>
                    </select>
                </div>

                <div class="champ">
                    <label>Libellé (optionnel)</label>
                    <input type="text" name="libelle" placeholder="Précision">
                </div>

                <div class="champ">
                    <label>Montant</label>
                    <input type="number" name="montant"
                        min="0" step="1" required>
                </div>

                <div class="champ">
                    <label>Observation</label>
                    <input type="text" name="observation" placeholder="Optionnel">
                </div>

                <button type="submit" class="btn btn-principal">
                    Enregistrer
                </button>

            </form>
        `);
    },


    async soumettreDepense(event, bandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Elevage.ajouterDepense({
                bande_id: bandeId,
                date_depense: f.date_depense.value,
                categorie: f.categorie.value,
                libelle: f.libelle.value,
                montant: f.montant.value,
                observation: f.observation.value
            });

            this.notifier('Dépense enregistrée.');

            this.voirBande(bandeId);

        } catch (erreur) {

            this.notifier(erreur.message, true);
        }
    },


    /* =====================================================
       MORTALITÉ — FORMULAIRE
    ===================================================== */

    ouvrirFormulaireMortalite(bandeId) {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle mortalité
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <form onsubmit="ElevageUI.soumettreMortalite(event, ${bandeId})">

                <div class="champ">
                    <label>Date</label>
                    <input type="date" name="date_mortalite"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Nombre de sujets morts</label>
                    <input type="number" name="quantite"
                        min="1" step="1" required>
                </div>

                <div class="champ">
                    <label>Cause (optionnel)</label>
                    <input type="text" name="cause"
                        placeholder="Ex : maladie, chaleur...">
                </div>

                <div class="champ">
                    <label>Observation</label>
                    <input type="text" name="observation" placeholder="Optionnel">
                </div>

                <button type="submit" class="btn btn-principal">
                    Enregistrer
                </button>

            </form>
        `);
    },


    async soumettreMortalite(event, bandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Elevage.ajouterMortalite({
                bande_id: bandeId,
                date_mortalite: f.date_mortalite.value,
                quantite: f.quantite.value,
                cause: f.cause.value,
                observation: f.observation.value
            });

            this.notifier('Mortalité enregistrée.');

            this.voirBande(bandeId);

            this.chargerBandes();

        } catch (erreur) {

            this.notifier(erreur.message, true);
        }
    },


    /* =====================================================
       SORTIE / VENTE — FORMULAIRE
    ===================================================== */

    ouvrirFormulaireSortie(bandeId) {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle sortie / vente
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <form onsubmit="ElevageUI.soumettreSortie(event, ${bandeId})">

                <div class="champ">
                    <label>Date</label>
                    <input type="date" name="date_sortie"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Nombre de sujets</label>
                    <input type="number" name="quantite"
                        min="1" step="1" required>
                </div>

                <div class="champ">
                    <label>Poids total (kg, optionnel)</label>
                    <input type="number" name="poids_total_kg"
                        min="0" step="0.01">
                </div>

                <div class="champ">
                    <label>Prix unitaire</label>
                    <input type="number" name="prix_unitaire"
                        min="0" step="1" required>
                </div>

                <div class="champ">
                    <label>Motif</label>
                    <select name="motif">
                        <option value="VENTE">Vente</option>
                        <option value="REFORME">Réforme</option>
                        <option value="DON">Don</option>
                        <option value="AUTOCONSOMMATION">Autoconsommation</option>
                    </select>
                </div>

                <div class="champ">
                    <label>Client (texte libre, optionnel)</label>
                    <input type="text" name="client" placeholder="Nom du client">
                </div>

                <div class="champ">
                    <label>Observation</label>
                    <input type="text" name="observation" placeholder="Optionnel">
                </div>

                <button type="submit" class="btn btn-principal">
                    Enregistrer
                </button>

            </form>
        `);
    },


    async soumettreSortie(event, bandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Elevage.ajouterSortie({
                bande_id: bandeId,
                date_sortie: f.date_sortie.value,
                quantite: f.quantite.value,
                poids_total_kg: f.poids_total_kg.value || null,
                prix_unitaire: f.prix_unitaire.value,
                motif: f.motif.value,
                client: f.client.value,
                observation: f.observation.value
            });

            this.notifier('Sortie enregistrée.');

            this.voirBande(bandeId);

            this.chargerBandes();

        } catch (erreur) {

            this.notifier(erreur.message, true);
        }
    },


    /* =====================================================
       OBSERVATION — FORMULAIRE
    ===================================================== */

    ouvrirFormulaireObservation(bandeId) {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle observation
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <form onsubmit="ElevageUI.soumettreObservation(event, ${bandeId})">

                <div class="champ">
                    <label>Date</label>
                    <input type="date" name="date_observation"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Type (optionnel)</label>
                    <input type="text" name="type_observation"
                        placeholder="Ex : santé, comportement...">
                </div>

                <div class="champ">
                    <label>Contenu</label>
                    <textarea name="contenu" rows="3" required></textarea>
                </div>

                <button type="submit" class="btn btn-principal">
                    Enregistrer
                </button>

            </form>
        `);
    },


    async soumettreObservation(event, bandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Elevage.ajouterObservation({
                bande_id: bandeId,
                date_observation: f.date_observation.value,
                type_observation: f.type_observation.value,
                contenu: f.contenu.value
            });

            this.notifier('Observation enregistrée.');

            this.voirBande(bandeId);

        } catch (erreur) {

            this.notifier(erreur.message, true);
        }
    },


    /* =====================================================
       CLÔTURE / RÉOUVERTURE
    ===================================================== */

    ouvrirFormulaireCloture(bandeId) {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Clôturer la bande
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <form onsubmit="ElevageUI.soumettreCloture(event, ${bandeId})">

                <div class="champ">
                    <label>Date de fin</label>
                    <input type="date" name="date_fin"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Poids final moyen (optionnel)</label>
                    <input type="number" name="poids_final_moyen"
                        min="0" step="0.01">
                </div>

                <div class="champ">
                    <label>Observation</label>
                    <input type="text" name="observation" placeholder="Optionnel">
                </div>

                <button type="submit" class="btn btn-principal">
                    Clôturer
                </button>

            </form>
        `);
    },


    async soumettreCloture(event, bandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Elevage.terminerBande({
                bande_id: bandeId,
                date_fin: f.date_fin.value,
                poids_final_moyen: f.poids_final_moyen.value || null,
                observation: f.observation.value
            });

            this.notifier('Bande clôturée.');

            fermerModale();

            this.chargerBandes();

        } catch (erreur) {

            this.notifier(erreur.message, true);
        }
    },


    confirmerReouverture(bandeId) {

        if (!confirm('Rouvrir cette bande ?')) {
            return;
        }

        this.rouvrirBande(bandeId);
    },


    async rouvrirBande(bandeId) {

        try {

            await Elevage.rouvrirBande(bandeId);

            this.notifier('Bande rouverte.');

            this.voirBande(bandeId);

            this.chargerBandes();

        } catch (erreur) {

            this.notifier(erreur.message, true);
        }
    },


    /* =====================================================
       STATISTIQUES
    ===================================================== */

    actualiserStatistiques(
        bandes
    ) {

        const total =
            bandes.length;


        const enCours =
            bandes.filter(
                b =>
                    b.statut === 'EN_COURS'
            ).length;


        const effectif =
            bandes.reduce(
                (
                    total,
                    bande
                ) =>
                    total +
                    (
                        Number(
                            bande.effectif_actuel
                        ) || 0
                    ),
                0
            );


        const elementTotal =
            document.getElementById(
                'elevage-total-bandes'
            );


        const elementEnCours =
            document.getElementById(
                'elevage-bandes-en-cours'
            );


        const elementEffectif =
            document.getElementById(
                'elevage-effectif-total'
            );


        if (elementTotal) {
            elementTotal.textContent =
                total;
        }


        if (elementEnCours) {
            elementEnCours.textContent =
                enCours;
        }


        if (elementEffectif) {
            elementEffectif.textContent =
                effectif;
        }
    },


    /* =====================================================
       NOTIFICATION
    ===================================================== */

    notifier(
        message,
        erreur = false
    ) {

        if (
            typeof afficherToast ===
            'function'
        ) {

            afficherToast(
                message,
                erreur
            );

            return;
        }


        alert(
            message
        );
    },


    /* =====================================================
       ERREUR
    ===================================================== */

    afficherErreur(
        message
    ) {

        const conteneur =
            document.getElementById(
                'liste-bandes'
            );


        if (conteneur) {

            conteneur.innerHTML = `

                <div class="etat-vide">

                    <p>
                        Erreur :
                        ${this.echapper(
                            message
                        )}
                    </p>

                </div>

            `;
        }
    },


    /* =====================================================
       SÉCURITÉ AFFICHAGE
    ===================================================== */

    echapper(
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
   API PUBLIQUE
   =========================================================
   (déjà assigné directement à window.ElevageUI plus haut)
   ========================================================= */
