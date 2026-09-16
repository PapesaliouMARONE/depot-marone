/**
 * =========================================================
 * poussins-ui.js
 * Interface utilisateur — Achat / revente de poussins
 * =========================================================
 */

const PoussinsUI = {

    /* =====================================================
       CHOIX DEPUIS LE BOUTON FLOTTANT +
       =====================================================
     *
     * Deux actions possibles sur cette vue (commande ou
     * vente) : le bouton flottant ouvre un petit choix
     * plutôt que d'aller directement à l'une des deux.
     * ===================================================== */

    ouvrirChoixAjout() {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Que veux-tu ajouter ?
                </span>

                <button class="modale__fermer" onclick="fermerModale()">
                    ✕
                </button>

            </div>

            <div style="display:grid; gap:10px;">

                <button class="btn btn-principal" type="button"
                    onclick="PoussinsUI.ouvrirFormulaireCommande()">
                    + Nouvelle commande
                </button>

                <button class="btn btn-principal" type="button"
                    onclick="PoussinsUI.ouvrirFormulaireVente()">
                    + Nouvelle vente
                </button>

            </div>
        `);
    },


    /* =====================================================
       INITIALISATION
       ===================================================== */

    initialiser() {

        this.rendreStatistiques();
        this.rendreListeCommandes();
        this.rendreListeVentes();
    },


    /* =====================================================
       STATISTIQUES / CALCUL ÉCONOMIQUE
       ===================================================== */

    rendreStatistiques() {

        const calc =
            Poussins.calculEconomique({});

        const elements = {
            'poussins-ca':
                formaterMontant(calc.chiffreAffaires),

            'poussins-resultat':
                formaterMontant(calc.resultat),

            'poussins-cout-achat':
                formaterMontant(calc.coutAchatParPoussin),

            'poussins-prix-vente':
                formaterMontant(calc.prixVenteParPoussin),

            'poussins-marge':
                formaterMontant(calc.margeParPoussin),

            'poussins-creances':
                formaterMontant(calc.creancesEnCours)
        };

        for (
            const [id, valeur]
            of Object.entries(elements)
        ) {

            const el =
                document.getElementById(id);

            if (el) {
                el.textContent = valeur;
            }
        }
    },


    /* =====================================================
       COMMANDES — LISTE
       ===================================================== */

    rendreListeCommandes() {

        const conteneur =
            document.getElementById(
                'liste-commandes-poussins'
            );

        if (!conteneur) {
            return;
        }

        const commandes =
            Poussins.listerCommandes();

        if (commandes.length === 0) {

            conteneur.innerHTML = `
                <div class="etat-vide">
                    <p>Aucune commande de poussins.</p>
                </div>
            `;

            return;
        }

        const badges = {
            EN_ATTENTE: 'badge-or',
            LIVREE: 'badge-ok',
            PARTIELLE: 'badge-alerte',
            ANNULEE: 'badge-or'
        };

        const libelles = {
            EN_ATTENTE: 'En attente',
            LIVREE: 'Livrée',
            PARTIELLE: 'Partielle',
            ANNULEE: 'Annulée'
        };

        conteneur.innerHTML =
            commandes.map(c => `
                <div
                    class="liste-item"
                    onclick="PoussinsUI.voirCommande(${c.id})"
                    style="cursor:pointer;">

                    <div class="liste-item__info">

                        <div class="liste-item__nom">
                            ${this.echapper(c.fournisseur)}
                            ${
                                c.race
                                    ? ' — ' + this.echapper(c.race)
                                    : ''
                            }
                        </div>

                        <div class="liste-item__meta">
                            ${formaterDate(c.date_commande)}
                            —
                            ${c.quantite_commandee} poussins
                            —
                            ${formaterMontant(c.montant_total)}
                        </div>

                    </div>

                    <span class="badge ${badges[c.statut] || 'badge-or'}">
                        ${libelles[c.statut] || c.statut}
                    </span>

                </div>
            `).join('');
    },


    /* =====================================================
       COMMANDES — FORMULAIRE
       ===================================================== */

    ouvrirFormulaireCommande() {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle commande de poussins
                </span>

                <button
                    class="modale__fermer"
                    onclick="fermerModale()">
                    ✕
                </button>

            </div>

            <form onsubmit="PoussinsUI.soumettreCommande(event)">

                <div class="champ">
                    <label>Fournisseur</label>
                    <input type="text" name="fournisseur" required>
                </div>

                <div class="champ">
                    <label>Date de commande</label>
                    <input type="date" name="date_commande"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Date de livraison prévue (optionnel)</label>
                    <input type="date" name="date_livraison_prevue">
                </div>

                <div class="champ">
                    <label>Quantité commandée (poussins)</label>
                    <input type="number" name="quantite_commandee"
                        min="1" step="1" placeholder="Ex : 100" required>
                </div>

                <div class="champ">
                    <label>Poussins par carton</label>
                    <input type="number" name="poussins_par_carton"
                        min="1" step="1" value="50">
                </div>

                <div class="champ">
                    <label>Prix d'achat unitaire (par poussin)</label>
                    <input type="number" name="prix_achat_unitaire"
                        min="0" step="1" placeholder="Ex : 500" required>
                </div>

                <div class="champ">
                    <label>Race / type (optionnel)</label>
                    <input type="text" name="race" placeholder="Ex : Chair, pondeuse...">
                </div>

                <div class="champ">
                    <label>Observation</label>
                    <input type="text" name="observation">
                </div>

                <button type="submit" class="btn btn-principal">
                    Enregistrer la commande
                </button>

            </form>
        `);
    },


    async soumettreCommande(event) {

        event.preventDefault();

        const f = event.target;

        try {

            await Poussins.ajouterCommande({
                fournisseur: f.fournisseur.value,
                date_commande: f.date_commande.value,
                date_livraison_prevue: f.date_livraison_prevue.value,
                quantite_commandee: f.quantite_commandee.value,
                poussins_par_carton: f.poussins_par_carton.value,
                prix_achat_unitaire: f.prix_achat_unitaire.value,
                race: f.race.value,
                observation: f.observation.value
            });

            afficherToast('Commande enregistrée.');

            fermerModale();

            this.rendreListeCommandes();
            this.rendreStatistiques();

        } catch (erreur) {

            afficherToast(erreur.message, true);
        }
    },


    /* =====================================================
       COMMANDE — DÉTAIL + LIVRAISONS
       ===================================================== */

    voirCommande(id) {

        const commande =
            Poussins.obtenirCommande(id);

        if (!commande) {

            afficherToast('Commande introuvable.', true);
            return;
        }

        const livraisons =
            Poussins.listerLivraisons(id);

        const badges = {
            EN_ATTENTE: 'badge-or',
            LIVREE: 'badge-ok',
            PARTIELLE: 'badge-alerte',
            ANNULEE: 'badge-or'
        };

        const libelles = {
            EN_ATTENTE: 'En attente',
            LIVREE: 'Livrée',
            PARTIELLE: 'Partielle',
            ANNULEE: 'Annulée'
        };

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    ${this.echapper(commande.fournisseur)}
                </span>

                <button class="modale__fermer" onclick="fermerModale()">
                    ✕
                </button>

            </div>

            <div class="select-produit-info">

                Date de commande :
                <strong>${formaterDate(commande.date_commande)}</strong>
                <br>

                ${
                    commande.date_livraison_prevue
                        ? `Livraison prévue :
                           <strong>${formaterDate(commande.date_livraison_prevue)}</strong>
                           <br>`
                        : ''
                }

                Quantité commandée :
                <strong>${commande.quantite_commandee} poussins</strong>
                (${commande.poussins_par_carton} / carton)
                <br>

                Prix unitaire :
                <strong>${formaterMontant(commande.prix_achat_unitaire)}</strong>
                <br>

                Montant total :
                <strong>${formaterMontant(commande.montant_total)}</strong>
                <br>

                ${
                    commande.race
                        ? `Race : <strong>${this.echapper(commande.race)}</strong><br>`
                        : ''
                }

                Statut :
                <span class="badge ${badges[commande.statut] || 'badge-or'}">
                    ${libelles[commande.statut] || commande.statut}
                </span>

            </div>

            ${
                commande.statut !== 'ANNULEE'
                    ? `
                        <div style="display:grid; gap:8px; margin:16px 0;">
                            <button class="btn" type="button"
                                onclick="PoussinsUI.ouvrirFormulaireLivraison(${id})">
                                + Enregistrer une livraison
                            </button>

                            <button class="btn btn-secondaire" type="button"
                                onclick="PoussinsUI.confirmerAnnulationCommande(${id})">
                                Annuler la commande
                            </button>
                        </div>
                    `
                    : ''
            }

            <h3>Livraisons</h3>

            ${
                livraisons.length === 0
                    ? '<p class="texte-secondaire">Aucune livraison enregistrée.</p>'
                    : livraisons.map(l => `
                        <div class="liste-item">
                            <div class="liste-item__info">
                                <div class="liste-item__nom">
                                    ${formaterDate(l.date_livraison)}
                                    — ${l.quantite_recue} reçus
                                </div>
                                <div class="liste-item__meta">
                                    ${this.echapper(l.etat_livraison)}
                                    ${
                                        l.observation
                                            ? ' — ' + this.echapper(l.observation)
                                            : ''
                                    }
                                </div>
                            </div>
                        </div>
                    `).join('')
            }

        `);
    },


    ouvrirFormulaireLivraison(commandeId) {

        const commande =
            Poussins.obtenirCommande(commandeId);

        const reste =
            Poussins.resteALivrer(commandeId);

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle livraison
                </span>

                <button class="modale__fermer"
                    onclick="PoussinsUI.voirCommande(${commandeId})">
                    ✕
                </button>

            </div>

            <p class="texte-secondaire">
                Commande : ${this.echapper(commande.fournisseur)}
                — ${commande.quantite_commandee} poussins commandés
            </p>

            <div class="${
                reste > 0
                    ? 'alerte alerte--info'
                    : 'alerte alerte--danger'
            }" style="margin-bottom:12px;">
                ${
                    reste > 0
                        ? `Reste à livrer sur cette commande : <strong>${reste} poussin(s)</strong>`
                        : `Cette commande a déjà été entièrement livrée.`
                }
            </div>

            <form onsubmit="PoussinsUI.soumettreLivraison(event, ${commandeId})">

                <div class="champ">
                    <label>Date de livraison</label>
                    <input type="date" name="date_livraison"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Quantité réellement reçue</label>
                    <input type="number" name="quantite_recue"
                        min="1" max="${reste}" step="1"
                        value="${reste}" required>
                </div>

                <div class="champ">
                    <label>Fournisseur (optionnel, si différent)</label>
                    <input type="text" name="fournisseur"
                        placeholder="${this.echapper(commande.fournisseur)}">
                </div>

                <div class="champ">
                    <label>État de la livraison</label>
                    <select name="etat_livraison">
                        <option value="CONFORME">Conforme</option>
                        <option value="PARTIELLE">Partielle</option>
                        <option value="EN_RETARD">En retard</option>
                        <option value="NON_CONFORME">Non conforme</option>
                    </select>
                </div>

                <div class="champ">
                    <label>Observation</label>
                    <input type="text" name="observation">
                </div>

                <button type="submit" class="btn btn-principal" ${
                    reste <= 0 ? 'disabled' : ''
                }>
                    Enregistrer la livraison
                </button>

            </form>
        `);
    },


    async soumettreLivraison(event, commandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Poussins.ajouterLivraison({
                commande_id: commandeId,
                date_livraison: f.date_livraison.value,
                quantite_recue: f.quantite_recue.value,
                fournisseur: f.fournisseur.value,
                etat_livraison: f.etat_livraison.value,
                observation: f.observation.value
            });

            afficherToast('Livraison enregistrée.');

            this.voirCommande(commandeId);

            this.rendreListeCommandes();

        } catch (erreur) {

            afficherToast(erreur.message, true);
        }
    },


    confirmerAnnulationCommande(id) {

        if (!confirm('Annuler cette commande ?')) {
            return;
        }

        this.annulerCommande(id);
    },


    async annulerCommande(id) {

        try {

            await Poussins.annulerCommande(id);

            afficherToast('Commande annulée.');

            this.voirCommande(id);

            this.rendreListeCommandes();

        } catch (erreur) {

            afficherToast(erreur.message, true);
        }
    },


    /* =====================================================
       ALERTES — TABLEAU DE BORD
       =====================================================
     *
     * Commandes non livrées dont la date de livraison
     * prévue approche ou est dépassée. Même logique de
     * couleur que pour les vaccinations (voir
     * vaccination-ui.js).
     * ===================================================== */

    joursRestants(dateStr) {

        const [annee, mois, jour] =
            dateStr.split('-').map(Number);

        const dateCible =
            Date.UTC(annee, mois - 1, jour);

        const maintenant =
            new Date();

        const aujourdHui =
            Date.UTC(
                maintenant.getFullYear(),
                maintenant.getMonth(),
                maintenant.getDate()
            );

        return Math.round(
            (dateCible - aujourdHui) / 86400000
        );
    },


    classerCommandeLivraison(commande) {

        const jours =
            this.joursRestants(
                commande.date_livraison_prevue
            );

        if (jours < 0) {

            return {
                classe: 'badge-alerte',
                libelle: 'En retard'
            };
        }

        if (jours === 0) {

            return {
                classe: 'badge-alerte',
                libelle: "Aujourd'hui"
            };
        }

        if (jours === 1) {

            return {
                classe: 'badge-alerte',
                libelle: 'Demain'
            };
        }

        return {
            classe: 'badge-ok',
            libelle: `Dans ${jours} j.`
        };
    },


    rendreAlertesTableauDeBord() {

        const conteneur =
            document.getElementById(
                'liste-poussins-alertes'
            );

        if (!conteneur) {
            return;
        }

        if (typeof Poussins === 'undefined') {

            conteneur.innerHTML =
                '<p class="texte-secondaire">Module poussins non chargé.</p>';

            return;
        }

        const commandes =
            Poussins.commandesASurveiller();

        const commandesDansLaSemaine =
            commandes.filter(c => {

                const jours =
                    this.joursRestants(
                        c.date_livraison_prevue
                    );

                return jours <= 7;
            });

        if (commandesDansLaSemaine.length === 0) {

            conteneur.innerHTML = `
                <div class="etat-vide">
                    <p>Aucune commande à livrer sous 7 jours.</p>
                </div>
            `;

            return;
        }

        conteneur.innerHTML =
            commandesDansLaSemaine.map(c => {

                const { classe, libelle } =
                    this.classerCommandeLivraison(c);

                return `
                    <div
                        class="liste-item"
                        onclick="allerVers('poussins'); PoussinsUI.voirCommande(${c.id});"
                        style="cursor:pointer;">

                        <div class="liste-item__info">

                            <div class="liste-item__nom">
                                ${this.echapper(c.fournisseur)}
                                — ${c.quantite_commandee} poussins
                            </div>

                            <div class="liste-item__meta">
                                Livraison prévue :
                                ${formaterDate(c.date_livraison_prevue)}
                            </div>

                        </div>

                        <span class="badge ${classe}">
                            ${libelle}
                        </span>

                    </div>
                `;
            }).join('');
    },


    /* =====================================================
       VENTES — LISTE
       ===================================================== */

    rendreListeVentes() {

        const conteneur =
            document.getElementById(
                'liste-ventes-poussins'
            );

        if (!conteneur) {
            return;
        }

        const ventes =
            Poussins.listerVentes();

        if (ventes.length === 0) {

            conteneur.innerHTML = `
                <div class="etat-vide">
                    <p>Aucune vente de poussins.</p>
                </div>
            `;

            return;
        }

        conteneur.innerHTML =
            ventes.map(v => `
                <div
                    class="liste-item"
                    onclick="PoussinsUI.voirVente(${v.id})"
                    style="cursor:pointer;">

                    <div class="liste-item__info">

                        <div class="liste-item__nom">
                            ${v.client ? this.echapper(v.client) : 'Client comptant'}
                        </div>

                        <div class="liste-item__meta">
                            ${formaterDate(v.date_vente)}
                            —
                            ${v.quantite} poussins
                            —
                            ${
                                v.mode_paiement === 'credit'
                                    ? 'Crédit'
                                    : 'Comptant'
                            }
                        </div>

                    </div>

                    <div style="text-align:right;">
                        <strong>${formaterMontant(v.montant_total)}</strong>
                        ${
                            Number(v.solde_du) > 0
                                ? `<div class="liste-item__meta" style="color:#B54A3F;">
                                    Solde : ${formaterMontant(v.solde_du)}
                                   </div>`
                                : ''
                        }
                    </div>

                </div>
            `).join('');
    },


    /* =====================================================
       VENTES — FORMULAIRE
       ===================================================== */

    ouvrirFormulaireVente() {

        const stock =
            Poussins.stockDisponible();

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle vente de poussins
                </span>

                <button class="modale__fermer" onclick="fermerModale()">
                    ✕
                </button>

            </div>

            <div class="${
                stock > 0
                    ? 'alerte alerte--info'
                    : 'alerte alerte--danger'
            }" style="margin-bottom:12px;">
                ${
                    stock > 0
                        ? `Stock disponible : <strong>${stock} poussin(s)</strong>`
                        : `Aucun poussin en stock actuellement. Enregistrez d'abord une livraison.`
                }
            </div>

            <form onsubmit="PoussinsUI.soumettreVente(event)">

                <div class="champ">
                    <label>Client (optionnel)</label>
                    <input type="text" name="client" placeholder="Nom du client">
                </div>

                <div class="champ">
                    <label>Date de vente</label>
                    <input type="date" name="date_vente"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Quantité vendue</label>
                    <input type="number" name="quantite"
                        min="1" max="${stock}" step="1" placeholder="Ex : 100" required>
                </div>

                <div class="champ">
                    <label>Prix de vente unitaire (par poussin)</label>
                    <input type="number" name="prix_unitaire"
                        min="0" step="1" placeholder="Ex : 600" required>
                </div>

                <div class="champ">
                    <label>Mode de paiement</label>
                    <select name="mode_paiement" id="mode-paiement-poussin"
                        onchange="PoussinsUI.majChampMontantPaye()">
                        <option value="comptant">Comptant</option>
                        <option value="credit">Crédit</option>
                    </select>
                </div>

                <div class="champ" id="champ-montant-paye-poussin" style="display:none;">
                    <label>Montant payé maintenant (optionnel)</label>
                    <input type="number" name="montant_paye" min="0" step="1"
                        placeholder="0 si rien payé pour l'instant">
                </div>

                <div class="champ">
                    <label>Observation</label>
                    <input type="text" name="observation">
                </div>

                <button type="submit" class="btn btn-principal" ${
                    stock <= 0 ? 'disabled' : ''
                }>
                    Enregistrer la vente
                </button>

            </form>
        `);
    },


    majChampMontantPaye() {

        const mode =
            document.getElementById(
                'mode-paiement-poussin'
            ).value;

        const champ =
            document.getElementById(
                'champ-montant-paye-poussin'
            );

        if (champ) {

            champ.style.display =
                mode === 'credit' ? '' : 'none';
        }
    },


    async soumettreVente(event) {

        event.preventDefault();

        const f = event.target;

        try {

            await Poussins.ajouterVente({
                client: f.client.value,
                date_vente: f.date_vente.value,
                quantite: f.quantite.value,
                prix_unitaire: f.prix_unitaire.value,
                mode_paiement: f.mode_paiement.value,
                montant_paye: f.montant_paye ? f.montant_paye.value : 0,
                observation: f.observation.value
            });

            afficherToast('Vente enregistrée.');

            fermerModale();

            this.rendreListeVentes();
            this.rendreStatistiques();

        } catch (erreur) {

            afficherToast(erreur.message, true);
        }
    },


    /* =====================================================
       VENTE — DÉTAIL + PAIEMENT CRÉDIT
       ===================================================== */

    voirVente(id) {

        const vente =
            Poussins.obtenirVente(id);

        if (!vente) {

            afficherToast('Vente introuvable.', true);
            return;
        }

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    ${vente.client ? this.echapper(vente.client) : 'Vente comptant'}
                </span>

                <button class="modale__fermer" onclick="fermerModale()">
                    ✕
                </button>

            </div>

            <div class="select-produit-info">

                Date : <strong>${formaterDate(vente.date_vente)}</strong><br>
                Quantité : <strong>${vente.quantite} poussins</strong><br>
                Prix unitaire : <strong>${formaterMontant(vente.prix_unitaire)}</strong><br>
                Montant total : <strong>${formaterMontant(vente.montant_total)}</strong><br>
                Mode de paiement :
                <strong>${vente.mode_paiement === 'credit' ? 'Crédit' : 'Comptant'}</strong><br>
                Payé : <strong>${formaterMontant(vente.montant_paye)}</strong><br>

                ${
                    Number(vente.solde_du) > 0
                        ? `Solde dû :
                           <strong style="color:#B54A3F;">
                               ${formaterMontant(vente.solde_du)}
                           </strong>`
                        : ''
                }

            </div>

            ${
                Number(vente.solde_du) > 0
                    ? `
                        <button class="btn btn-principal" type="button"
                            onclick="PoussinsUI.ouvrirFormulairePaiement(${id})">
                            Enregistrer un paiement
                        </button>
                    `
                    : ''
            }

        `);
    },


    ouvrirFormulairePaiement(venteId) {

        const vente =
            Poussins.obtenirVente(venteId);

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Paiement
                </span>

                <button class="modale__fermer"
                    onclick="PoussinsUI.voirVente(${venteId})">
                    ✕
                </button>

            </div>

            <p class="texte-secondaire">
                Solde dû : ${formaterMontant(vente.solde_du)}
            </p>

            <form onsubmit="PoussinsUI.soumettrePaiement(event, ${venteId})">

                <div class="champ">
                    <label>Montant payé</label>
                    <input type="number" name="montant"
                        min="1" step="1" max="${vente.solde_du}" required>
                </div>

                <button type="submit" class="btn btn-principal">
                    Enregistrer le paiement
                </button>

            </form>
        `);
    },


    async soumettrePaiement(event, venteId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Poussins.enregistrerPaiement(
                venteId,
                f.montant.value
            );

            afficherToast('Paiement enregistré.');

            this.voirVente(venteId);

            this.rendreListeVentes();
            this.rendreStatistiques();

        } catch (erreur) {

            afficherToast(erreur.message, true);
        }
    },


    /* =====================================================
       SÉCURITÉ AFFICHAGE
       ===================================================== */

    echapper(valeur) {

        return String(valeur ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

};


/* =========================================================
   API PUBLIQUE
   ========================================================= */

window.PoussinsUI =
    PoussinsUI;
