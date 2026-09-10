/**
 * app.js — Interface complète
 * Dépôt & Aviculture
 *
 * NOTE :
 * La gestion complète des ventes (liste, formulaire de
 * nouvelle vente, détail d'une vente) est gérée par
 * ventes-ui.js, pas par ce fichier — pour éviter les
 * doublons entre les deux fichiers.
 */

// =========================================================
// UTILITAIRES
// =========================================================

function formaterMontant(nombre) {
    return new Intl.NumberFormat('fr-FR').format(
        Math.round(Number(nombre) || 0)
    ) + ' F';
}

function formaterDate(dateStr) {
    if (!dateStr) return '—';

    const d = new Date(dateStr);

    return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function dateAujourdhui() {
    const d = new Date();

    const annee = d.getFullYear();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');

    return `${annee}-${mois}-${jour}`;
}

function afficherToast(message, estErreur = false) {

    const toast = document.getElementById('toast');

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;

    toast.classList.toggle('erreur', estErreur);
    toast.classList.add('visible');

    setTimeout(() => {
        toast.classList.remove('visible');
    }, 2600);
}

function fermerModale() {

    const fond = document.getElementById('modale-fond');
    const contenu = document.getElementById('modale-contenu');

    if (fond) {
        fond.classList.remove('actif');
    }

    if (contenu) {
        contenu.innerHTML = '';
    }
}

function ouvrirModale(html) {

    const fond = document.getElementById('modale-fond');
    const contenu = document.getElementById('modale-contenu');

    if (!fond || !contenu) {
        console.error('Modale introuvable dans le HTML.');
        return;
    }

    contenu.innerHTML = html;
    fond.classList.add('actif');
}


// =========================================================
// ICÔNES
// =========================================================

const ICONES = {

    plus: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
        </svg>
    `,

    crayon: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>
        </svg>
    `,

    poubelle: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
    `,

    clients: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    `,

    vente: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
            <path d="M6 2h12"/>
            <path d="M6 2v20"/>
            <path d="M18 2v20"/>
            <path d="M6 6h12"/>
            <path d="M6 18h12"/>
        </svg>
    `,

    stock: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
            <path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/>
            <path d="M3 8h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/>
            <path d="M9 12h6"/>
        </svg>
    `,

    boite: `
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="M3.27 6.96 12 12.01l8.73-5.05"/>
            <path d="M12 22.08V12"/>
        </svg>
    `
};


// =========================================================
// NAVIGATION
// =========================================================

const VUES = [
    'tableau',
    'produits',
    'approvisionnements',
    'ventes',
    'depenses',
    'clients',
    'categories',
    'elevage',
    'poussins'
];

function allerVers(vue) {

    VUES.forEach(v => {

        const vueElement = document.getElementById(`vue-${v}`);
        const navElement = document.getElementById(`nav-${v}`);

        if (vueElement) {
            vueElement.classList.toggle('actif', v === vue);
        }

        if (navElement) {
            navElement.classList.toggle('actif', v === vue);
        }
    });

    if (vue === 'tableau') rendreTableauDeBord();
    if (vue === 'produits') rendreListeProduits();
    if (vue === 'approvisionnements') rendreListeApprovisionnements();
    if (vue === 'ventes') rendreListeVentes();
    if (vue === 'depenses') rendreListedepenses();
    if (vue === 'clients') rendreListeClients();
    if (vue === 'categories') rendreListeCategories();
    if (vue === 'elevage') ElevageUI.initialiser();
    if (vue === 'poussins') PoussinsUI.initialiser();
}


/**
 * Relais vers DepensesUI.charger(), pour garder le même
 * nommage rendreListeXxx() que les autres vues.
 */
function rendreListedepenses() {

    if (typeof DepensesUI !== 'undefined') {
        DepensesUI.charger();
    }
}


// =========================================================
// TABLEAU DE BORD
// =========================================================

function rendreTableauDeBord() {

    const produits = Depot.listerProduits();
    const alertes = Depot.produitsEnAlerteStock();

    const valeurStock = Depot.valeurTotaleStock();

    const chiffreAffaires =
        typeof Ventes !== 'undefined'
            ? Ventes.chiffreAffairesDuJour()
            : 0;

    /*
     * CORRECTION :
     * Ventes.totalCreances() n'existe pas dans ventes.js.
     * Le total des créances clients est géré par le module
     * Clients (déjà utilisé dans rendreListeClients()).
     */
    const creances =
        typeof Clients !== 'undefined'
            ? Clients.totalCreances()
            : 0;

    const nbProduits =
        document.getElementById('stat-nb-produits');

    const statStock =
        document.getElementById('stat-valeur-stock');

    const statAlertes =
        document.getElementById('stat-alertes');

    const statCA =
        document.getElementById('stat-ca-jour');

    const statCreances =
        document.getElementById('stat-creances');

    if (nbProduits) {
        nbProduits.textContent = produits.length;
    }

    if (statStock) {
        statStock.textContent = formaterMontant(valeurStock);
    }

    if (statAlertes) {
        statAlertes.textContent = alertes.length;
    }

    if (statCA) {
        statCA.textContent = formaterMontant(chiffreAffaires);
    }

    if (statCreances) {
        statCreances.textContent = formaterMontant(creances);
    }

    if (typeof VaccinationUI !== 'undefined') {
        VaccinationUI.rendreAlertesTableauDeBord();
    }

    if (typeof PoussinsUI !== 'undefined') {
        PoussinsUI.rendreAlertesTableauDeBord();
    }

    const conteneur =
        document.getElementById('liste-alertes');

    if (!conteneur) return;

    if (alertes.length === 0) {

        conteneur.innerHTML = `
            <div class="etat-vide">
                ${ICONES.boite}
                <p>Aucune alerte de stock pour le moment.</p>
            </div>
        `;

        return;
    }

    conteneur.innerHTML = alertes.map(p => `
        <div class="liste-item">

            <div class="liste-item__info">

                <div class="liste-item__nom">
                    ${p.nom}
                </div>

                <div class="liste-item__meta">
                    ${p.categorie_nom}
                    — stock :
                    ${p.quantite_en_stock}
                    ${p.unite_stock}
                </div>

            </div>

            <span class="badge badge-alerte">
                Bas
            </span>

        </div>
    `).join('');
}


// =========================================================
// PRODUITS
// =========================================================

function rendreListeProduits() {

    const conteneur =
        document.getElementById('liste-produits');

    if (!conteneur) return;

    const produits = Depot.listerProduits();

    if (produits.length === 0) {

        conteneur.innerHTML = `
            <div class="etat-vide">
                <p>Aucun produit.</p>
            </div>
        `;

        return;
    }

    conteneur.innerHTML = produits.map(p => {

        const enAlerte =
            Number(p.quantite_en_stock) <=
            Number(p.seuil_alerte);

        return `
            <div class="liste-item">

                <div class="liste-item__info"
                     onclick="ouvrirDetailProduit(${p.id})"
                     style="cursor:pointer;">

                    <div class="liste-item__nom">
                        ${p.nom}
                    </div>

                    <div class="liste-item__meta">

                        ${p.categorie_nom}
                        —
                        ${p.quantite_en_stock}
                        ${p.unite_stock}

                        ${enAlerte
                            ? `<span class="badge badge-alerte">
                                Bas
                               </span>`
                            : ''
                        }

                    </div>

                </div>

                <div class="liste-item__actions">

                    <button
                        class="btn-icone"
                        onclick="ouvrirFormulaireProduit(${p.id})">

                        ${ICONES.crayon}

                    </button>

                </div>

            </div>
        `;

    }).join('');
}


// =========================================================
// DÉTAIL PRODUIT
// =========================================================

function ouvrirDetailProduit(id) {

    const produit = Depot.obtenirProduit(id);

    if (!produit) return;

    const unites =
        Depot.listerUnitesVente(id);

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                ${produit.nom}
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>

        <div class="select-produit-info">

            Stock :
            <strong>
                ${produit.quantite_en_stock}
                ${produit.unite_stock}
            </strong>

            <br>

            Coût moyen :
            <strong>
                ${formaterMontant(produit.cout_moyen_actuel)}
                /
                ${produit.unite_stock}
            </strong>

        </div>

        <div class="ligne-titre-action">

            <h3>Unités de vente</h3>

            <button
                class="btn-icone"
                onclick="ouvrirFormulaireUniteVente(${id})">

                ${ICONES.plus}

            </button>

        </div>

        <div>

            ${
                unites.length === 0

                ? `<p class="texte-secondaire">
                    Aucune unité de vente.
                   </p>`

                : unites.map(u => `

                    <div class="liste-item">

                        <div class="liste-item__info">

                            <div class="liste-item__nom">
                                ${u.nom_unite}
                            </div>

                            <div class="liste-item__meta">

                                ${u.quantite_en_unite_stock}
                                ${produit.unite_stock}

                                —
                                ${formaterMontant(u.prix_vente)}

                            </div>

                        </div>

                        <div class="liste-item__actions">

                            <button
                                class="btn-icone"
                                onclick="
                                    ouvrirFormulaireModificationUniteVente(
                                        ${u.id},
                                        ${id}
                                    )
                                ">

                                ${ICONES.crayon}

                            </button>

                            <button
                                class="btn-icone danger"
                                onclick="
                                    confirmerSupprimerUniteVente(
                                        ${u.id},
                                        ${id}
                                    )
                                ">

                                ${ICONES.poubelle}

                            </button>

                        </div>

                    </div>

                `).join('')
            }

        </div>
    `);
}


// =========================================================
// FORMULAIRE PRODUIT
// =========================================================

function remplirSelectCategories(selectId = 'select-categorie-produit') {

    const select =
        document.getElementById(selectId);

    if (!select) return;

    const categories =
        Depot.listerCategories();

    if (categories.length === 0) {

        select.innerHTML =
            `<option value="">
                Crée d'abord une catégorie
             </option>`;

        return;
    }

    select.innerHTML =
        categories.map(c => `
            <option value="${c.id}">
                ${c.nom}
            </option>
        `).join('');
}

function ouvrirFormulaireProduit(id = null) {

    const produit =
        id ? Depot.obtenirProduit(id) : null;

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                ${produit
                    ? 'Modifier le produit'
                    : 'Nouveau produit'}
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>

        <form
            onsubmit="soumettreProduit(event, ${id})">

            <div class="champ">

                <label>Catégorie</label>

                <select
                    name="categorie_id"
                    id="select-categorie-produit"
                    required>
                </select>

            </div>

            <div class="champ">

                <label>Nom du produit</label>

                <input
                    type="text"
                    name="nom"
                    value="${produit ? produit.nom : ''}"
                    required>

            </div>

            <div class="champ">

                <label>Unité de stock</label>

                <input
                    type="text"
                    name="unite_stock"
                    value="${produit ? produit.unite_stock : ''}"
                    placeholder="kg, pièce, tablette..."
                    required>

            </div>

            <div class="champ">

                <label>Seuil d'alerte</label>

                <input
                    type="number"
                    step="0.01"
                    name="seuil_alerte"
                    value="${produit ? produit.seuil_alerte : 0}">

            </div>

            <button
                type="submit"
                class="btn btn-principal">

                ${produit
                    ? 'Enregistrer'
                    : 'Ajouter le produit'}

            </button>

        </form>
    `);

    remplirSelectCategories();

    if (produit) {

        document.getElementById(
            'select-categorie-produit'
        ).value = produit.categorie_id;

    }
}

async function soumettreProduit(event, id) {

    event.preventDefault();

    const f = event.target;

    try {

        const donnees = {

            categorie_id:
                parseInt(f.categorie_id.value),

            nom:
                f.nom.value.trim(),

            unite_stock:
                f.unite_stock.value.trim(),

            seuil_alerte:
                parseFloat(f.seuil_alerte.value) || 0

        };

        if (id) {

            await Depot.modifierProduit(
                id,
                donnees
            );

            afficherToast(
                'Produit modifié avec succès.'
            );

        } else {

            await Depot.ajouterProduit(
                donnees
            );

            afficherToast(
                'Produit ajouté avec succès.'
            );
        }

        fermerModale();

        rendreListeProduits();

        rendreTableauDeBord();

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}


// =========================================================
// UNITÉS DE VENTE
// =========================================================

function ouvrirFormulaireUniteVente(produitId) {

    const produit =
        Depot.obtenirProduit(produitId);

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                Nouvelle unité de vente
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>

        <form
            onsubmit="
                soumettreUniteVente(
                    event,
                    ${produitId}
                )
            ">

            <div class="champ">

                <label>Nom de l'unité</label>

                <input
                    type="text"
                    name="nom_unite"
                    placeholder="Sac 50kg"
                    required>

            </div>

            <div class="champ">

                <label>
                    Équivalence en ${produit.unite_stock}
                </label>

                <input
                    type="number"
                    step="0.01"
                    name="quantite_en_unite_stock"
                    required>

            </div>

            <div class="champ">

                <label>
                    Prix de vente
                </label>

                <input
                    type="number"
                    step="1"
                    name="prix_vente"
                    required>

            </div>

            <button
                class="btn btn-principal"
                type="submit">

                Ajouter

            </button>

        </form>
    `);
}

async function soumettreUniteVente(event, produitId) {

    event.preventDefault();

    const f = event.target;

    try {

        await Depot.ajouterUniteVente(
            produitId,
            {
                nom_unite:
                    f.nom_unite.value.trim(),

                quantite_en_unite_stock:
                    parseFloat(
                        f.quantite_en_unite_stock.value
                    ),

                prix_vente:
                    parseFloat(
                        f.prix_vente.value
                    )
            }
        );

        afficherToast(
            'Unité de vente ajoutée.'
        );

        ouvrirDetailProduit(produitId);

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}


function ouvrirFormulaireModificationUniteVente(
    uniteId,
    produitId
) {

    const produit =
        Depot.obtenirProduit(produitId);

    const unite =
        Depot.obtenirUniteVente(uniteId);

    if (!unite) {

        afficherToast(
            "Unité de vente introuvable.",
            true
        );

        return;
    }

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                Modifier l'unité de vente
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>

        <form
            onsubmit="
                soumettreModificationUniteVente(
                    event,
                    ${uniteId},
                    ${produitId}
                )
            ">

            <div class="champ">

                <label>Nom de l'unité</label>

                <input
                    type="text"
                    name="nom_unite"
                    value="${unite.nom_unite}"
                    required>

            </div>

            <div class="champ">

                <label>
                    Équivalence en ${produit.unite_stock}
                </label>

                <input
                    type="number"
                    step="0.01"
                    name="quantite_en_unite_stock"
                    value="${unite.quantite_en_unite_stock}"
                    required>

            </div>

            <div class="champ">

                <label>
                    Prix de vente
                </label>

                <input
                    type="number"
                    step="1"
                    name="prix_vente"
                    value="${unite.prix_vente}"
                    required>

            </div>

            <button
                class="btn btn-principal"
                type="submit">

                Enregistrer

            </button>

        </form>
    `);
}

async function soumettreModificationUniteVente(
    event,
    uniteId,
    produitId
) {

    event.preventDefault();

    const f = event.target;

    try {

        await Depot.modifierUniteVente(
            uniteId,
            {
                nom_unite:
                    f.nom_unite.value.trim(),

                quantite_en_unite_stock:
                    parseFloat(
                        f.quantite_en_unite_stock.value
                    ),

                prix_vente:
                    parseFloat(
                        f.prix_vente.value
                    )
            }
        );

        afficherToast(
            "Unité de vente modifiée."
        );

        ouvrirDetailProduit(produitId);

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}

async function confirmerSupprimerUniteVente(
    id,
    produitId
) {

    if (!confirm(
        'Supprimer cette unité de vente ?'
    )) return;

    try {

        await Depot.supprimerUniteVente(id);

        afficherToast(
            'Unité supprimée.'
        );

        ouvrirDetailProduit(produitId);

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}


// =========================================================
// APPROVISIONNEMENTS
// =========================================================

function rendreListeApprovisionnements() {

    const conteneur =
        document.getElementById(
            'liste-approvisionnements'
        );

    if (!conteneur) return;

    const historique =
        Depot.listerApprovisionnements();

    if (historique.length === 0) {

        conteneur.innerHTML = `
            <div class="etat-vide">
                <p>
                    Aucun réapprovisionnement enregistré.
                </p>
            </div>
        `;

        return;
    }

    conteneur.innerHTML =
        historique.map(a => `

            <div class="liste-item">

                <div class="liste-item__info">

                    <div class="liste-item__nom">
                        ${a.produit_nom}
                    </div>

                    <div class="liste-item__meta">

                        ${formaterDate(a.date_appro)}
                        —
                        ${a.quantite_ajoutee_stock}
                        ${a.unite_stock}

                        —
                        ${formaterMontant(
                            a.prix_achat_total
                        )}

                        ${
                            a.fournisseur
                            ? ` — ${a.fournisseur}`
                            : ''
                        }

                    </div>

                </div>

                <span class="badge badge-or">

                    ${formaterMontant(
                        a.cout_unitaire
                    )}
                    /
                    ${a.unite_stock}

                </span>

            </div>

        `).join('');
}


/**
 * PRIORITÉ 1 — Formulaire complet d'approvisionnement.
 *
 * Permet de :
 * - choisir le produit
 * - saisir la quantité ajoutée au stock
 * - saisir le prix d'achat total
 * - saisir (optionnel) le nombre de sacs et le fournisseur
 * - choisir la date
 *
 * L'enregistrement (Depot.ajouterApprovisionnement) se
 * charge d'augmenter le stock, de recalculer le coût moyen
 * pondéré, et l'historique est affiché via
 * rendreListeApprovisionnements().
 */
function ouvrirFormulaireApprovisionnement() {

    const produits =
        Depot.listerProduits();

    if (produits.length === 0) {

        afficherToast(
            'Ajoute d’abord un produit.',
            true
        );

        return;
    }

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                Nouvel approvisionnement
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>

        <form
            onsubmit="soumettreApprovisionnement(event)">

            <div class="champ">

                <label>Produit</label>

                <select
                    name="produit_id"
                    id="select-produit-appro"
                    onchange="afficherInfoProduitAppro()"
                    required>

                    <option value="">
                        Choisir un produit
                    </option>

                    ${
                        produits.map(p => `
                            <option value="${p.id}">
                                ${p.nom}
                                —
                                stock actuel :
                                ${p.quantite_en_stock}
                                ${p.unite_stock}
                            </option>
                        `).join('')
                    }

                </select>

            </div>

            <div
                id="info-produit-appro"
                class="texte-secondaire"
                style="margin:-8px 0 14px;">
            </div>

            <div class="champ">

                <label>
                    Quantité ajoutée au stock
                </label>

                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="quantite_ajoutee_stock"
                    placeholder="Ex : 100"
                    required>

            </div>

            <div class="champ">

                <label>
                    Nombre de sacs (optionnel)
                </label>

                <input
                    type="number"
                    step="1"
                    min="0"
                    name="quantite_sacs"
                    placeholder="Ex : 2">

            </div>

            <div class="champ">

                <label>
                    Prix d'achat total
                </label>

                <input
                    type="number"
                    step="1"
                    min="0"
                    name="prix_achat_total"
                    placeholder="Ex : 45000"
                    required>

            </div>

            <div class="champ">

                <label>
                    Fournisseur (optionnel)
                </label>

                <input
                    type="text"
                    name="fournisseur"
                    placeholder="Nom du fournisseur">

            </div>

            <div class="champ">

                <label>Date</label>

                <input
                    type="date"
                    name="date_appro"
                    value="${dateAujourdhui()}"
                    required>

            </div>

            <button
                type="submit"
                class="btn btn-principal">

                Enregistrer l'approvisionnement

            </button>

        </form>
    `);
}

/**
 * Affiche sous le select le stock et le coût moyen actuels
 * du produit choisi, pour aider à la saisie.
 */
function afficherInfoProduitAppro() {

    const select =
        document.getElementById(
            'select-produit-appro'
        );

    const info =
        document.getElementById(
            'info-produit-appro'
        );

    if (!select || !info) return;

    const produitId =
        Number(select.value);

    if (!produitId) {
        info.textContent = '';
        return;
    }

    const produit =
        Depot.obtenirProduit(produitId);

    if (!produit) {
        info.textContent = '';
        return;
    }

    info.innerHTML = `
        Stock actuel :
        <strong>
            ${produit.quantite_en_stock}
            ${produit.unite_stock}
        </strong>
        — coût moyen actuel :
        <strong>
            ${formaterMontant(produit.cout_moyen_actuel)}
            /
            ${produit.unite_stock}
        </strong>
    `;
}

async function soumettreApprovisionnement(event) {

    event.preventDefault();

    const f = event.target;

    try {

        const produitId =
            parseInt(f.produit_id.value);

        if (!produitId) {
            throw new Error(
                'Choisis un produit.'
            );
        }

        const donnees = {

            produit_id:
                produitId,

            date_appro:
                f.date_appro.value,

            fournisseur:
                f.fournisseur.value.trim() || null,

            quantite_sacs:
                f.quantite_sacs.value
                    ? parseFloat(f.quantite_sacs.value)
                    : null,

            quantite_ajoutee_stock:
                parseFloat(
                    f.quantite_ajoutee_stock.value
                ),

            prix_achat_total:
                parseFloat(
                    f.prix_achat_total.value
                )
        };

        await Depot.ajouterApprovisionnement(
            donnees
        );

        fermerModale();

        afficherToast(
            'Approvisionnement enregistré avec succès.'
        );

        rendreListeApprovisionnements();
        rendreListeProduits();
        rendreTableauDeBord();

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}


// =========================================================
// CATÉGORIES
// =========================================================

function rendreListeCategories() {

    const conteneur =
        document.getElementById(
            'liste-categories'
        );

    if (!conteneur) return;

    const categories =
        Depot.listerCategories();

    if (categories.length === 0) {

        conteneur.innerHTML = `
            <div class="etat-vide">
                <p>
                    Aucune catégorie.
                </p>
            </div>
        `;

        return;
    }

    conteneur.innerHTML =
        categories.map(c => `

            <div class="liste-item">

                <div class="liste-item__info">

                    <div class="liste-item__nom">
                        ${c.nom}
                    </div>

                </div>

                <div class="liste-item__actions">

                    <button
                        class="btn-icone danger"
                        onclick="
                            confirmerSupprimerCategorie(
                                ${c.id}
                            )
                        ">

                        ${ICONES.poubelle}

                    </button>

                </div>

            </div>

        `).join('');
}

/**
 * PRIORITÉ 2 — Formulaire complet de catégorie.
 *
 * Permet d'ajouter une catégorie avec vérification des
 * champs (nom obligatoire, pas de doublon) et actualise
 * automatiquement la liste après l'ajout.
 */
function ouvrirFormulaireCategorie() {

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                Nouvelle catégorie
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>

        <form
            onsubmit="soumettreCategorie(event)">

            <div class="champ">

                <label>
                    Nom de la catégorie
                </label>

                <input
                    type="text"
                    name="nom"
                    placeholder="Ex : Aliments volaille"
                    required
                    autofocus>

            </div>

            <button
                type="submit"
                class="btn btn-principal">

                Ajouter la catégorie

            </button>

        </form>
    `);
}

async function soumettreCategorie(event) {

    event.preventDefault();

    const f = event.target;

    try {

        const nom =
            f.nom.value.trim();

        if (!nom) {
            throw new Error(
                'Le nom de la catégorie est obligatoire.'
            );
        }

        const categoriesExistantes =
            Depot.listerCategories();

        const doublon =
            categoriesExistantes.some(
                c =>
                    c.nom.trim().toLowerCase() ===
                    nom.toLowerCase()
            );

        if (doublon) {
            throw new Error(
                'Cette catégorie existe déjà.'
            );
        }

        await Depot.ajouterCategorie(nom);

        fermerModale();

        afficherToast(
            'Catégorie ajoutée avec succès.'
        );

        rendreListeCategories();

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}

async function confirmerSupprimerCategorie(id) {

    if (!confirm(
        'Supprimer cette catégorie ?'
    )) return;

    try {

        await Depot.supprimerCategorie(id);

        afficherToast(
            'Catégorie supprimée.'
        );

        rendreListeCategories();

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}


// =========================================================
// CLIENTS
// =========================================================

function rendreListeClients() {

    const conteneur =
        document.getElementById(
            'liste-clients'
        );

    const statCreancesClients =
        document.getElementById(
            'stat-creances-clients'
        );

    if (statCreancesClients) {
        statCreancesClients.textContent =
            formaterMontant(Clients.totalCreances());
    }

    if (!conteneur) return;

    const clients =
        Clients.lister();

    if (clients.length === 0) {

        conteneur.innerHTML = `
            <div class="etat-vide">
                ${ICONES.clients}
                <p>
                    Aucun client enregistré.
                </p>
            </div>
        `;

        return;
    }

    conteneur.innerHTML =
        clients.map(client => {

            const dette =
                Number(client.solde_du || 0);

            return `

                <div class="liste-item">

                    <div
                        class="liste-item__info"
                        onclick="
                            ouvrirDetailClient(
                                ${client.id}
                            )
                        "
                        style="cursor:pointer;">

                        <div class="liste-item__nom">
                            ${client.nom}
                        </div>

                        <div class="liste-item__meta">

                            ${client.telephone || 'Pas de téléphone'}

                        </div>

                    </div>

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:8px;
                        ">

                        <span
                            class="badge ${
                                dette > 0
                                ? 'badge-alerte'
                                : 'badge-or'
                            }">

                            ${
                                dette > 0
                                ? formaterMontant(dette)
                                : 'À jour'
                            }

                        </span>

                        <button
                            class="btn-icone"
                            onclick="
                                ouvrirFormulaireClient(
                                    ${client.id}
                                )
                            ">

                            ${ICONES.crayon}

                        </button>

                    </div>

                </div>

            `;

        }).join('');
}


// =========================================================
// FORMULAIRE CLIENT
// =========================================================

function ouvrirFormulaireClient(id = null) {

    const client =
        id ? Clients.obtenir(id) : null;

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">

                ${
                    client
                    ? 'Modifier le client'
                    : 'Nouveau client'
                }

            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">

                ✕

            </button>

        </div>

        <form
            onsubmit="
                soumettreClient(
                    event,
                    ${id}
                )
            ">

            <div class="champ">

                <label>
                    Nom du client
                </label>

                <input
                    type="text"
                    name="nom"
                    value="${client ? client.nom : ''}"
                    placeholder="Nom complet"
                    required>

            </div>

            <div class="champ">

                <label>
                    Téléphone
                </label>

                <input
                    type="tel"
                    name="telephone"
                    value="${
                        client
                        ? client.telephone || ''
                        : ''
                    }"
                    placeholder="Ex : 77 000 00 00">

            </div>

            <button
                type="submit"
                class="btn btn-principal">

                ${
                    client
                    ? 'Enregistrer'
                    : 'Ajouter le client'
                }

            </button>

        </form>
    `);
}

async function soumettreClient(event, id) {

    event.preventDefault();

    const f = event.target;

    try {

        const nom =
            f.nom.value.trim();

        const telephone =
            f.telephone.value.trim() || null;

        if (id) {

            await Clients.modifier(
                id,
                nom,
                telephone
            );

            afficherToast(
                'Client modifié.'
            );

        } else {

            await Clients.ajouter(
                nom,
                telephone
            );

            afficherToast(
                'Client ajouté.'
            );
        }

        fermerModale();

        rendreListeClients();

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}


// =========================================================
// DÉTAIL CLIENT
// =========================================================

function ouvrirDetailClient(id) {

    const client =
        Clients.obtenir(id);

    if (!client) return;

    const historique =
        Clients.historique(id);

    const dette =
        Number(client.solde_du || 0);

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                ${client.nom}
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">

                ✕

            </button>

        </div>

        <div class="select-produit-info">

            Téléphone :
            <strong>
                ${client.telephone || '—'}
            </strong>

            <br>

            Dette actuelle :
            <strong style="color:${
                dette > 0
                ? '#B54A3F'
                : '#2E5945'
            }">

                ${formaterMontant(dette)}

            </strong>

        </div>

        ${
            dette > 0
            ? `
                <button
                    class="btn btn-principal"
                    onclick="
                        ouvrirFormulairePaiement(
                            ${client.id}
                        )
                    "
                    style="margin-bottom:18px;">

                    Enregistrer un paiement

                </button>
            `
            : ''
        }

        <h3>
            Historique des ventes
        </h3>

        <div>

            ${
                historique.ventes.length === 0

                ? `<p class="texte-secondaire">
                    Aucune vente à crédit.
                   </p>`

                : historique.ventes.map(v => `

                    <div class="liste-item">

                        <div class="liste-item__info">

                            <div class="liste-item__nom">

                                Vente #${v.id}

                            </div>

                            <div class="liste-item__meta">

                                ${formaterDate(
                                    v.date_vente
                                )}

                                —
                                ${formaterMontant(
                                    v.montant_total
                                )}

                            </div>

                        </div>

                    </div>

                `).join('')
            }

        </div>

        <h3 style="margin-top:20px;">
            Paiements
        </h3>

        <div>

            ${
                historique.paiements.length === 0

                ? `<p class="texte-secondaire">
                    Aucun paiement enregistré.
                   </p>`

                : historique.paiements.map(p => `

                    <div class="liste-item">

                        <div class="liste-item__info">

                            <div class="liste-item__nom">

                                Paiement

                            </div>

                            <div class="liste-item__meta">

                                ${formaterDate(
                                    p.date_paiement
                                )}

                            </div>

                        </div>

                        <span class="badge badge-or">

                            ${formaterMontant(
                                p.montant
                            )}

                        </span>

                    </div>

                `).join('')
            }

        </div>

    `);
}


// =========================================================
// PAIEMENT CLIENT
// =========================================================

function ouvrirFormulairePaiement(clientId) {

    const client =
        Clients.obtenir(clientId);

    if (!client) return;

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                Paiement client
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">

                ✕

            </button>

        </div>

        <div class="select-produit-info">

            Client :
            <strong>
                ${client.nom}
            </strong>

            <br>

            Dette :
            <strong>
                ${formaterMontant(
                    client.solde_du
                )}
            </strong>

        </div>

        <form
            onsubmit="
                soumettrePaiement(
                    event,
                    ${clientId}
                )
            ">

            <div class="champ">

                <label>
                    Montant payé
                </label>

                <input
                    type="number"
                    name="montant"
                    step="1"
                    min="1"
                    max="${client.solde_du}"
                    required
                    autofocus>

            </div>

            <div class="champ">

                <label>
                    Date
                </label>

                <input
                    type="date"
                    name="date_paiement"
                    value="${dateAujourdhui()}"
                    required>

            </div>

            <button
                class="btn btn-principal"
                type="submit">

                Enregistrer le paiement

            </button>

        </form>
    `);
}

async function soumettrePaiement(
    event,
    clientId
) {

    event.preventDefault();

    const f = event.target;

    try {

        const resultat =
            await Clients.enregistrerPaiement(
                clientId,
                parseFloat(f.montant.value),
                f.date_paiement.value
            );

        fermerModale();

        afficherToast(
            `Paiement enregistré : ${formaterMontant(
                resultat.montant
            )}`
        );

        rendreListeClients();

        rendreTableauDeBord();

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}


// =========================================================
// RÉGLAGES — SAUVEGARDE / RESTAURATION
// =========================================================

function ouvrirParametres() {

    ouvrirModale(`

        <div class="modale__entete">

            <span class="modale__titre">
                Réglages
            </span>

            <button
                class="modale__fermer"
                onclick="fermerModale()">
                ✕
            </button>

        </div>

        <h3>Sauvegarde des données</h3>

        <p class="texte-secondaire">
            Télécharge une copie complète de la base
            (dépôt, ventes, clients, élevage) sur ton
            téléphone ou ordinateur. À faire régulièrement
            pour éviter de tout perdre en cas de panne
            ou de changement d'appareil.
        </p>

        <button
            class="btn btn-principal"
            onclick="exporterDonnees()">

            Télécharger une sauvegarde

        </button>

        <h3 style="margin-top:24px;">
            Restaurer une sauvegarde
        </h3>

        <p class="texte-secondaire" style="color:#B54A3F;">
            ⚠️ Cette action remplace TOUTES les données
            actuelles par celles du fichier choisi.
            Impossible à annuler.
        </p>

        <input
            type="file"
            id="fichier-restauration"
            accept=".sqlite,.db,.sqlite3"
            onchange="confirmerRestauration(event)">

    `);
}


function exporterDonnees() {

    try {

        const donnees =
            DB.exporterBaseSQLite();

        const blob =
            new Blob(
                [donnees],
                { type: 'application/x-sqlite3' }
            );

        const url =
            URL.createObjectURL(blob);

        const lien =
            document.createElement('a');

        lien.href = url;

        lien.download =
            `depot-aviculture-sauvegarde-${dateAujourdhui()}.sqlite`;

        document.body.appendChild(lien);

        lien.click();

        document.body.removeChild(lien);

        URL.revokeObjectURL(url);

        afficherToast(
            'Sauvegarde téléchargée.'
        );

    } catch (e) {

        afficherToast(
            e.message,
            true
        );
    }
}


async function confirmerRestauration(event) {

    const fichier =
        event.target.files[0];

    if (!fichier) {
        return;
    }

    if (!confirm(
        "Cette action va REMPLACER toutes les données actuelles par celles du fichier sélectionné. Continuer ?"
    )) {

        event.target.value = '';

        return;
    }

    try {

        const buffer =
            await fichier.arrayBuffer();

        await DB.importerBaseSQLite(
            buffer
        );

        afficherToast(
            "Données restaurées avec succès."
        );

        fermerModale();

        allerVers('tableau');

    } catch (e) {

        afficherToast(
            "Erreur : " + e.message,
            true
        );

    } finally {

        event.target.value = '';
    }
}


// =========================================================
// DÉMARRAGE
// =========================================================

async function demarrerApplication() {

    try {

        await DB.initialiserBaseDeDonnees();

        allerVers('tableau');

    } catch (e) {

        console.error(e);

        document.body.innerHTML = `

            <div
                style="
                    padding:40px 20px;
                    text-align:center;
                    color:#B54A3F;
                ">

                <p>
                    <strong>
                        Erreur au démarrage de l'application.
                    </strong>
                </p>

                <p style="font-size:13px;">
                    ${e.message}
                </p>

            </div>
        `;
    }
}

document.addEventListener(
    'DOMContentLoaded',
    demarrerApplication
);