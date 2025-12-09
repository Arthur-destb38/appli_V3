# 🦍 Gorillax V2 — Application de Fitness

Application mobile (Expo/React Native) + API FastAPI pour créer, suivre et partager des séances d'entraînement.

---

## 🚀 Déploiement rapide (1 commande)

```bash
git clone https://github.com/Arthur-destb38/Appli_V2.git
cd Appli_V2
./deploy.sh
```

**C'est tout !** Le script s'occupe de tout :
- ✅ Détecte votre OS (Mac/Linux/Windows)
- ✅ Vérifie les prérequis (Python, Node, pnpm)
- ✅ Installe les dépendances
- ✅ Lance l'API + l'app mobile

### Options du script

```bash
./deploy.sh              # Installation complète + lancement
./deploy.sh --install    # Installation uniquement (sans lancer)
./deploy.sh --api-only   # Lance seulement l'API locale
./deploy.sh --app-only   # Lance seulement l'app mobile
./deploy.sh --tunnel     # Lance avec tunnel public (accessible partout)
./deploy.sh --help       # Affiche l'aide
```

---

## 🌐 API Cloud (Production)

L'API est déployée sur Render et accessible 24/7 :

| Service | URL |
|---------|-----|
| **API** | https://appli-v2.onrender.com |
| **Documentation Swagger** | https://appli-v2.onrender.com/docs |
| **Health Check** | https://appli-v2.onrender.com/health |

> ⚠️ **Note** : Le plan gratuit Render met l'API en veille après 15 min d'inactivité. Le premier appel peut prendre ~30 secondes.

---

## 📋 Prérequis

| Outil | Version | Installation |
|-------|---------|--------------|
| **Python** | 3.10+ | [python.org](https://python.org) |
| **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org) |
| **pnpm** | 8+ | `npm install -g pnpm` |

> **Note** : Le script `deploy.sh` vérifie automatiquement ces prérequis et installe pnpm si nécessaire.

---

## 📁 Structure du projet

```
Appli_V2/
├── deploy.sh          # 🚀 Script de déploiement automatisé
├── api/               # 🐍 API FastAPI (Python)
│   ├── src/api/       # Code source de l'API
│   ├── scripts/       # Scripts utilitaires (seed, reset)
│   ├── migrations/    # Migrations Alembic
│   ├── requirements.txt  # Dépendances Python
│   └── render.yaml    # Configuration Render (cloud)
├── app/               # 📱 App Mobile (Expo/React Native)
│   ├── app/           # Écrans et navigation (Expo Router)
│   ├── src/           # Composants, hooks, services
│   ├── app.json       # Configuration Expo
│   └── eas.json       # Configuration EAS Build
└── docs/              # 📚 Documentation
```

---

## 📱 Tester l'application

### Option 1 : Expo Go (Développement)

```bash
./deploy.sh --app-only
```

Puis scannez le QR code avec l'app **Expo Go** sur votre téléphone.

### Option 2 : APK Android (Production)

```bash
cd app
npx eas-cli build -p android --profile preview --non-interactive
```

L'APK sera disponible sur [expo.dev](https://expo.dev) après le build (~10 min).

---

## 🔧 Installation manuelle (alternative)

### 1) API FastAPI

```bash
cd api
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

### 2) App Expo

```bash
cd app
pnpm install
```

---

## ▶️ Lancement manuel

### API locale (Terminal 1)

```bash
cd api
.venv/bin/uvicorn src.api.main:app --host 0.0.0.0 --port 8000
```

### App Mobile (Terminal 2)

```bash
cd app
pnpm start
```

---

## 🔐 Endpoints API

### Authentification

| Route | Méthode | Description |
|-------|---------|-------------|
| `/auth/register` | POST | Inscription `{username, password}` |
| `/auth/login` | POST | Connexion `{username, password}` |
| `/auth/me` | GET | Profil utilisateur (Bearer token) |

### Exercices

| Route | Méthode | Description |
|-------|---------|-------------|
| `/exercises` | GET | Liste tous les exercices |
| `/exercises/{id}` | GET | Détails d'un exercice |

### Séances

| Route | Méthode | Description |
|-------|---------|-------------|
| `/workouts` | GET | Liste des séances |
| `/workouts` | POST | Créer une séance |
| `/workouts/{id}` | GET | Détails d'une séance |

**Exemple :**

```bash
# Test de l'API cloud
curl https://appli-v2.onrender.com/health

# Liste des exercices
curl https://appli-v2.onrender.com/exercises
```

---

## 🐛 Dépannage

| Problème | Solution |
|----------|----------|
| Port 8000 occupé | `lsof -i :8000` puis `kill <PID>` |
| Port 8081 occupé | `lsof -i :8081` puis `kill <PID>` |
| Expo erreur port | Utilisez Node 20 LTS |
| pnpm non trouvé | `npm install -g pnpm` |
| API lente au premier appel | Normal (plan gratuit Render, ~30s de réveil) |
| App ne se connecte pas | Vérifiez le Wi-Fi (même réseau) |

---

## 🛠️ Commandes utiles

```bash
# Lancer tout
./deploy.sh

# API seule (locale)
./deploy.sh --api-only

# App seule (connectée à l'API cloud)
./deploy.sh --app-only

# Vérifier l'API cloud
curl https://appli-v2.onrender.com/health

# Documentation Swagger
open https://appli-v2.onrender.com/docs

# Reset la base de données locale
cd api && .venv/bin/python scripts/reset_db.py

# Build APK
cd app && npx eas-cli build -p android --profile preview
```

---

## 📚 Documentation

- [Documentation Swagger](https://appli-v2.onrender.com/docs)
- [Roadmap du projet](docs/Roadmap.md)
- [Architecture](docs/arborescence.md)

---

## 🎯 Fonctionnalités

- ✅ Création de séances d'entraînement
- ✅ Bibliothèque de 15+ exercices
- ✅ Suivi des performances
- ✅ Historique des séances
- ✅ Mode hors-ligne (SQLite local)
- ✅ Synchronisation avec l'API cloud
- ✅ Interface moderne et responsive

---

## 📄 Licence

Projet personnel - Gorillax 🦍
