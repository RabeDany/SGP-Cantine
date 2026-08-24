# CAHIER DES CHARGES
## PROJET : Système de Gestion des Stocks et de la Planification des Repas pour Cantines Scolaires Communautaires (SGP-Cantine)
**Territoire :** Madagascar — Régions rurales d'Androy et Anosy (sud du pays)  
**Cible :** Comités de gestion des cantines scolaires (CGCS), directeurs d'école primaire et associations locales de parents d'élèves  
**Date :** 2026  
**Niveau :** Master 1 — Fonctionnalités avancées au-delà du CRUD

---

## 1. CONTEXTE ET PROBLÉMATIQUE

### 1.1. Situation réelle constatée
À Madagascar, les cantines scolaires communautaires fonctionnent selon un modèle participatif où les comités de gestion (parents, enseignants, représentants locaux) assurent l'approvisionnement, la conservation et la préparation des repas. Pourtant, la gestion des stocks reste quasi exclusivement papier : registres manuels, calculs approximatifs des quantités, absence de visibilité sur les dates de péremption, et conflits récurrents sur la garde des clés du magasin. Les rapports du programme VAHATRA et du Global Nutrition Report 2024 soulignent que les procédures d'achat sont compliquées, les fonds mal coordonnés, et que les inquiétudes sur le détournement de nourriture et de fonds sont fréquentes. Dans certaines écoles, le compromis trouvé est le "double cadenas" (directeur + président du CGCS), ce qui témoigne d'un manque de traçabilité et de confiance.

### 1.2. Problème central
Les comités de gestion des cantines scolaires perdent du temps, gaspillent des denrées et s'exposent à des conflits parce qu'ils ne disposent d'aucun outil structuré pour :
- Enregistrer les entrées et sorties de stock de manière fiable et traçable.
- Planifier les repas de la semaine en fonction des stocks disponibles et du nombre réel d'élèves présents.
- Anticiper les commandes auprès des producteurs locaux (éviter la rupture ou le surstock).
- Établir une reddition de comptes simple et vérifiable par les parents et les autorités.

### 1.3. Objectifs
Concevoir un progiciel autonome et open source permettant à un comité de cantine scolaire de :
- Gérer un stock de denrées alimentaires avec traçabilité des mouvements.
- Planifier les menus hebdomadaires et calculer automatiquement les besoins.
- Suivre les présences des élèves à la cantine pour ajuster les quantités.
- Générer des rapports de consommation et des propositions de commande.
- Fonctionner sans dépendance à un service cloud payant, sans paiement mobile intégré, et avec synchronisation possible en mode hors-ligne.

---

## 2. PÉRIMÈTRE FONCTIONNEL

### 2.1 Module — Référentiel des Denrées et Stock
- **Fiche denrée** : nom, catégorie (céréale, légume, légumineuse, huile, sel, protéine), unité de mesure (kg, litre, unité), seuil d'alerte stock bas, durée de conservation estimée.
- **Enregistrement des entrées de stock** : date, quantité, provenance (achat local, don, partenariat producteur), prix d'achat si applicable, numéro de bon d'entrée.
- **Enregistrement des sorties de stock** : date, quantité, motif (préparation repas, perte, avarie, transfert vers une autre école), lien avec le menu ou la recette concernée.
- **Stock disponible** : visualisation en temps réel des quantités par denrée, avec alertes visuelles (vert/orange/rouge) selon les seuils.
- **Gestion des dates** : alerte sur les produits approchant la péremption (7 jours avant).

### 2.2 Module — Planification des Menus et Recettes
- **Référentiel des recettes** : nom, catégorie (déjeuner, complément nutritionnel), ingrédients avec quantités par portion, instructions simplifiées.
- **Planification hebdomadaire** : sélection des recettes pour chaque jour de la semaine, avec nombre de portions prévu.
- **Calcul automatique des besoins** : à partir du menu planifié et du nombre d'élèves attendus, génération d'une liste de courses (quantités nécessaires par denrée).
- **Comparaison stock vs besoins** : identification des denrées manquantes pour la semaine, génération d'une proposition de commande.

### 2.3 Module — Présences et Paiements
- **Registre des élèves inscrits** à la cantine par classe et par niveau.
- **Pointage quotidien** : enregistrement du nombre d'élèves présents au repas (par classe ou global selon la taille de l'école).
- **Historique des présences** : taux de fréquentation par jour, par semaine, par mois.
- **Gestion des exemptions** : élèves malades, absents, ou bénéficiant d'un repas gratuit (sans saisie de paiement, juste marquage).

### 2.4 Module — Commandes et Fournisseurs
- **Registre des fournisseurs locaux** : nom, contact, type de produits, localisation (village/zone).
- **Bon de commande** : génération à partir de la proposition de commande du module menu, avec quantités, fournisseur suggéré, date de livraison souhaitée.
- **Suivi des commandes** : émise, en attente de livraison, réceptionnée, partiellement réceptionnée.
- **Réception** : saisie des quantités réellement livrées avec mise à jour automatique du stock et constat d'écart.

### 2.5 Module — Rapports et Reddition de Comptes
- **Rapport de stock** : état des stocks à date, mouvements du mois, pertes et avaries.
- **Rapport de consommation** : quantités consommées par denrée, par période, corrélation avec le nombre de repas servis.
- **Rapport de fréquentation** : nombre de repas servis, taux d'absentéisme à la cantine.
- **Fiche de proposition de menu** : export imprimable pour affichage à l'école ou transmission à l'inspection.
- **Traçabilité des mouvements** : qui a saisi quoi, quand, avec horodatage et identifiant utilisateur.

---

## 3. FONCTIONNALITÉS AVANCÉES (NIVEAU M1)

### 3.1 Module — Prévision de la Consommation par Machine Learning
- **Objectif** : anticiper la consommation future des denrées en fonction des données historiques (présences, menus, saisons, jours de la semaine).
- **Entrées du modèle** : historique des pointages (12 derniers mois), historique des consommations par denrée, calendrier scolaire (vacances, jours fériés), saisonnalité (saison des pluies / saison sèche à Madagascar).
- **Sortie** : prédiction du nombre d'élèves présents par jour pour les 7 prochains jours, avec intervalle de confiance ; prédiction des quantités consommées par denrée.
- **Application métier** : ajustement automatique des quantités de la liste de courses générée par le module Planification ; réduction du gaspillage alimentaire et des ruptures de stock.
- **Contrainte** : le modèle doit fonctionner en local sans appel à une API externe ; entraînement incrémental mensuel à partir des nouvelles données collectées.

### 3.2 Module — Optimisation Nutritionnelle des Menus
- **Objectif** : garantir que les menus planifiés respectent les apports nutritionnels recommandés pour des enfants de 6 à 12 ans, tout en utilisant les stocks disponibles.
- **Base de connaissances nutritionnelles** : base de données intégrée des valeurs nutritionnelles (calories, protéines, lipides, glucides, fer, vitamine A) pour chaque denrée du référentiel.
- **Moteur de contraintes** : pour chaque menu planifié, calcul automatique du bilan nutritionnel total par portion ; comparaison avec les seuils recommandés par l'OMS pour la tranche d'âge concernée.
- **Système de recommandation** : si un menu est déficient (ex: manque de protéines), suggestion automatique de recettes alternatives ou d'ingrédients complémentaires disponibles en stock.
- **Visualisation** : graphique radar ou barres montrant la couverture nutritionnelle du menu sur une semaine.

### 3.3 Module — Détection d'Anomalies et Alertes Intelligentes
- **Objectif** : identifier les comportements inhabituels dans la gestion des stocks et des présences pour signaler d'éventuels gaspillages, erreurs ou détournements.
- **Règles de détection** :
  - Écart anormal entre stock théorique et stock physique lors de l'inventaire (écart > 10%). (niveau 2)
  - Consommation d'une denrée supérieure à 150% de la moyenne sur les 4 dernières semaines pour le même nombre d'élèves présents.(niveau 2)
  - Pointage d'élèves supérieur de plus de 20% au nombre d'inscrits sur une journée. (niveau 3)
  - Sortie de stock enregistrée en dehors des heures de cantine (hors 10h-14h) sans justification. (niveau 3)
- **Traitement** : génération d'une alerte de niveau 1 (information), niveau 2 (avertissement avec notification au directeur), ou niveau 3 (blocage de l'opération jusqu'à validation manuelle).
- **Journal d'anomalies** : historique consultable de toutes les anomalies détectées avec statut (justifiée, non justifiée, en cours d'investigation).
- **Anomalies** : 
  - niveau 1 : Des écarts mineurs ne nécessitant pas d'action, des alertes informatives sans risque de détournement
  - niveau 2 : Écart d'inventaire > 10%, Surconsommation > 150%
  - niveau 3 : Pointage supérieur de 20% aux inscrits, Sortie de stock hors horaire 10h–14h

### 3.4 Module — Synchronisation Multi-Sites avec Résolution de Conflits
- **Objectif** : permettre à plusieurs écoles d'une même zone communale de partager leurs données (stocks, commandes groupées, rapports agrégés) malgré une connectivité intermittente.
- **Architecture** : chaque école possède une instance locale autonome ; un nœud central communal (mini-serveur ou poste désigné) agrège les données.
- **Mécanisme de synchronisation** :
  - Export incrémental des modifications depuis la dernière synchronisation (format JSON compressé).
  - Transfert par clé USB, réseau local WiFi, ou connexion Internet lorsque disponible.
  - Import et fusion automatique au niveau communal.
- **Résolution de conflits** : en cas de modification concurrente d'une même donnée (ex: deux écoles modifient la fiche d'un fournisseur commun), application de règles de priorité (dernier modificateur gagne, ou validation manuelle par l'administrateur communal).
- **Agrégation** : génération de rapports consolidés par zone (consommation totale, stocks mutualisables, commandes groupées pour négocier des prix).

### 3.5 Module — Planification Automatique des Menus par Algorithme Génétique
- **Objectif** : générer automatiquement un planning hebdomadaire optimal respectant les contraintes nutritionnelles, les stocks disponibles, la variété des repas, et les préférences des enfants.
- **Contraintes d'optimisation** :
  - Couverture nutritionnelle minimale à 90% des apports recommandés.
  - Utilisation prioritaire des denrées proches de la péremption.
  - Pas de répétition d'une même recette dans un intervalle de 5 jours.
  - Respect des préférences majoritaires des enfants (données collectées via feedback).
- **Algorithme** : algorithme génétique avec population initiale de 50 plannings, sélection par score de fitness combinant nutrition, coût, variété et stock.
- **Interaction utilisateur** : le planificateur peut verrouiller certaines recettes ou jours ; l'algorithme optimise le reste autour de ces contraintes fixes.

### 3.6 Module — Traçabilité Complète et Audit Trail Immuable
- **Objectif** : garantir l'intégrité des données et la non-répudiation des actions pour la reddition de comptes.
- **Mécanisme** : chaînage cryptographique des enregistrements d'audit (chaque entrée d'audit contient le hash de l'entrée précédente), formant une chaîne immuable locale.
- **Contenu de chaque entrée d'audit** : identifiant de l'utilisateur, action réalisée, horodatage précis à la seconde, adresse IP/poste utilisé, hash de l'enregistrement modifié, hash de l'entrée précédente.
- **Vérification d'intégrité** : fonction permettant de vérifier à tout moment l'intégrité de la chaîne d'audit ; détection de toute altération postérieure.
- **Export** : génération d'un rapport d'audit signé numériquement pour transmission aux autorités ou bailleurs de fonds.

---

## 4. EXIGENCES NON-FONCTIONNELLES

### 4.1 Architecture et Déploiement
- Le système doit pouvoir être déployé sur un poste local de l'école (ordinateur de bureau ou mini-PC basse consommation) ou sur un serveur local communal partagé par plusieurs écoles d'une même zone.
- Les données doivent être stockées dans un format ouvert et exportable (JSON, SQL standard), garantissant la propriété des données par le comité de gestion.
- Aucune dépendance à un service cloud payant, à une API externe, ou à une licence propriétaire pour le fonctionnement de base.
- Synchronisation optionnelle : si plusieurs écoles utilisent le système, possibilité d'exporter/importer les données par clé USB ou connexion réseau local pour agrégation communale.

### 4.2 Performance et Disponibilité
- Temps de réponse inférieur à 2 secondes pour l'affichage du stock et la planification d'un menu.
- Capacité à gérer une école de 500 élèves avec un stock de 30 denrées différentes sans dégradation.
- Système opérationnel en continu pendant les heures de cantine (midi), avec redémarrage rapide en cas de coupure de courant.
- Génération d'un planning optimisé par algorithme génétique en moins de 10 secondes.
- Prédiction de consommation par ML en moins de 3 secondes.

### 4.3 Ergonomie et Contexte d'Usage
- Interface principale adaptée à un poste fixe dans le bureau du directeur ou la cuisine de la cantine (écran standard, saisie au clavier).
- Interface simplifiée pour les agents de cantine : grandes icônes, peu de texte, navigation en 3 clics maximum pour les opérations courantes (pointage, sortie stock).
- Support du français et du malgache pour les libellés et les rapports.
- Visualisations graphiques accessibles (camemberts pour la répartition nutritionnelle, courbes pour les tendances de consommation).

### 4.4 Sécurité et Intégrité
- Authentification par identifiant et mot de passe avec hachage sécurisé.
- Droits différenciés : administrateur (paramétrage), gestionnaire de stock (entrées/sorties), planificateur de menu (recettes, menus), agent de cantine (pointage, consultation).
- Piste d'audit : toute modification de stock, toute planification de menu, tout pointage est horodaté et signé électroniquement.
- Aucune suppression définitive des données : suppression logique uniquement, avec conservation de l'historique pour la reddition de comptes.
- Chaîne d'audit immuable avec hachage cryptographique pour garantir l'intégrité des données.

---

## 5. ACTEURS ET RÔLES

- **Président du CGCS / Directeur d'école** : supervise l'ensemble, consulte les rapports, valide les commandes, gère les comptes utilisateurs, consulte les alertes d'anomalies.
- **Responsable Stock / Magasinier** : enregistre les entrées et sorties de denrées, gère les dates de péremption, réalise l'inventaire physique, consulte les prévisions de consommation.
- **Cuisinière / Planificateur** : crée les menus hebdomadaires (manuellement ou via l'optimiseur), consulte les recettes, ajuste les portions selon les présences, valide la couverture nutritionnelle.
- **Agent de Cantine / Surveillant** : effectue le pointage des élèves présents au repas, signale les problèmes de stock.
- **Responsable Communal / Inspecteur** (accès lecture seule) : consulte les rapports agrégés de plusieurs écoles, vérifie l'intégrité des chaînes d'audit, supervise les anomalies.

---

## 6. RÈGLES MÉTIER

1. **Stock positif** : une sortie de stock ne peut être enregistrée que si la quantité disponible est suffisante. En cas d'insuffisance, le système bloque la validation et propose d'ajuster la recette ou de passer une commande.
2. **Pointage avant préparation** : le nombre de portions planifiées pour un jour ne peut être confirmé qu'après le pointage du matin (ou la veille), afin d'ajuster les quantités et éviter le gaspillage.
3. **Alerte de péremption** : une denrée avec une date de péremption dans les 7 jours est signalée en priorité et doit être consommée dans le prochain menu planifié.
4. **Double validation des commandes** : un bon de commande doit être validé par le responsable stock ET le président/directeur avant d'être transmis au fournisseur.
5. **Recette standardisée** : une recette ne peut être utilisée dans la planification que si tous ses ingrédients sont référencés dans le stock et que les quantités par portion sont renseignées.
6. **Calcul des pertes** : toute denrée déclarée comme "avariée" ou "perdue" doit être justifiée par un commentaire et est comptabilisée dans un rapport mensuel distinct pour la reddition de comptes.
7. **Inventaire obligatoire** : toute clôture mensuelle nécessite la validation d'un inventaire physique (saisie des comptages réels) ; l'écart avec le stock théorique est calculé et doit être commenté.
8. **Export de sauvegarde** : le système propose automatiquement un export des données du mois à la clôture, stocké localement et copiable sur clé USB.
9. **Validation nutritionnelle** : un menu hebdomadaire ne peut être validé que si le bilan nutritionnel atteint au moins 90% des apports recommandés sur l'ensemble de la semaine.
10. **Bloquant sur anomalie niveau 3** : une anomalie de niveau 3 (détection de détournement potentiel) bloque l'opération concernée et notifie immédiatement le directeur et le président du CGCS.
11. **Priorité algorithme génétique** : lors de la génération automatique d'un planning, les denrées proches de la péremption sont systématiquement intégrées en priorité dans les recettes proposées.
12. **Consensus synchronisation** : en cas de conflit de données lors de la synchronisation multi-sites, la résolution manuelle par l'administrateur communal prime sur la règle automatique "dernier modificateur gagne".

---

## 7. STRATÉGIE DE PACKAGING ET DÉPLOIEMENT (DOCKER LOCAL)

Afin de répondre aux contraintes d'isolement, de pannes d'électricité et d'absence de connectivité Internet sur le terrain, les choix et solutions techniques suivants ont été retenus.

### 7.1. Architecture Technologique Validée
- **Frontend :** Vue.js 3 + Tailwind CSS v3 + TypeScript
- **Backend :** NestJS + TypeScript
- **SGBD & ORM :** PostgreSQL + Prisma ORM (Prisma 6)
- **Environnement :** Docker & Docker Compose

L'application s'organise localement sur la machine hôte de l'école (ou sur un serveur local) sous forme de 3 conteneurs isolés : un serveur NGINX servant le bundle Vue.js, l'API NestJS, et l'instance PostgreSQL.

### 7.2. Solutions pour Faciliter le Déploiement Initial (Offline)
Puisque les écoles ne possèdent pas d'accès Internet stable pour télécharger des images en ligne, le protocole de déploiement s'appuie sur deux piliers :

* **Le Packaging Offline (`docker save`) :** L'ensemble des images Docker de l'application est pré-compilé et exporté sur une clé USB sous la forme d'un unique fichier compressé (`sgp-cantine-images.tar`) grâce à la commande `docker save`.
* **Le Script d'Installation en Un Clic :** La clé USB contient un script d'installation automatisé adapté à l'OS du poste cible (un fichier `.bat` pour Windows ou un fichier `.sh` pour Linux). Ce script se charge d'installer le moteur Docker, de charger l'archive des images (`docker load -i`) et d'initialiser les volumes persistants pour PostgreSQL.

### 7.3. Solutions pour Faciliter l'Utilisation Quotidienne sur le Terrain
Afin de rendre la présence de Docker totalement transparente pour le personnel de l'école, les mécanismes d'usage suivants sont mis en place :

* **Le Lancement Automatique au Démarrage (Boot Service) :** Les conteneurs possèdent la directive `restart: always` dans le fichier `docker-compose.yml`. Si l'ordinateur subit une coupure d'électricité brutale, le système relance automatiquement la base de données et l'API dès le retour du courant et le redémarrage du PC.
* **Le Raccourci Web en "Mode Application" :** Un raccourci est créé sur le bureau de l'ordinateur du directeur. Il utilise le mode application du navigateur Chromium/Chrome (via le drapeau `--app=http://localhost:8080`). Cela masque la barre d'adresse et les onglets pour offrir l'interface épurée d'un logiciel de bureau standard.
* **Le Point d'Accès Wi-Fi Local (Réseau LAN Hors-ligne) :** Si l'école s'équipe d'un routeur Wi-Fi local (sans abonnement Internet), le PC hôte partage l'application sur le réseau local. L'agent de cantine peut ainsi effectuer le pointage des élèves sur un smartphone ou une tablette directement depuis la cuisine en se connectant à l'IP locale du serveur.
* **Export de Sauvegarde en 1 Clic :** Directement depuis l'interface d'administration Vue.js, un bouton permet d'ordonner au backend NestJS d'exécuter un `pg_dump` ou un export JSON de la base de données. Le fichier généré est instantanément téléchargeable pour être copié sur clé USB à des fins de sauvegarde ou de transmission à la commune.

