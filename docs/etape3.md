


### Étape 3 — Historique simple

🎯 Objectif général

Cette étape consiste à offrir à l’utilisateur une vue claire et motivante de sa progression. L’application doit afficher un historique des séances triées par date, et permettre d’ouvrir rapidement le détail complet d’une séance ou la progression sur un exercice donné. L’objectif est la lisibilité et la rapidité d’accès à l’information.

En deux clics, l’utilisateur doit pouvoir retrouver sa dernière performance et visualiser son évolution sous forme de graphique simple.

⸻

🧱 Contenu fonctionnel

1. Liste des séances (écran Historique)
	•	But : afficher toutes les séances passées, terminées ou en cours, triées par date décroissante.
	•	Contenus :
	•	Carte par séance : titre, date, nombre d’exercices, durée estimée ou totale.
	•	Indicateur visuel (terminée / brouillon / synchronisée).
	•	Filtres :
	•	Par période (semaine / mois / tout).
	•	Par exercice (ex. ne montrer que les séances contenant “Développé couché”).
	•	Interactions :
	•	Clic sur une carte → ouvre le détail séance.
	•	Barre de recherche facultative pour retrouver un titre de séance.

2. Détail d’une séance
	•	But : revoir les exercices, séries et performances d’une séance terminée.
	•	Contenus :
	•	Nom de la séance, date, durée.
	•	Liste d’exercices : pour chaque exercice, les séries effectuées (poids × reps × RPE).
	•	Possibilité de dupliquer la séance pour la relancer.
	•	UX :
	•	Présentation type “accordéon” ou cartes empilées par exercice.
	•	Afficher un petit résumé (ex. charge totale soulevée sur la séance).

3. Graphique de progression (par exercice)
	•	But : visualiser l’évolution des performances sur un exercice spécifique.
	•	Indicateur clé : charge × reps ou charge maximale atteinte.
	•	Librairies possibles :
	•	react-native-svg-charts, Victory Native, ou Recharts (selon la simplicité souhaitée).
	•	Données nécessaires :
	•	Historique des séances incluant cet exercice.
	•	Chaque point = une séance (x = date, y = charge × reps ou poids max).
	•	UX :
	•	Graphique minimaliste, courbe ou barres.
	•	Légende facultative, unité claire (kg ou lbs selon paramètres futurs).

⸻

🔗 Intégration backend (API / Sync)
	•	Endpoint principal : GET /workouts?user_id=&from=&to=
	•	Permet de récupérer les séances pour un utilisateur, éventuellement filtrées par période.
	•	Pour un usage offline, on lit directement la base SQLite locale.
	•	Sync (si activée) : les séances terminées sont marquées comme “synchronisées” une fois envoyées à l’API.
	•	Payload type :

{
  "id": 4,
  "title": "Pecs/Triceps",
  "created_at": "2025-10-28T10:00:00Z",
  "exercises": [
    {
      "exercise_id": 1,
      "name": "Développé couché",
      "sets": [
        {"reps": 8, "weight": 60, "rpe": 8, "done_at": "..."}
      ]
    }
  ]
}


⸻

🗓️ Sous-sprints recommandés

**Sprint 3A — Liste & filtres offline**
	•	Implémenter la liste triée, états empty/loading et filtres locaux.
	•	Tests : unitaires sur formatage des séances, RTL couvrant la navigation vers le détail.

**Sprint 3B — Détail séance & duplication**
	•	Construire la fiche séance et la duplication locale.
	•	Tests : intégration (API mock) pour la duplication, tests de contrat `/workouts` (snapshot) dans la CI.

**Sprint 3C — Visualisation**
	•	Intégrer le graphique (Victory ou équivalent) et calculer les métriques (charge × reps).
	•	Tests : unitaires sur les helpers de calcul, snapshot visuel/RTL pour éviter les régressions de rendu.

⸻

🧭 Navigation & ergonomie
	•	Depuis l’Accueil, un bouton “Historique” amène à la liste des séances.
	•	Depuis l’Historique, un clic ouvre la séance détaillée.
	•	Depuis la fiche d’un exercice, on peut ouvrir la vue graphique associée.

Chemin complet : Accueil → Historique → Détail séance → Graphique (≤ 2 interactions majeures).

⸻

🧪 Tests rapides
	1.	Affichage historique : voir toutes les séances triées par date décroissante.
	2.	Filtrage : sélectionner un exercice précis → seules les séances correspondantes apparaissent.
	3.	Détail séance : vérifier la cohérence des données affichées (reps, poids, RPE, etc.).
	4.	Graphique progression : après 3 séances sur un même exercice, le graphique affiche 3 points distincts.

⸻

✅ Definition of Done (DoD)
	•	L’utilisateur retrouve sa dernière séance en ≤ 2 clics.
	•	L’écran de détail affiche correctement toutes les séries effectuées.
	•	Le graphique montre une progression lisible et fiable (≥ 3 points si 3 séances).
	•	Les filtres de date et d’exercice fonctionnent localement.
	•	Aucune dépendance réseau critique : consultation disponible offline.
	•	Suites de tests associées (unitaires, RTL, snapshot graphique) intégrées et vertes dans la CI.

⸻

⚠️ Points d’attention
	•	Éviter les écrans lourds (garder le graphique simple et fluide, sans animations complexes).
	•	Vérifier les performances d’affichage si >100 séances enregistrées (pagination ou lazy loading).
	•	Anticiper l’évolution du modèle (possibilité d’ajouter d’autres métriques : durée, volume total, etc.).

⸻

💡 Résumé opérationnel
	•	L’utilisateur voit son passé d’entraînement et mesure ses progrès en un instant.
	•	L’historique repose sur les mêmes données locales que la séance (cohérence DB garantie).
	•	La visualisation donne un feedback concret qui renforce l’engagement.

Cette étape clôt le cœur du mode “solo” de l’app : création, suivi, et rétrospective. À partir d’ici, on pourra construire le mode “partage” et les interactions communautaires.
