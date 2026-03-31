# DSM Frontend

Frontend React/Vite de la plateforme DSM pour le suivi des projets, parcelles, plants, especes, cooperatives et utilisateurs.

## Prerequis

- Node.js 20+
- Un backend Laravel DSM accessible

## Installation

```bash
npm install
```

## Configuration

Copier `.env.example` vers `.env` et adapter l'URL si necessaire.

```env
VITE_API_URL=http://localhost:8000/api
```

`VITE_API_URL` doit pointer vers la racine API Laravel.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Structure

- `src/api`: appels HTTP vers le backend Laravel
- `src/contexts`: etat d'authentification et selection du projet actif
- `src/components`: layouts, guards et composants reutilisables
- `src/pages`: ecrans metier alignes sur les routes Laravel

## Authentification

Le frontend utilise une seule strategie d'authentification:

- `POST /login` pour recuperer `access_token`
- stockage du token dans `localStorage`
- envoi automatique du header `Authorization: Bearer ...`
- recuperation de l'utilisateur courant via `GET /user`

Il n'y a plus de pile parallele basee sur les cookies Sanctum SPA.
