/**
 * =========================================================
 * vaccination-ui.js
 * Interface utilisateur de la gestion des vaccinations
 * =========================================================
 *
 * S'intègre dans la fiche détail d'une bande
 * (ElevageUI.voirBande), qui appelle
 * VaccinationUI.genererSectionHTML(bandeId) pour
 * afficher la liste des vaccinations de cette bande.
 * =========================================================
 */

/*
 * Protection contre un double chargement du fichier
 * (cache, balise script en double, etc.) : si
 * window.VaccinationUI existe déjà, on ne le redéfinit
 * pas — ça évite tout plantage "already declared".
 */
window.VaccinationUI = window.VaccinationUI || {

    /* =====================================================
       SECTION AFFICHÉE DANS LA FICHE BANDE
       ===================================================== */

    genererSectionHTML(bandeId) {

        const vaccinations =
            Vaccination.listerVaccinations(
                bandeId
            );

        return `

            <h3 style="margin-top:20px;">Vaccinations</h3>

            ${
                vaccinations.length === 0
                    ? '<p class="texte-secondaire">Aucune vaccination programmée.</p>'
                    : vaccinations.map(v => {

                        const { classe, libelle } =
                            this.classerVaccination(v);

                        return `
                        <div class="liste-item">

                            <div class="liste-item__info">

                                <div class="liste-item__nom">
                                    ${this.echapper(v.nom_vaccin)}
                                    ${
                                        v.maladie
                                            ? ' — ' + this.echapper(v.maladie)
                                            : ''
                                    }
                                </div>

                                <div class="liste-item__meta">

                                    Prévu :
                                    ${formaterDate(v.date_prevue)}

                                    ${
                                        v.date_effective
                                            ? ' · Effectué : ' + formaterDate(v.date_effective)
                                            : ''
                                    }

                                    ${
                                        v.date_rappel
                                            ? ' · Rappel : ' + formaterDate(v.date_rappel)
                                            : ''
                                    }

                                </div>

                            </div>

                            <div style="text-align:right;">

                                <span class="badge ${classe}">
                                    ${libelle}
                                </span>

                                <div
                                    class="liste-item__actions"
                                    style="margin-top:6px; justify-content:flex-end;">

                                    ${
                                        (v.statut === 'PREVU' || v.statut === 'EN_RETARD')
                                            ? `
                                                <button type="button" class="btn-icone"
                                                    title="Ajouter au calendrier du téléphone"
                                                    onclick="VaccinationUI.telechargerRappelIcs(${v.id})">
                                                    📅
                                                </button>

                                                <button type="button" class="btn-icone"
                                                    title="Marquer effectué"
                                                    onclick="VaccinationUI.ouvrirFormulaireEffectuee(${v.id}, ${bandeId})">
                                                    ✓
                                                </button>

                                                <button type="button" class="btn-icone danger"
                                                    title="Annuler"
                                                    onclick="VaccinationUI.confirmerAnnulation(${v.id}, ${bandeId})">
                                                    ✕
                                                </button>
                                            `
                                            : ''
                                    }

                                    ${
                                        v.statut === 'ANNULE'
                                            ? `
                                                <button type="button" class="btn-icone"
                                                    title="Réactiver"
                                                    onclick="VaccinationUI.reactiverVaccination(${v.id}, ${bandeId})">
                                                    ↺
                                                </button>
                                            `
                                            : ''
                                    }

                                </div>

                            </div>

                        </div>
                    `;
                    }).join('')
            }
        `;
    },


    /* =====================================================
       URGENCE D'UNE VACCINATION (couleur du badge)
       =====================================================
     *
     * Vert  : effectuée, ou prévue mais encore loin.
     * Rouge : en retard, prévue aujourd'hui, ou demain.
     * Neutre (orange) : annulée.
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


    classerVaccination(v) {

        if (v.statut === 'EFFECTUE') {

            return {
                classe: 'badge-ok',
                libelle: 'Effectué'
            };
        }

        if (v.statut === 'ANNULE') {

            return {
                classe: 'badge-or',
                libelle: 'Annulé'
            };
        }

        const jours =
            this.joursRestants(v.date_prevue);

        if (v.statut === 'EN_RETARD' || jours < 0) {

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


    /* =====================================================
       NOUVELLE VACCINATION — FORMULAIRE
       ===================================================== */

    ouvrirFormulaireVaccination(bandeId) {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Nouvelle vaccination
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <form onsubmit="VaccinationUI.soumettreVaccination(event, ${bandeId})">

                <div class="champ">
                    <label>Nom du vaccin</label>
                    <input type="text" name="nom_vaccin"
                        placeholder="Ex : Newcastle, Gumboro..." required>
                </div>

                <div class="champ">
                    <label>Maladie ciblée (optionnel)</label>
                    <input type="text" name="maladie" placeholder="Optionnel">
                </div>

                <div class="champ">
                    <label>Date prévue</label>
                    <input type="date" name="date_prevue"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Date de rappel (optionnel)</label>
                    <input type="date" name="date_rappel">
                </div>

                <div class="champ">
                    <label>Dose (optionnel)</label>
                    <input type="number" name="dose" min="0.01" step="0.01">
                </div>

                <div class="champ">
                    <label>Unité de dose (optionnel)</label>
                    <input type="text" name="unite_dose" placeholder="Ex : ml, goutte...">
                </div>

                <div class="champ">
                    <label>Voie d'administration (optionnel)</label>
                    <input type="text" name="voie_administration"
                        placeholder="Ex : eau de boisson, oculaire, injection...">
                </div>

                <div class="champ">
                    <label>Fournisseur (optionnel)</label>
                    <input type="text" name="fournisseur">
                </div>

                <div class="champ">
                    <label>Numéro de lot (optionnel)</label>
                    <input type="text" name="numero_lot">
                </div>

                <div class="champ">
                    <label>Coût (optionnel)</label>
                    <input type="number" name="cout" min="0" step="1">
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


    async soumettreVaccination(event, bandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Vaccination.ajouterVaccination({
                bande_id: bandeId,
                nom_vaccin: f.nom_vaccin.value,
                maladie: f.maladie.value,
                date_prevue: f.date_prevue.value,
                date_rappel: f.date_rappel.value,
                dose: f.dose.value,
                unite_dose: f.unite_dose.value,
                voie_administration: f.voie_administration.value,
                fournisseur: f.fournisseur.value,
                numero_lot: f.numero_lot.value,
                cout: f.cout.value,
                observation: f.observation.value
            });

            if (typeof afficherToast === 'function') {
                afficherToast('Vaccination programmée.');
            }

            ElevageUI.voirBande(bandeId);

        } catch (erreur) {

            if (typeof afficherToast === 'function') {
                afficherToast(erreur.message, true);
            }
        }
    },


    /* =====================================================
       CALENDRIER VACCINAL STANDARD (J9 / J20)
       =====================================================
     *
     * Calcule automatiquement les dates du 9ème et du
     * 20ème jour à partir de la date de départ de la bande,
     * en travaillant en UTC pour éviter tout décalage lié
     * au fuseau horaire du navigateur.
     * ===================================================== */

    ajouterJoursDate(dateStr, jours) {

        const [annee, mois, jour] =
            dateStr.split('-').map(Number);

        const date =
            new Date(Date.UTC(annee, mois - 1, jour));

        date.setUTCDate(
            date.getUTCDate() + jours
        );

        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');

        return `${y}-${m}-${d}`;
    },


    ouvrirFormulaireCalendrierStandard(bandeId) {

        const bande =
            Elevage.obtenirBande(bandeId);

        if (!bande) {
            if (typeof afficherToast === 'function') {
                afficherToast('Bande introuvable.', true);
            }
            return;
        }

        const dateJ9 =
            this.ajouterJoursDate(bande.date_depart, 9);

        const dateJ20 =
            this.ajouterJoursDate(bande.date_depart, 20);

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Calendrier vaccinal standard
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <p class="texte-secondaire">
                Génère automatiquement les deux vaccinations
                habituelles, calculées à partir de la date de
                départ de la bande
                (${formaterDate(bande.date_depart)}).
            </p>

            <form onsubmit="VaccinationUI.soumettreCalendrierStandard(event, ${bandeId})">

                <div class="champ">
                    <label>
                        Vaccin du 9ème jour — ${formaterDate(dateJ9)}
                    </label>
                    <input type="text" name="vaccin_j9"
                        placeholder="Ex : Newcastle" required>
                </div>

                <div class="champ">
                    <label>
                        Vaccin du 20ème jour — ${formaterDate(dateJ20)}
                    </label>
                    <input type="text" name="vaccin_j20"
                        placeholder="Ex : Gumboro" required>
                </div>

                <button type="submit" class="btn btn-principal">
                    Générer les deux vaccinations
                </button>

            </form>
        `);
    },


    async soumettreCalendrierStandard(event, bandeId) {

        event.preventDefault();

        const f = event.target;

        const bande =
            Elevage.obtenirBande(bandeId);

        try {

            const dateJ9 =
                this.ajouterJoursDate(bande.date_depart, 9);

            const dateJ20 =
                this.ajouterJoursDate(bande.date_depart, 20);

            await Vaccination.ajouterVaccination({
                bande_id: bandeId,
                nom_vaccin: f.vaccin_j9.value,
                date_prevue: dateJ9
            });

            await Vaccination.ajouterVaccination({
                bande_id: bandeId,
                nom_vaccin: f.vaccin_j20.value,
                date_prevue: dateJ20
            });

            if (typeof afficherToast === 'function') {
                afficherToast('Calendrier vaccinal généré (J9 et J20).');
            }

            ElevageUI.voirBande(bandeId);

        } catch (erreur) {

            if (typeof afficherToast === 'function') {
                afficherToast(erreur.message, true);
            }
        }
    },


    /* =====================================================
       EXPORT .ICS — RAPPEL CALENDRIER TÉLÉPHONE
       =====================================================
     *
     * Génère un événement de calendrier standard (format
     * .ics), avec une alarme au moment de l'événement.
     * Le téléphone se charge ensuite de la notification
     * réelle via son application calendrier native —
     * aucun serveur ni SMS nécessaire.
     * ===================================================== */

    telechargerRappelIcs(id) {

        const vaccination =
            Vaccination.obtenirVaccination(id);

        if (!vaccination) {
            if (typeof afficherToast === 'function') {
                afficherToast('Vaccination introuvable.', true);
            }
            return;
        }

        try {

            const [annee, mois, jour] =
                vaccination.date_prevue.split('-');

            const dtstart =
                `${annee}${mois}${jour}T080000`;

            const dtend =
                `${annee}${mois}${jour}T083000`;

            const dtstamp =
                new Date()
                    .toISOString()
                    .replace(/[-:]/g, '')
                    .split('.')[0] + 'Z';

            const resume =
                this.echapperIcs(
                    `Vaccination ${vaccination.nom_vaccin} — ${vaccination.bande_code}`
                );

            const description =
                this.echapperIcs(
                    `Bande ${vaccination.bande_code}` +
                    (vaccination.bande_nom ? ` (${vaccination.bande_nom})` : '') +
                    (vaccination.maladie ? ` — ${vaccination.maladie}` : '')
                );

            const contenu = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Depot Aviculture Marone//FR',
                'BEGIN:VEVENT',
                `UID:vaccination-${vaccination.id}@depot-aviculture-marone`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART:${dtstart}`,
                `DTEND:${dtend}`,
                `SUMMARY:${resume}`,
                `DESCRIPTION:${description}`,
                'BEGIN:VALARM',
                'ACTION:DISPLAY',
                'DESCRIPTION:Rappel vaccination',
                'TRIGGER:-PT0M',
                'END:VALARM',
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            const blob =
                new Blob(
                    [contenu],
                    { type: 'text/calendar;charset=utf-8' }
                );

            const url =
                URL.createObjectURL(blob);

            const lien =
                document.createElement('a');

            lien.href = url;

            lien.download =
                `vaccination-${String(vaccination.nom_vaccin || 'rappel').replace(/[^a-z0-9]+/gi, '-')}-${vaccination.date_prevue}.ics`;

            document.body.appendChild(lien);

            lien.click();

            document.body.removeChild(lien);

            URL.revokeObjectURL(url);

        } catch (erreur) {

            if (typeof afficherToast === 'function') {
                afficherToast(erreur.message, true);
            }
        }
    },


    echapperIcs(texte) {

        return String(texte ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    },


    /* =====================================================
       MARQUER COMME EFFECTUÉE
       ===================================================== */

    ouvrirFormulaireEffectuee(id, bandeId) {

        ouvrirModale(`

            <div class="modale__entete">

                <span class="modale__titre">
                    Vaccination effectuée
                </span>

                <button
                    class="modale__fermer"
                    onclick="ElevageUI.voirBande(${bandeId})">
                    ✕
                </button>

            </div>

            <form onsubmit="VaccinationUI.soumettreEffectuee(event, ${id}, ${bandeId})">

                <div class="champ">
                    <label>Date effective</label>
                    <input type="date" name="date_effectuee"
                        value="${dateAujourdhui()}" required>
                </div>

                <div class="champ">
                    <label>Observation (optionnel)</label>
                    <input type="text" name="observation">
                </div>

                <button type="submit" class="btn btn-principal">
                    Confirmer
                </button>

            </form>
        `);
    },


    async soumettreEffectuee(event, id, bandeId) {

        event.preventDefault();

        const f = event.target;

        try {

            await Vaccination.enregistrerVaccination({
                id: id,
                date_effectuee: f.date_effectuee.value,
                observation: f.observation.value
            });

            if (typeof afficherToast === 'function') {
                afficherToast('Vaccination marquée comme effectuée.');
            }

            ElevageUI.voirBande(bandeId);

        } catch (erreur) {

            if (typeof afficherToast === 'function') {
                afficherToast(erreur.message, true);
            }
        }
    },


    /* =====================================================
       ANNULER / RÉACTIVER
       ===================================================== */

    confirmerAnnulation(id, bandeId) {

        if (!confirm('Annuler cette vaccination programmée ?')) {
            return;
        }

        this.annulerVaccination(id, bandeId);
    },


    async annulerVaccination(id, bandeId) {

        try {

            await Vaccination.annulerVaccination(id);

            if (typeof afficherToast === 'function') {
                afficherToast('Vaccination annulée.');
            }

            ElevageUI.voirBande(bandeId);

        } catch (erreur) {

            if (typeof afficherToast === 'function') {
                afficherToast(erreur.message, true);
            }
        }
    },


    async reactiverVaccination(id, bandeId) {

        try {

            await Vaccination.reactiverVaccination(id);

            if (typeof afficherToast === 'function') {
                afficherToast('Vaccination réactivée.');
            }

            ElevageUI.voirBande(bandeId);

        } catch (erreur) {

            if (typeof afficherToast === 'function') {
                afficherToast(erreur.message, true);
            }
        }
    },


    /* =====================================================
       RAPPELS — TABLEAU DE BORD
       =====================================================
     *
     * Utilisé par app.js (rendreTableauDeBord) pour
     * afficher les vaccinations à venir/en retard,
     * toutes bandes confondues.
     * ===================================================== */

    rendreAlertesTableauDeBord() {

        const conteneur =
            document.getElementById(
                'liste-vaccinations-alertes'
            );

        if (!conteneur) {
            return;
        }

        if (typeof Vaccination === 'undefined') {
            conteneur.innerHTML =
                '<p class="texte-secondaire">Module vaccination non chargé.</p>';
            return;
        }

        try {

            Vaccination.actualiserStatuts();

        } catch (erreur) {

            console.error(erreur);
        }

        const enRetard =
            Vaccination.vaccinationsEnRetard();

        const aVenir =
            Vaccination.vaccinationsAVenir(7);

        if (enRetard.length === 0 && aVenir.length === 0) {

            conteneur.innerHTML = `
                <div class="etat-vide">
                    <p>Aucune vaccination en retard ou à venir sous 7 jours.</p>
                </div>
            `;

            return;
        }

        const lignes = [
            ...enRetard,
            ...aVenir
        ];

        conteneur.innerHTML =
            lignes.map(v => {

                const { classe, libelle } =
                    this.classerVaccination(v);

                return `

                <div class="liste-item">

                    <div class="liste-item__info">

                        <div class="liste-item__nom">
                            ${this.echapper(v.nom_vaccin)}
                            — ${this.echapper(v.bande_code)}
                        </div>

                        <div class="liste-item__meta">
                            Prévu : ${formaterDate(v.date_prevue)}
                        </div>

                    </div>

                    <span class="badge ${classe}">
                        ${libelle}
                    </span>

                    <button type="button" class="btn-icone"
                        title="Ajouter au calendrier du téléphone"
                        onclick="VaccinationUI.telechargerRappelIcs(${v.id})">
                        📅
                    </button>

                </div>

            `;
            }).join('');
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
   =========================================================
   (déjà assigné directement à window.VaccinationUI plus
   haut — cette ligne n'est plus nécessaire, conservée en
   commentaire pour la cohérence visuelle avec les autres
   fichiers du projet)
   ========================================================= */
