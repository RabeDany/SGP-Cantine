# SGP-Cantine — Frontend MVP

Application de gestion des stocks et planification des repas pour cantines scolaires communautaires (Madagascar — Androy / Anosy).

## Stack

- Vue 3 + TypeScript + Vite
- Tailwind CSS v3
- Pinia (état + persistance localStorage)
- Vue Router (navigation par rôle)

## Démarrage

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173

## Comptes démo (MVP)

| Identifiant | Mot de passe   | Rôle                |
|-------------|----------------|---------------------|
| directeur   | directeur123   | Administrateur      |
| stock       | stock123       | Gestionnaire stock  |
| cuisine     | cuisine123     | Planificateur menu  |
| agent       | agent123       | Agent cantine       |

## User stories MVP couvertes

- **US-01** Fiches denrées
- **US-02** Entrées de stock
- **US-03** Sorties avec blocage si stock insuffisant
- **US-04** Stock temps réel (vert / orange / rouge)
- **US-05** Alertes péremption (7 jours)
- **US-06** Recettes avec ingrédients par portion
- **US-07** Menu hebdomadaire
- **US-08** Liste de courses automatique
- **US-09** Pointage présences
- **US-10** Gestion utilisateurs (4 rôles)
- **US-11** Connexion + accès par rôle

## Données mock

Les données initiales sont dans `src/data/mockData.ts`. Les modifications sont persistées dans le **localStorage** du navigateur.

Pour réinitialiser : vider le localStorage (clés préfixées `sgp-cantine-`).

## Prochaines étapes

- Backend NestJS + PostgreSQL + Prisma
- Docker Compose pour déploiement offline
- Module commandes (Sprint 3)
