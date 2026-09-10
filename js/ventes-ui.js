/**
 * ventes-ui.js
 *
 * Interface utilisateur du module Ventes.
 *
 * Ne contient pas la logique SQL :
 * celle-ci reste dans ventes.js.
 *
 * Ce fichier est désormais le SEUL responsable de
 * l'affichage des ventes (liste, formulaire, détail) —
 * la version dupliquée qui existait dans app.js a été
 * supprimée pour éviter les conflits.
 */

let panierVente = [];


/* =========================================================
   UTILITAIRES
   ========================================================= */

function montantVenteUI(nombre) {

    return new Intl.NumberFormat('fr-FR')
        .format(Math.round(Number(nombre) || 0))
        + ' F';
}


function dateVenteUI() {

    const d = new Date();

    const annee = d.getFullYear();

    const mois = String(
        d.getMonth() + 1
    ).padStart(2, '0');

    const jour = String(
        d.getDate()
    ).padStart(2, '0');

    return `${annee}-${mois}-${jour}`;
}


/* =========================================================
   NOUVELLE VENTE
   ========================================================= */

function ouvrirNouvelleVente() {

    panierVente = [];

    const produits =
        Depot.listerProduits();

    /*
     * CORRECTION :
     * Ventes.listerClients() n'existe pas dans ventes.js.
     * La liste des clients est gérée par le module Clients.
     */
    const clients =
        Clients.lister();

    if (produits.length === 0) {

        afficherToast(
            "Ajoute d'abord un produit.",
            true
        );

        return;
    }

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                Nouvelle vente
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>


        <form
            id="form-nouvelle-vente"
            onsubmit="validerNouvelleVente(event)">


            <div class="champ">

                <label>Date de vente</label>

                <input
                    type="date"
                    name="date_vente"
                    value="${dateVenteUI()}"
                    required>

            </div>


            <div class="champ">

                <label>Mode de paiement</label>

                <select
                    name="mode_paiement"
                    id="mode-paiement-vente"
                    onchange="majClientVente()">

                    <option value="comptant">
                        Comptant
                    </option>

                    <option value="credit">
                        Crédit
                    </option>

                </select>

            </div>


            <div
                class="champ"
                id="champ-client-vente"
                style="display:none;">

                <label>Client</label>

                <select
                    name="client_id"
                    id="client-vente">

                    <option value="">
                        Sélectionner un client
                    </option>

                    ${clients.map(c => `
                        <option value="${c.id}">
                            ${c.nom}
                            ${Number(c.solde_du) > 0
                                ? ` — dette : ${montantVenteUI(c.solde_du)}`
                                : ''}
                        </option>
                    `).join('')}

                </select>

            </div>


            <hr>


            <div class="ligne-titre-action">

                <h3>Produit</h3>

            </div>


            <div class="champ">

                <label>Produit</label>

                <select
                    id="produit-vente"
                    onchange="chargerUnitesVenteUI()">

                    ${produits.map(p => `
                        <option value="${p.id}">
                            ${p.nom}
                            — stock :
                            ${p.quantite_en_stock}
                            ${p.unite_stock}
                        </option>
                    `).join('')}

                </select>

            </div>


            <div class="champ">

                <label>Unité de vente</label>

                <select
                    id="unite-vente"
                    onchange="mettreAJourApercuPrixVente()">
                </select>

            </div>


            <div class="champ">

                <label>Quantité</label>

                <input
                    type="number"
                    id="quantite-vente"
                    min="0.01"
                    step="0.01"
                    value="1"
                    oninput="mettreAJourApercuPrixVente()">

            </div>


            <div
                id="apercu-prix-vente"
                class="texte-secondaire"
                style="
                    margin-bottom:14px;
                    font-size:16px;
                    font-weight:600;
                ">

                Prix : 0 F

            </div>


            <button
                type="button"
                class="btn"
                onclick="ajouterLignePanier()">

                + Ajouter au panier

            </button>


            <div
                id="panier-vente"
                style="margin-top:18px;">

            </div>


            <div
                id="total-vente"
                style="
                    margin-top:18px;
                    padding:16px;
                    background:#F4F1E9;
                    border-radius:12px;
                    font-size:20px;
                    font-weight:bold;
                ">

                Total : 0 F

            </div>


            <button
                type="submit"
                class="btn btn-principal"
                style="margin-top:16px;">

                Enregistrer la vente

            </button>

        </form>
    `);

    chargerUnitesVenteUI();
}


/* =========================================================
   CLIENT
   ========================================================= */

function majClientVente() {

    const mode =
        document.getElementById(
            'mode-paiement-vente'
        ).value;

    const champ =
        document.getElementById(
            'champ-client-vente'
        );

    const select =
        document.getElementById(
            'client-vente'
        );

    if (mode === 'credit') {

        champ.style.display = '';

        select.required = true;

    } else {

        champ.style.display = 'none';

        select.required = false;

        select.value = '';
    }
}


/* =========================================================
   UNITÉS DE VENTE
   ========================================================= */

function chargerUnitesVenteUI() {

    const produitId =
        Number(
            document.getElementById(
                'produit-vente'
            ).value
        );

    const produit =
        Depot.obtenirProduit(produitId);

    const unites =
        Depot.listerUnitesVente(produitId);

    const select =
        document.getElementById(
            'unite-vente'
        );

    if (!produit) {
        select.innerHTML =
            '<option>Aucun produit</option>';
        return;
    }

    if (unites.length === 0) {

        select.innerHTML =
            '<option value="">Aucune unité définie</option>';

        mettreAJourApercuPrixVente();

        return;
    }

    select.innerHTML =
        unites.map(u => `

            <option value="${u.id}">

                ${u.nom_unite}
                — ${montantVenteUI(u.prix_vente)}

            </option>

        `).join('');

    mettreAJourApercuPrixVente();
}


/* =========================================================
   APERÇU DU PRIX (avant ajout au panier)
   ========================================================= */

function mettreAJourApercuPrixVente() {

    const apercu =
        document.getElementById(
            'apercu-prix-vente'
        );

    if (!apercu) {
        return;
    }

    const produitId =
        Number(
            document.getElementById(
                'produit-vente'
            ).value
        );

    const uniteId =
        Number(
            document.getElementById(
                'unite-vente'
            ).value
        );

    const quantite =
        Number(
            document.getElementById(
                'quantite-vente'
            ).value
        );

    if (
        !Number.isInteger(produitId)
        ||
        !Number.isInteger(uniteId)
        ||
        !Number.isFinite(quantite)
        ||
        quantite <= 0
    ) {

        apercu.textContent =
            'Prix : 0 F';

        return;
    }

    const unites =
        Depot.listerUnitesVente(
            produitId
        );

    const unite =
        unites.find(
            u => Number(u.id) === uniteId
        );

    if (!unite) {

        apercu.textContent =
            'Prix : 0 F';

        return;
    }

    const montant =
        quantite *
        Number(unite.prix_vente || 0);

    apercu.textContent =
        `Prix : ${montantVenteUI(montant)}`;
}


/* =========================================================
   AJOUT PANIER
   ========================================================= */

function ajouterLignePanier() {

    const produitId =
        Number(
            document.getElementById(
                'produit-vente'
            ).value
        );

    const uniteId =
        Number(
            document.getElementById(
                'unite-vente'
            ).value
        );

    const quantite =
        Number(
            document.getElementById(
                'quantite-vente'
            ).value
        );

    if (!Number.isInteger(produitId)) {

        afficherToast(
            "Produit invalide.",
            true
        );

        return;
    }

    if (!Number.isInteger(uniteId)) {

        afficherToast(
            "Choisis une unité de vente.",
            true
        );

        return;
    }

    if (!Number.isFinite(quantite) || quantite <= 0) {

        afficherToast(
            "La quantité doit être supérieure à zéro.",
            true
        );

        return;
    }

    const produit =
        Depot.obtenirProduit(produitId);

    const unites =
        Depot.listerUnitesVente(produitId);

    const unite =
        unites.find(
            u => Number(u.id) === uniteId
        );

    if (!produit || !unite) {

        afficherToast(
            "Produit ou unité introuvable.",
            true
        );

        return;
    }

    const quantiteStock =
        quantite *
        Number(
            unite.quantite_en_unite_stock
        );

    if (
        quantiteStock >
        Number(produit.quantite_en_stock)
    ) {

        afficherToast(
            `Stock insuffisant. Disponible : ${produit.quantite_en_stock} ${produit.unite_stock}.`,
            true
        );

        return;
    }

    panierVente.push({

        produit_id: produit.id,

        produit_nom: produit.nom,

        unite_vente_id: unite.id,

        unite_nom: unite.nom_unite,

        quantite_vendue: quantite,

        quantite_stock: quantiteStock,

        prix_unitaire: Number(
            unite.prix_vente
        ),

        montant:
            quantite *
            Number(unite.prix_vente)
    });

    afficherPanierVente();
}


/* =========================================================
   AFFICHER PANIER
   ========================================================= */

function afficherPanierVente() {

    const conteneur =
        document.getElementById(
            'panier-vente'
        );

    const total =
        document.getElementById(
            'total-vente'
        );

    if (panierVente.length === 0) {

        conteneur.innerHTML =
            '<p class="texte-secondaire">Aucun produit dans la vente.</p>';

        total.textContent =
            'Total : 0 F';

        return;
    }

    conteneur.innerHTML =
        panierVente.map((ligne, index) => `

            <div
                class="liste-item"
                style="margin-bottom:8px;">

                <div class="liste-item__info">

                    <div class="liste-item__nom">

                        ${ligne.produit_nom}

                    </div>

                    <div class="liste-item__meta">

                        ${ligne.quantite_vendue}
                        ×
                        ${ligne.unite_nom}

                        — ${montantVenteUI(ligne.montant)}

                    </div>

                </div>

                <div class="liste-item__actions">

                    <button
                        type="button"
                        class="btn-icone danger"
                        onclick="supprimerLignePanier(${index})">

                        ✕

                    </button>

                </div>

            </div>

        `).join('');

    const montantTotal =
        panierVente.reduce(
            (total, ligne) =>
                total + ligne.montant,
            0
        );

    total.textContent =
        `Total : ${montantVenteUI(montantTotal)}`;
}


/* =========================================================
   SUPPRIMER LIGNE
   ========================================================= */

function supprimerLignePanier(index) {

    panierVente.splice(index, 1);

    afficherPanierVente();
}


/* =========================================================
   ENREGISTRER
   ========================================================= */

async function validerNouvelleVente(event) {

    event.preventDefault();

    if (panierVente.length === 0) {

        afficherToast(
            "Ajoute au moins un produit.",
            true
        );

        return;
    }

    const form =
        event.target;

    const mode =
        form.mode_paiement.value;

    const clientId =
        form.client_id.value
            ? Number(form.client_id.value)
            : null;

    if (
        mode === 'credit' &&
        !clientId
    ) {

        afficherToast(
            "Choisis un client pour une vente à crédit.",
            true
        );

        return;
    }

    const lignes =
        panierVente.map(ligne => ({

            produit_id:
                ligne.produit_id,

            unite_vente_id:
                ligne.unite_vente_id,

            quantite_vendue:
                ligne.quantite_vendue
        }));

    try {

        const resultat =
            await Ventes.enregistrerVente({

                client_id: clientId,

                date_vente:
                    form.date_vente.value,

                mode_paiement:
                    mode,

                lignes
            });

        fermerModale();

        afficherToast(
            `Vente enregistrée : ${montantVenteUI(resultat.montantTotal)}`
        );

        panierVente = [];

        if (typeof rendreTableauDeBord === 'function') {
            rendreTableauDeBord();
        }

        if (typeof rendreListeProduits === 'function') {
            rendreListeProduits();
        }

        rendreListeVentes();

    } catch (e) {

        console.error(e);

        afficherToast(
            e.message,
            true
        );
    }
}


/* =========================================================
   HISTORIQUE VENTES
   ========================================================= */

function rendreListeVentes() {

    /*
     * Statistiques de la vue Ventes (CA total et marge),
     * reprises depuis app.js pour éviter le doublon de
     * la fonction rendreListeVentes() dans deux fichiers.
     */
    const statCaTotal =
        document.getElementById('stat-ca-total');

    const statMarge =
        document.getElementById('stat-marge');

    if (statCaTotal) {
        statCaTotal.textContent =
            formaterMontant(Ventes.chiffreAffaires());
    }

    if (statMarge) {
        statMarge.textContent =
            formaterMontant(Ventes.margeTotale());
    }

    /*
     * Résultat net du dépôt = marge sur les ventes
     * (Ventes.margeTotale) moins les dépenses générales
     * du dépôt (loyer, personnel, autres frais).
     */
    const statResultatNet =
        document.getElementById('stat-resultat-net');

    if (statResultatNet) {

        const margeVentes =
            Ventes.margeTotale();

        const totalDepenses =
            typeof Depot !== 'undefined'
                ? Depot.totalDepensesDepot()
                : 0;

        const resultatNet =
            margeVentes - totalDepenses;

        statResultatNet.textContent =
            formaterMontant(resultatNet);

        statResultatNet.style.color =
            resultatNet >= 0
                ? 'var(--vert-fonce, #2E5945)'
                : '#B54A3F';
    }

    rendreMargeParProduit();

    const conteneur =
        document.getElementById(
            'liste-ventes'
        );

    if (!conteneur) {
        return;
    }

    /*
     * CORRECTION :
     * listerVentes() attend un OBJET d'options
     * ({ limite, dateDebut, dateFin, ... }), pas un
     * nombre brut. L'appel précédent Ventes.listerVentes(100)
     * ne plantait pas, mais la limite de 100 était
     * silencieusement ignorée (valeur par défaut 200 utilisée
     * à la place).
     */
    const ventes =
        Ventes.listerVentes({ limite: 100 });

    if (ventes.length === 0) {

        conteneur.innerHTML = `

            <div class="etat-vide">

                <p>
                    Aucune vente enregistrée.
                </p>

            </div>

        `;

        return;
    }

    conteneur.innerHTML =
        ventes.map(v => `

            <div
                class="liste-item"
                onclick="ouvrirDetailVente(${v.id})"
                style="cursor:pointer;">

                <div class="liste-item__info">

                    <div class="liste-item__nom">

                        Vente #${v.id}

                    </div>

                    <div class="liste-item__meta">

                        ${formaterDate(v.date_vente)}

                        —
                        ${v.client_nom || 'Client comptant'}

                        —
                        ${v.mode_paiement === 'credit'
                            ? 'Crédit'
                            : 'Comptant'}

                    </div>

                </div>

                <span class="badge badge-or">

                    ${montantVenteUI(v.montant_total)}

                </span>

            </div>

        `).join('');
}


/* =========================================================
   MARGE PAR PRODUIT
   =========================================================
 *
 * Classement des produits par marge réelle générée,
 * du plus rentable au moins rentable.
 * ========================================================= */

function rendreMargeParProduit() {

    const conteneur =
        document.getElementById(
            'liste-marge-produits'
        );

    if (!conteneur) {
        return;
    }

    if (typeof Ventes === 'undefined') {
        return;
    }

    const lignes =
        Ventes.margeParProduit({});

    if (lignes.length === 0) {

        conteneur.innerHTML = `
            <div class="etat-vide">
                <p>Aucune vente enregistrée pour le moment.</p>
            </div>
        `;

        return;
    }

    conteneur.innerHTML =
        lignes.map(l => {

            const marge =
                Number(l.marge) || 0;

            return `

                <div class="liste-item">

                    <div class="liste-item__info">

                        <div class="liste-item__nom">

                            ${l.produit_nom}

                        </div>

                        <div class="liste-item__meta">

                            ${l.quantite_vendue} vendus
                            —
                            CA : ${montantVenteUI(l.chiffre_affaires)}

                        </div>

                    </div>

                    <span
                        class="badge"
                        style="
                            background:${marge >= 0 ? '#E9F1EC' : '#FBE9E7'};
                            color:${marge >= 0 ? '#2E5945' : '#B54A3F'};
                        ">

                        ${montantVenteUI(marge)}

                    </span>

                </div>

            `;
        }).join('');
}


/* =========================================================
   DETAIL VENTE
   ========================================================= */

function ouvrirDetailVente(id) {

    const vente =
        Ventes.obtenirVente(id);

    if (!vente) {

        afficherToast(
            "Vente introuvable.",
            true
        );

        return;
    }

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                Vente #${vente.id}
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>


        <div class="select-produit-info">

            <strong>Date :</strong>
            ${formaterDate(vente.date_vente)}

            <br>

            <strong>Client :</strong>
            ${vente.client_nom || 'Vente comptant'}

            <br>

            <strong>Paiement :</strong>
            ${vente.mode_paiement === 'credit'
                ? 'Crédit'
                : 'Comptant'}

        </div>


        <h3>Produits</h3>


        ${vente.lignes.map(ligne => `

            <div class="liste-item">

                <div class="liste-item__info">

                    <div class="liste-item__nom">

                        ${ligne.produit_nom}

                    </div>

                    <div class="liste-item__meta">

                        ${ligne.quantite_vendue}
                        ×
                        ${ligne.nom_unite}

                    </div>

                </div>

                <span class="badge badge-or">

                    ${montantVenteUI(ligne.montant_ligne)}

                </span>

            </div>

        `).join('')}


        <div
            style="
                margin-top:16px;
                padding:16px;
                background:#F4F1E9;
                border-radius:12px;
                font-size:20px;
                font-weight:bold;
            ">

            Total :
            ${montantVenteUI(vente.montant_total)}

        </div>

    `);
}


/* =========================================================
   INITIALISATION
   ========================================================= */

window.ouvrirNouvelleVente =
    ouvrirNouvelleVente;

window.rendreListeVentes =
    rendreListeVentes;

window.ouvrirDetailVente =
    ouvrirDetailVente;

window.majClientVente =
    majClientVente;

window.chargerUnitesVenteUI =
    chargerUnitesVenteUI;

window.mettreAJourApercuPrixVente =
    mettreAJourApercuPrixVente;

window.ajouterLignePanier =
    ajouterLignePanier;

window.supprimerLignePanier =
    supprimerLignePanier;

window.validerNouvelleVente =
    validerNouvelleVente;
