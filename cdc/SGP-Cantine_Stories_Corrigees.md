# SGP-Cantine — User Stories Corrigées
## Audit de cohérence : Backlog vs Cahier des Charges M1

**Date de l'audit :** 1er août 2026
**Méthode :** Vérification exhaustive des 46 stories contre chaque section du CDC M1
**Corrections identifiées :** 19 stories sur 46

---

> **Convention de lecture**
> - 🔴 **Avant** : énoncé ou critère d'acceptation erroné / incomplet
> - ✅ **Après** : version corrigée
> - 📄 **Référence CDC** : section ou règle métier du cahier des charges justifiant la correction
> - ⚠️ **Type d'erreur** : catégorie de l'incohérence

---

## US-05 — Alerte péremption

⚠️ **Type d'erreur :** Acteur incomplet + comportement métier manquant

### Énoncé

🔴 **Avant**
> En tant que **gestionnaire**, je reçois une alerte pour les denrées expirant dans 7 jours.

✅ **Après**
> En tant que **gestionnaire et directeur**, je reçois une alerte pour les denrées expirant dans 7 jours, et la denrée concernée est automatiquement suggérée en priorité dans le prochain menu planifié.

### Critères d'acceptation

🔴 **Avant**
> Bandeau visible au tableau de bord ; denrée prioritaire dans la planification.

✅ **Après**
> Bandeau d'alerte visible sur le tableau de bord du gestionnaire ET du directeur ; la denrée est automatiquement remontée en tête de liste lors de la composition du prochain menu hebdomadaire ; l'alerte persiste jusqu'à consommation ou déclaration d'avarie.

### Justification

📄 **Référence CDC §2.1 — Gestion des dates :**
> *"Alerte sur les produits approchant la péremption (7 jours avant)."*

📄 **Référence CDC — Règle métier n°3 :**
> *"Une denrée avec une date de péremption dans les 7 jours est signalée en priorité et **doit être consommée dans le prochain menu planifié**."*

La règle métier n°3 impose un comportement actif du système (suggestion dans le menu), pas seulement une alerte passive. Ce comportement était absent de l'énoncé et du critère d'acceptation. De plus, le Directeur supervise l'ensemble du système (§5) et doit donc également voir cette alerte sur son tableau de bord.

---

## US-14 — Double validation bon de commande

⚠️ **Type d'erreur :** Acteur manquant (la double validation n'est pas enforced)

### Énoncé

🔴 **Avant**
> En tant que **directeur**, je valide (double validation) un bon de commande avant envoi.

✅ **Après**
> En tant que **responsable stock ET directeur** (double validation obligatoire et séquentielle), un bon de commande ne peut être transmis au fournisseur qu'après la validation explicite des deux acteurs dans cet ordre.

### Critères d'acceptation

🔴 **Avant**
> 2 signatures distinctes ; log horodaté.

✅ **Après**
> Le bon de commande passe par deux états distincts : "validé responsable stock" puis "validé directeur" ; aucun des deux états ne peut être court-circuité ; chaque validation est horodatée et associée à l'identifiant de l'utilisateur ; le bon ne passe au statut "transmis" qu'après les deux validations.

### Justification

📄 **Référence CDC — Règle métier n°4 :**
> *"Un bon de commande doit être validé par le **responsable stock ET le président/directeur** avant d'être transmis au fournisseur."*

L'énoncé initial ne mentionnait que le directeur comme acteur, effaçant complètement le rôle du responsable stock. Sans correction, l'implémentation des guards NestJS ne peut pas enforcer correctement la double validation — le système accepterait la validation du directeur seul.

---

## US-15 — Réception livraison

⚠️ **Type d'erreur :** Critère d'acceptation incomplet (statut de commande non couvert)

### Énoncé

✅ **Inchangé**
> En tant que gestionnaire, je saisis la livraison réelle et le stock est mis à jour avec écart.

### Critères d'acceptation

🔴 **Avant**
> Écart calculé ; stock incrémenté des qtés réellement reçues.

✅ **Après**
> Écart calculé et affiché (qté commandée vs qté reçue) ; stock incrémenté uniquement des quantités réellement reçues ; statut de la commande mis à jour automatiquement : **"réceptionnée"** si la livraison est complète, **"partiellement réceptionnée"** si l'écart est positif ; un écart négatif (surplus) déclenche un avertissement.

### Justification

📄 **Référence CDC §2.4 — Suivi des commandes :**
> *"Suivi des commandes : émise, en attente de livraison, **réceptionnée, partiellement réceptionnée**."*

Le CDC définit explicitement quatre statuts de commande. Le critère d'acceptation initial ne mentionnait pas la mise à jour du statut, créant un trou fonctionnel : une commande partiellement livrée resterait bloquée au statut "émise" indéfiniment.

---

## US-20 — Inventaire mensuel

⚠️ **Type d'erreur :** Valeur arbitraire (seuil de 5% non sourcé dans le CDC)

### Énoncé

✅ **Inchangé**
> En tant que directeur, je valide l'inventaire mensuel (comptage réel vs stock théorique).

### Critères d'acceptation

🔴 **Avant**
> Écart calculé ; commentaire obligatoire si > 5 % ; clôture impossible sans inventaire validé ; export automatique déclenché à la clôture.

✅ **Après**
> Écart calculé entre stock physique et stock théorique pour chaque denrée ; **commentaire obligatoire pour tout écart constaté, quel que soit son montant** ; clôture mensuelle impossible sans inventaire validé ; export automatique de sauvegarde déclenché à la clôture ; le seuil de tolérance (si souhaité) est un paramètre configurable par le directeur, non une valeur codée en dur.

### Justification

📄 **Référence CDC — Règle métier n°7 :**
> *"Toute clôture mensuelle nécessite la validation d'un inventaire physique (saisie des comptages réels) ; l'écart avec le stock théorique est calculé et **doit être commenté**."*

Le CDC n'introduit aucun seuil de 5%. Cette valeur avait été ajoutée arbitrairement. Dans le contexte du projet (risque de détournement identifié en §1.1), un écart de 4% peut être significatif. Imposer un seuil fixe codé en dur reviendrait à légitimer des écarts potentiellement frauduleux.

---

## US-21 — Interface bilingue FR/MG

⚠️ **Type d'erreur :** Critère d'acceptation ambigu (deux périmètres techniques distincts confondus)

### Énoncé

✅ **Inchangé**
> En tant qu'utilisateur, l'interface est disponible en français et en malgache.

### Critères d'acceptation

🔴 **Avant**
> Bascule en 1 clic ; labels et rapports traduits.

✅ **Après**
> Bascule de langue en 1 clic sans rechargement de page (i18next) ; **tous les libellés de l'interface Vue 3** sont traduits (menus, boutons, messages d'erreur, notifications) ; **les rapports exportés (PDF et CSV)** sont également générés dans la langue active au moment de l'export ; les deux périmètres sont testés et validés séparément.

### Justification

📄 **Référence CDC §3.3 — Ergonomie et Contexte d'Usage :**
> *"Support du français et du malgache pour **les libellés et les rapports**."*

Le CDC distingue explicitement deux périmètres : les libellés d'interface et les rapports. Ce sont deux implémentations techniques séparées : i18next gère les libellés côté Vue 3, tandis que les templates PDF (WeasyPrint / Puppeteer) nécessitent leur propre système de traduction. Confondre les deux dans un critère unique risque de produire une story livrée avec l'interface traduite mais des rapports PDF toujours en français.

---

## US-23 — Piste d'audit

⚠️ **Type d'erreur :** Mauvais acteur

### Énoncé

🔴 **Avant**
> En tant que **gestionnaire**, je consulte la piste d'audit (qui a saisi quoi, quand).

✅ **Après**
> En tant que **directeur**, je consulte la piste d'audit complète (qui a saisi quoi, quand, depuis quel poste), avec filtres par utilisateur, par type d'action et par période.

### Critères d'acceptation

🔴 **Avant**
> Tableau filtrable par utilisateur et date ; données non modifiables.

✅ **Après**
> Tableau filtrable par utilisateur, type d'action et période ; données non modifiables et non supprimables ; accessible uniquement par le rôle directeur ; chaque entrée affiche : identifiant utilisateur, action réalisée, horodatage, module concerné.

### Justification

📄 **Référence CDC §5 — Acteurs et Rôles :**
> *"Président du CGCS / Directeur d'école : **supervise l'ensemble**, consulte les rapports, valide les commandes, gère les comptes utilisateurs."*

📄 **Référence CDC §2.5 — Traçabilité des mouvements :**
> *"Qui a saisi quoi, quand, avec horodatage et identifiant utilisateur."*

La piste d'audit est un outil de supervision et de reddition de comptes, non un outil opérationnel. Le responsable stock n'a aucune raison métier d'auditer ses propres saisies — cela annulerait l'intérêt même de la traçabilité en matière de contrôle interne.

---

## US-25 — Rapport de consommation

⚠️ **Type d'erreur :** Acteur manquant + comportement fonctionnel manquant

### Énoncé

🔴 **Avant**
> En tant que **directeur**, je consulte un rapport de consommation par denrée sur une période sélectionnable.

✅ **Après**
> En tant que **directeur et responsable communal / inspecteur** (accès lecture seule pour ce dernier), je consulte un rapport de consommation par denrée sur une période sélectionnable, avec corrélation au nombre de repas servis sur la même période.

### Critères d'acceptation

🔴 **Avant**
> Graphique + tableau ; corrélation repas / qté consommée.

✅ **Après**
> Graphique et tableau affichant les quantités consommées par denrée ; corrélation explicite avec le nombre de repas servis sur la période (ratio qté/repas) ; filtrable par denrée et par période ; exportable en PDF et CSV ; accessible en lecture seule pour le responsable communal / inspecteur.

### Justification

📄 **Référence CDC §2.5 — Rapport de consommation :**
> *"Quantités consommées par denrée, par période, **corrélation avec le nombre de repas servis**."*

📄 **Référence CDC §5 — Acteurs et Rôles :**
> *"Responsable Communal / Inspecteur (accès lecture seule) : **consulte les rapports agrégés** de plusieurs écoles pour supervision."*

La corrélation avec les repas servis est une exigence fonctionnelle explicite du CDC absente de l'énoncé. Par ailleurs, le responsable communal/inspecteur a vocation à superviser ces données pour détecter les anomalies de consommation entre écoles.

---

## US-26 — Historique des présences

⚠️ **Type d'erreur :** Mauvais acteur

### Énoncé

🔴 **Avant**
> En tant que **gestionnaire**, je vois l'historique des présences (taux par semaine/mois), filtrable par classe.

✅ **Après**
> En tant que **directeur**, je vois l'historique des présences (taux de fréquentation par jour, semaine et mois), filtrable par classe.

### Critères d'acceptation

🔴 **Avant**
> Vue graphique et tableau ; filtrable par classe.

✅ **Après**
> Vue graphique (courbe de fréquentation) et tableau ; filtrable par classe et par période ; taux d'absentéisme calculé et affiché ; accessible uniquement par le rôle directeur.

### Justification

📄 **Référence CDC §2.3 — Historique des présences :**
> *"Taux de fréquentation par jour, par semaine, par mois."*

📄 **Référence CDC §5 — Acteurs et Rôles :**
> *"Président du CGCS / Directeur : supervise l'ensemble, **consulte les rapports**."*

L'historique des présences est une donnée de supervision et de reddition de comptes. Le responsable stock n'a aucun périmètre sur les présences des élèves selon la section 5 du CDC. Cette consultation relève du directeur qui doit pouvoir justifier les taux de fréquentation aux autorités scolaires.

---

## US-28 — Tableau de bord enrichi

⚠️ **Type d'erreur :** Critère d'acceptation incomplet (types de visualisations non précisés)

### Énoncé

✅ **Inchangé**
> En tant que directeur, je consulte un tableau de bord enrichi : coût moyen par repas, taux de gaspillage, évolution nutritionnelle hebdomadaire.

### Critères d'acceptation

🔴 **Avant**
> 4 indicateurs affichés ; données recalculées à chaque consultation.

✅ **Après**
> Indicateurs affichés : coût moyen par repas (en ariary), taux de gaspillage (%), ruptures de stock actives, évolution nutritionnelle sur 4 semaines ; **camembert** pour la répartition nutritionnelle des macronutriments ; **courbe** pour les tendances de consommation et de fréquentation ; données recalculées à chaque consultation sans rechargement complet de page ; indicateurs exportables en PDF.

### Justification

📄 **Référence CDC §4.3 (Recommandations M. Tojo) :**
> *"Enrichir les tableaux de bord en ajoutant : écoles les plus consommatrices, coût moyen par repas, taux de gaspillage, rupture de stock par région, évolution nutritionnelle."*

📄 **Référence CDC §3.2 — Visualisation :**
> *"Graphique **radar ou barres** montrant la couverture nutritionnelle du menu sur une semaine."*

Les types de visualisations sont une exigence fonctionnelle précise du CDC. Les préciser dans le critère d'acceptation est indispensable pour éviter qu'une livraison avec de simples valeurs textuelles soit considérée comme Done.

---

## US-29 — Rapports multi-écoles

⚠️ **Type d'erreur :** Acteur incomplet (droit d'accès non précisé)

### Énoncé

🔴 **Avant**
> En tant que **responsable communal**, je consulte les ruptures de stock par région et les écoles les plus consommatrices.

✅ **Après**
> En tant que **responsable communal / inspecteur** (**accès lecture seule**), je consulte les ruptures de stock par région et les écoles les plus consommatrices sur la zone communale.

### Critères d'acceptation

🔴 **Avant**
> Vue agrégée multi-écoles ; filtrable par denrée et par période.

✅ **Après**
> Vue agrégée multi-écoles accessible en lecture seule uniquement ; filtrable par denrée, par école et par période ; aucune action de modification ou de validation n'est accessible depuis ce rôle ; export PDF disponible.

### Justification

📄 **Référence CDC §5 — Acteurs et Rôles :**
> *"Responsable Communal / Inspecteur **(accès lecture seule)** : consulte les rapports agrégés de plusieurs écoles pour supervision."*

Le CDC nomme explicitement cet acteur "Responsable Communal / Inspecteur" et précise "(accès lecture seule)". Omettre cette précision dans l'énoncé et le critère d'acceptation expose à une implémentation des guards NestJS sans restriction d'écriture pour ce rôle.

---

## US-31 — Prédiction consommation denrées

⚠️ **Type d'erreur :** Mauvais acteur

### Énoncé

🔴 **Avant**
> En tant que **planificateur**, le système me prédit les quantités de denrées à consommer par jour pour la semaine suivante.

✅ **Après**
> En tant que **responsable stock**, le système me prédit les quantités de denrées à consommer par jour pour la semaine suivante, afin d'anticiper les commandes et d'éviter les ruptures ou les surstocks.

### Critères d'acceptation

🔴 **Avant**
> Prédictions par denrée ; modèle entraîné mensuellement en local sans API externe.

✅ **Après**
> Prédictions affichées par denrée avec intervalle de confiance ; modèle entraîné mensuellement en local sans API externe ; résultats consultables depuis le tableau de bord du responsable stock ; prédictions automatiquement transmises au module Planification pour ajustement de la liste de courses (US-32).

### Justification

📄 **Référence CDC §3.1 — Module ML, Application métier :**
> *"Ajustement automatique des quantités de la liste de courses générée par le module Planification ; **réduction du gaspillage alimentaire et des ruptures de stock**."*

📄 **Référence CDC §5 — Acteurs et Rôles :**
> *"Responsable Stock / Magasinier : enregistre les entrées et sorties de denrées, **gère les dates de péremption, réalise l'inventaire physique**."*

La prédiction des quantités consommées par denrée est une information de gestion de stock, pas de planification de menu. C'est le responsable stock qui doit anticiper les commandes (son périmètre §5), pas le planificateur dont le rôle est la composition des menus. US-30 (prédiction présences) reste correctement attribuée au planificateur car elle sert à composer le menu.

---

## US-34 — Suggestion si menu déficient

⚠️ **Type d'erreur :** Critère d'acceptation incomplet (contrainte stock absente)

### Énoncé

🔴 **Avant**
> En tant que planificateur, je reçois une suggestion automatique si le menu est déficient en un nutriment.

✅ **Après**
> En tant que planificateur, je reçois une suggestion automatique de recette alternative ou d'ingrédient complémentaire **disponible en stock** si le menu planifié est déficient en un nutriment selon les seuils OMS 6–12 ans.

### Critères d'acceptation

🔴 **Avant**
> Suggestion de recette alternative ou ingrédient complémentaire disponible en stock.

✅ **Après**
> Le système identifie le ou les nutriments déficitaires ; propose uniquement des recettes ou ingrédients dont le stock disponible est suffisant pour les portions prévues ; affiche le gain nutritionnel estimé de chaque suggestion ; le planificateur peut accepter ou ignorer la suggestion sans blocage.

### Justification

📄 **Référence CDC §3.2 — Système de recommandation :**
> *"Suggestion automatique de recettes alternatives ou d'ingrédients complémentaires **disponibles en stock**."*

📄 **Référence CDC — Règle métier n°5 :**
> *"Une recette ne peut être utilisée dans la planification que si tous ses ingrédients sont référencés dans le stock et que les quantités par portion sont renseignées."*

La contrainte "disponible en stock" est fonctionnellement critique : suggérer un ingrédient absent du stock est contraire à la règle métier n°5 et inutilisable en pratique. L'énoncé doit le mentionner explicitement pour que le développement ne produise pas de suggestions théoriques déconnectées de la réalité du stock.

---

## US-35 — Optimisation multicritères

⚠️ **Type d'erreur :** Règle métier dure manquante dans l'énoncé

### Énoncé

🔴 **Avant**
> En tant que planificateur, l'optimisation multicritères respecte budget, stocks, apports nutritionnels et limite le gaspillage simultanément.

✅ **Après**
> En tant que planificateur, l'optimisation multicritères respecte simultanément le budget, les stocks disponibles, les apports nutritionnels et la variété des repas, en limitant le gaspillage — **un menu ne peut être validé que si le bilan nutritionnel atteint 90% des apports recommandés par l'OMS sur la semaine**.

### Critères d'acceptation

🔴 **Avant**
> Score de fitness combinant 4 critères ; contraintes paramétrables par le directeur.

✅ **Après**
> Score de fitness combinant 4 critères (nutrition, coût, variété, gaspillage) ; **seuil minimal de 90% de couverture nutritionnelle OMS non contournable** — tout menu sous ce seuil est bloqué à la validation et signalé au planificateur ; les autres pondérations (budget, gaspillage) sont paramétrables par le directeur ; résultats affichés avec détail du score par critère.

### Justification

📄 **Référence CDC §3.5 — Planification Automatique, Contraintes d'optimisation :**
> *"**Couverture nutritionnelle minimale à 90%** des apports recommandés."*

Le seuil de 90% est défini comme une contrainte d'optimisation, non comme un objectif souple. L'énoncé initial ne le mentionnait pas, ce qui ouvrait la porte à une implémentation où la contrainte nutritionnelle pourrait être sacrifiée au profit du budget ou d'autres critères.

---

## US-37 — Alertes anomalies pointage et sorties hors horaires

⚠️ **Type d'erreur :** Acteur manquant + plage horaire précise absente

### Énoncé

🔴 **Avant**
> En tant que **directeur**, je suis alerté si un pointage dépasse de 20% le nombre d'élèves inscrits ou si une sortie de stock est enregistrée hors des heures de cantine sans justification.

✅ **Après**
> En tant que **directeur et président du CGCS**, je suis alerté (niveau 3 bloquant) si un pointage dépasse de 20% le nombre d'élèves inscrits, ou si une sortie de stock est enregistrée en dehors de la plage **10h–14h** sans justification obligatoire.

### Critères d'acceptation

🔴 **Avant**
> Règles configurables ; justification requise pour lever le blocage niveau 3.

✅ **Après**
> Déclenchement automatique si pointage > nombre d'inscrits + 20% ; déclenchement automatique pour toute sortie de stock hors de la plage 10h–14h ; alerte de niveau 3 : l'opération est bloquée jusqu'à saisie d'une justification validée par le directeur ou le président du CGCS ; notification immédiate envoyée aux deux acteurs ; toutes les anomalies sont consignées dans le journal (US-38).

### Justification

📄 **Référence CDC §3.3 — Détection d'Anomalies, Règles de détection :**
> *"Sortie de stock enregistrée en dehors des heures de cantine **(hors 10h–14h)** sans justification."*

📄 **Référence CDC §3.3 — Traitement :**
> *"Génération d'une alerte de niveau 3 (blocage de l'opération jusqu'à validation manuelle) ; notification immédiate au **directeur et au président du CGCS**."*

La plage horaire exacte 10h–14h est une donnée métier précise qui conditionne l'implémentation du déclencheur. Le président du CGCS est un destinataire explicite des alertes niveau 3 selon le CDC — son absence de l'énoncé empêchait son inclusion dans le système de notification.

---

## US-38 — Journal des anomalies

⚠️ **Type d'erreur :** Acteur manquant (responsable communal exclu à tort)

### Énoncé

🔴 **Avant**
> En tant que **directeur**, je consulte le journal des anomalies avec statut (justifiée, non justifiée, en cours d'investigation).

✅ **Après**
> En tant que **directeur et responsable communal / inspecteur**, je consulte le journal des anomalies avec statut (justifiée, non justifiée, en cours d'investigation) — le directeur peut modifier les statuts, le responsable communal / inspecteur a accès en lecture seule uniquement.

### Critères d'acceptation

🔴 **Avant**
> Journal filtrable ; statut modifiable par le directeur uniquement.

✅ **Après**
> Journal filtrable par type d'anomalie, niveau d'alerte, statut et période ; statut modifiable par le directeur uniquement ; le responsable communal / inspecteur accède au journal en lecture seule pour supervision inter-écoles ; chaque entrée affiche : type d'anomalie, niveau, date, utilisateur concerné, statut courant, justification si fournie.

### Justification

📄 **Référence CDC §5 — Acteurs et Rôles :**
> *"Responsable Communal / Inspecteur (accès lecture seule) : consulte les rapports agrégés de plusieurs écoles **pour supervision**."*

📄 **Référence CDC §3.3 — Journal d'anomalies :**
> *"Historique consultable de toutes les anomalies détectées avec statut (justifiée, non justifiée, en cours d'investigation)."*

La supervision des anomalies entre écoles fait partie du périmètre du responsable communal. Sans accès au journal, il ne peut pas remplir son rôle de contrôle inter-établissements défini en §5.

---

## US-39 — Synchronisation multi-sites

⚠️ **Type d'erreur :** Règle métier de résolution de conflits manquante

### Énoncé

🔴 **Avant**
> En tant qu'administrateur communal, je peux importer les exports JSON incrémentiels de chaque école et fusionner les données avec résolution de conflits.

✅ **Après**
> En tant qu'administrateur communal, je peux importer les exports JSON incrémentiels de chaque école et fusionner les données — en cas de conflit, **la validation manuelle par l'administrateur communal prime toujours sur la règle automatique "dernier modificateur gagne"**.

### Critères d'acceptation

🔴 **Avant**
> Stratégie offline-first ; dernier modificateur gagne ou validation manuelle ; reprise après coupure réseau.

✅ **Après**
> Export incrémental des modifications depuis la dernière synchronisation (format JSON compressé) ; transfert supporté par clé USB, WiFi local et Internet ; import et fusion automatique au niveau communal ; en cas de conflit sur une même donnée : l'administrateur communal est notifié et doit valider manuellement — la règle automatique "dernier modificateur gagne" ne s'applique qu'en l'absence de validation manuelle disponible ; reprise automatique après coupure réseau sans perte de données ; journal de synchronisation consultable.

### Justification

📄 **Référence CDC §3.4 — Résolution de conflits :**
> *"En cas de modification concurrente d'une même donnée, application de règles de priorité (dernier modificateur gagne, **ou validation manuelle par l'administrateur communal**)."*

La hiérarchie de résolution est explicite dans le CDC : la validation manuelle est une option prioritaire, pas une alternative équivalente. L'énoncé initial présentait les deux stratégies comme équivalentes ("ou"), ce qui laissait libre choix à l'implémentation. Or, dans un contexte de traçabilité financière (risques de détournement mentionnés en §1.1), la validation manuelle doit être la voie par défaut.

---

## US-41 — Algorithme génétique

⚠️ **Type d'erreur :** Critères d'acceptation incomplets (deux contraintes d'optimisation manquantes)

### Énoncé

✅ **Inchangé**
> En tant que planificateur, le système génère automatiquement un menu hebdomadaire optimal via algorithme génétique (nutrition ≥ 90%, variété, stock, coût).

### Critères d'acceptation

🔴 **Avant**
> Population de 50 plannings ; score fitness combinant 4 critères ; génération en < 10 s en local.

✅ **Après**
> Population initiale de 50 plannings ; sélection par score de fitness combinant : couverture nutritionnelle (≥ 90% OMS), utilisation prioritaire des denrées proches de la péremption, coût total, variété ; **aucune recette ne peut apparaître deux fois dans un intervalle de 5 jours** ; **les préférences déclarées des enfants (via module de feedback) sont intégrées dans le score de fitness** ; génération en < 10 s en local ; le planificateur peut verrouiller des recettes ou des jours avant lancement (voir US-42).

### Justification

📄 **Référence CDC §3.5 — Contraintes d'optimisation :**
> *"Pas de répétition d'une même recette dans un **intervalle de 5 jours**."*
> *"Respect des **préférences majoritaires des enfants** (données collectées via feedback)."*

Ces deux contraintes sont explicitement listées dans le CDC parmi les quatre contraintes d'optimisation de l'algorithme génétique. Leur absence des critères d'acceptation aurait permis de livrer une story techniquement fonctionnelle mais méthodologiquement incomplète.

---

## US-44 — Vérification intégrité audit + export signé

⚠️ **Type d'erreur :** Acteur manquant + finalité de l'export absente

### Énoncé

🔴 **Avant**
> En tant que **directeur**, je peux vérifier l'intégrité de la chaîne d'audit à tout moment et exporter un rapport signé numériquement.

✅ **Après**
> En tant que **directeur et responsable communal / inspecteur** (accès lecture seule pour ce dernier), je peux vérifier l'intégrité de la chaîne d'audit à tout moment et exporter un rapport signé numériquement pour transmission aux autorités ou bailleurs de fonds.

### Critères d'acceptation

🔴 **Avant**
> Vérification complète en < 5 s ; rapport PDF signé exportable pour les autorités.

✅ **Après**
> Vérification de l'intégrité de la chaîne complète en < 5 s ; toute rupture dans la chaîne de hash est signalée avec identification de l'entrée compromise ; rapport PDF signé numériquement exportable ; le rapport mentionne explicitement sa destination (autorités scolaires, bailleurs de fonds) ; accessible en consultation par le responsable communal / inspecteur.

### Justification

📄 **Référence CDC §3.6 — Export :**
> *"Génération d'un rapport d'audit signé numériquement pour **transmission aux autorités ou bailleurs de fonds**."*

📄 **Référence CDC §5 — Acteurs et Rôles :**
> *"Responsable Communal / Inspecteur (accès lecture seule) : consulte les rapports agrégés de plusieurs écoles pour supervision."*

La finalité de l'export (transmission aux autorités) est une information contextuelle importante qui doit figurer dans l'énoncé pour orienter le format et le contenu du rapport généré. Le responsable communal doit également pouvoir accéder à ce rapport dans le cadre de son rôle de supervision externe.

---

## US-45 — Chiffrement données sensibles

⚠️ **Type d'erreur :** Règle métier de suppression logique absente du backlog

### Énoncé

🔴 **Avant**
> En tant qu'administrateur, les données sensibles (mots de passe, tokens, données personnelles) sont chiffrées au repos.

✅ **Après**
> En tant qu'administrateur, les données sensibles (mots de passe, tokens, données personnelles) sont chiffrées au repos, et **aucune donnée ne peut être supprimée définitivement dans le système — toute suppression est logique uniquement**, avec conservation de l'historique pour la reddition de comptes.

### Critères d'acceptation

🔴 **Avant**
> Chiffrement AES-256 pour les données sensibles ; clé non stockée en clair.

✅ **Après**
> Chiffrement AES-256 pour les données sensibles au repos ; clé de chiffrement non stockée en clair ; **toutes les entités du modèle de données disposent d'un champ `deleted_at` (suppression logique)** ; les requêtes filtrent systématiquement les enregistrements supprimés logiquement ; la suppression définitive est techniquement impossible via l'interface utilisateur pour tous les rôles y compris l'administrateur ; les données supprimées logiquement restent visibles dans les rapports d'audit.

### Justification

📄 **Référence CDC §3.4 — Sécurité et Intégrité :**
> *"**Aucune suppression définitive des données** : suppression logique uniquement, avec conservation de l'historique pour la reddition de comptes."*

Cette règle est une contrainte d'intégrité fondamentale du système — elle s'applique à toutes les entités sans exception. Elle n'était référencée dans aucune story du backlog avant cette correction. Sans elle, un développeur pourrait implémenter des suppressions définitives en base de données (DELETE SQL) sans violer aucun critère d'acceptation existant, ce qui compromettrait l'ensemble de la reddition de comptes.

---

## Récapitulatif des 19 corrections

| US | Type d'erreur | Nature |
|---|---|---|
| US-05 | Acteur incomplet + comportement manquant | Directeur absent + suggestion menu non couverte |
| US-14 | Acteur manquant | Responsable stock absent de la double validation |
| US-15 | Critère incomplet | Statuts "réceptionnée / partiellement réceptionnée" absents |
| US-20 | Valeur arbitraire | Seuil de 5% non sourcé dans le CDC |
| US-21 | Critère ambigu | Traduction UI ≠ traduction rapports exportés |
| US-23 | Mauvais acteur | Gestionnaire → Directeur |
| US-25 | Acteur manquant + comportement manquant | Responsable communal absent + corrélation repas absente |
| US-26 | Mauvais acteur | Gestionnaire → Directeur |
| US-28 | Critère incomplet | Types de graphiques non précisés |
| US-29 | Acteur incomplet | "(accès lecture seule)" absent |
| US-31 | Mauvais acteur | Planificateur → Responsable Stock |
| US-34 | Critère incomplet | Contrainte "disponible en stock" absente de l'énoncé |
| US-35 | Règle métier manquante | Contrainte dure 90% OMS non mentionnée |
| US-37 | Acteur manquant + précision manquante | Président CGCS absent + plage 10h–14h absente |
| US-38 | Acteur manquant | Responsable communal absent |
| US-39 | Règle métier manquante | Hiérarchie résolution conflits absente |
| US-41 | Critères incomplets | Variété 5 jours + préférences enfants absentes |
| US-44 | Acteur manquant + précision manquante | Responsable communal absent + finalité export absente |
| US-45 | Règle métier manquante | Suppression logique uniquement — aucune story ne la couvrait |

---

*Document produit dans le cadre du stage de Master 1 MIAGE — ESMIA Innovation, Antananarivo, Madagascar.*
*Projet SGP-Cantine — Audit de cohérence backlog vs Cahier des Charges M1.*
