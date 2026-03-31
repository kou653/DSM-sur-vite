# DSM Frontend

Frontend React/Vite de la plateforme DSM pour le suivi de projets, parcelles, plants, especes et utilisateurs.

## Prerequis

- Node.js 20+
- Un backend Laravel accessible
- Authentification Laravel Sanctum active cote backend

## Installation

```bash
npm install
```

## Configuration

Copier `.env.example` vers `.env` et adapter l'URL si necessaire.

```env
VITE_API_URL=http://localhost:8000/api
```

`VITE_API_URL` doit pointer vers la racine API Laravel. Le frontend derive automatiquement l'URL `sanctum/csrf-cookie` a partir de cette valeur.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Structure

- `src/api`: appels HTTP vers le backend Laravel
- `src/contexts`: etat d'authentification et contexte global
- `src/components`: layouts, guards et composants reutilisables
- `src/pages`: ecrans metier

## Authentification

Le frontend utilise une seule strategie d'authentification:

- cookie CSRF Sanctum
- session/cookies avec `withCredentials`
- recuperation de l'utilisateur courant via `/user`

Il n'y a plus de pile parallele basee sur un token Bearer dans `localStorage`.
