"""Script pour ajouter des données de démo au feed avec de vraies séances."""
import uuid
import random
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from sqlmodel import Session, select
from src.api.db import get_engine
from src.api.models import User, Share, Follower, Workout, WorkoutExercise, Set, Exercise


def get_exercises_by_muscle(session: Session) -> dict:
    """Récupère les exercices groupés par groupe musculaire avec mapping simplifié."""
    exercises = session.exec(select(Exercise)).all()
    by_muscle = {}
    
    # Mapping des groupes musculaires vers des catégories simples
    muscle_mapping = {
        # Poitrine
        "pectorals": "chest", "upper pectorals": "chest", "lower pectorals": "chest",
        "mid pectorals": "chest", "pectorals (sternal head)": "chest",
        "pectorals (clavicular head)": "chest",
        # Épaules
        "anterior deltoids": "shoulders", "lateral deltoids": "shoulders",
        "posterior deltoids": "shoulders", "rear deltoids": "shoulders",
        "deltoids": "shoulders", "deltoids (anterior, medial)": "shoulders",
        "deltoids (lateral, posterior)": "shoulders", "rear delts": "shoulders",
        # Dos
        "lats": "back", "mid back": "back", "upper trapezius": "back",
        "trapezius (upper)": "back",
        # Triceps
        "triceps": "triceps", "triceps (medial, lateral)": "triceps",
        "triceps (lateral head)": "triceps", "triceps (long head)": "triceps",
        # Biceps
        "biceps brachii": "biceps", "brachialis": "biceps",
        "biceps (long head)": "biceps", "biceps (short head)": "biceps",
        # Jambes
        "quadriceps": "quadriceps", "quadriceps,glutes": "quadriceps",
        "hamstrings": "hamstrings", "glutes,hamstrings": "hamstrings",
        "glutes": "glutes", "gluteus medius": "glutes",
        "adductors": "glutes",
        "calves": "calves", "soleus": "calves", "gastrocnemius": "calves",
        "tibialis anterior": "calves",
        # Core
        "rectus abdominis": "core", "obliques": "core", "lower abs": "core",
        "grip,traps,core": "core",
        # Avant-bras
        "forearms": "forearms",
    }
    
    for ex in exercises:
        original = (ex.muscle_group or "other").lower()
        simplified = muscle_mapping.get(original, original)
        if simplified not in by_muscle:
            by_muscle[simplified] = []
        by_muscle[simplified].append(ex)
    
    return by_muscle


def create_workout_with_exercises(
    session: Session,
    user_id: str,
    title: str,
    exercises_config: list[dict],
    hours_ago: int,
    exercises_by_muscle: dict,
) -> tuple[str, int, int]:
    """
    Crée une séance complète avec exercices et sets.
    exercises_config: liste de {"muscle": "chest", "sets": 4, "reps": (8, 12), "weight": (40, 80)}
    Retourne (workout_id, exercise_count, set_count)
    """
    workout_time = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    workout = Workout(
        user_id=user_id,
        title=title,
        status="completed",
        started_at=workout_time - timedelta(minutes=random.randint(45, 90)),
        ended_at=workout_time,
        created_at=workout_time,
        updated_at=workout_time,
    )
    session.add(workout)
    session.flush()
    
    total_exercises = 0
    total_sets = 0
    
    for idx, config in enumerate(exercises_config):
        muscle = config["muscle"].lower()
        available = exercises_by_muscle.get(muscle, [])
        
        if not available:
            # Fallback: prendre n'importe quel exercice
            all_exercises = [ex for exs in exercises_by_muscle.values() for ex in exs]
            if not all_exercises:
                continue
            exercise = random.choice(all_exercises)
        else:
            exercise = random.choice(available)
        
        workout_exercise = WorkoutExercise(
            workout_id=workout.id,
            exercise_id=exercise.id,
            order_index=idx,
            planned_sets=config["sets"],
        )
        session.add(workout_exercise)
        session.flush()
        
        total_exercises += 1
        
        # Créer les sets
        for set_idx in range(config["sets"]):
            reps_range = config.get("reps", (8, 12))
            weight_range = config.get("weight", (20, 60))
            
            workout_set = Set(
                workout_exercise_id=workout_exercise.id,
                order=set_idx,
                reps=random.randint(reps_range[0], reps_range[1]),
                weight=round(random.uniform(weight_range[0], weight_range[1]), 1),
                rpe=round(random.uniform(7, 9.5), 1),
                completed=True,
                done_at=workout_time - timedelta(minutes=random.randint(5, 60)),
            )
            session.add(workout_set)
            total_sets += 1
    
    return workout.id, total_exercises, total_sets


def seed_demo_data():
    engine = get_engine()
    
    with Session(engine) as session:
        # Récupérer les exercices par muscle
        exercises_by_muscle = get_exercises_by_muscle(session)
        
        if not exercises_by_muscle:
            print("⚠️ Aucun exercice en base. Les séances seront vides.")
        else:
            print(f"📚 {sum(len(v) for v in exercises_by_muscle.values())} exercices disponibles")
            print(f"   Groupes: {', '.join(exercises_by_muscle.keys())}")
        
        # Créer/récupérer les utilisateurs de démo
        users_data = [
            {
                "id": "demo-user-1",
                "username": "FitGirl_Marie",
                "email": "fitgirl.marie@demo.local",
                "bio": "Coach fitness 💪 Paris | Objectif: inspirer les autres",
                "objective": "Hypertrophie",
                "avatar_url": "https://i.pravatar.cc/150?u=marie",
            },
            {
                "id": "demo-user-2",
                "username": "MuscleBro_Tom",
                "email": "musclebro.tom@demo.local",
                "bio": "Powerlifter | 5 ans d'expérience | Never skip leg day 🦵",
                "objective": "Force",
                "avatar_url": "https://i.pravatar.cc/150?u=tom",
            },
            {
                "id": "demo-user-3",
                "username": "Coach_Alex",
                "email": "coach.alex@demo.local",
                "bio": "Coach certifié | Spécialiste perte de poids & renfo",
                "objective": "Perte de poids",
                "avatar_url": "https://i.pravatar.cc/150?u=alex",
            },
            {
                "id": "guest-user",
                "username": "Moi",
                "email": "guest@demo.local",
                "bio": None,
                "objective": None,
                "avatar_url": None,
            },
        ]
        
        for user_data in users_data:
            existing = session.get(User, user_data["id"])
            if existing:
                existing.bio = user_data.get("bio")
                existing.objective = user_data.get("objective")
                existing.avatar_url = user_data.get("avatar_url")
                session.add(existing)
            else:
                user = User(
                    id=user_data["id"],
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash="demo_hash_not_for_login",
                    consent_to_public_share=True,
                    bio=user_data.get("bio"),
                    objective=user_data.get("objective"),
                    avatar_url=user_data.get("avatar_url"),
                )
                session.add(user)
        
        session.commit()
        
        # Définir les séances de démo avec de vrais exercices
        workouts_config = [
            {
                "owner_id": "demo-user-1",
                "owner_username": "FitGirl_Marie",
                "title": "Push Day - Week 4 💪",
                "hours_ago": 2,
                "exercises": [
                    {"muscle": "chest", "sets": 4, "reps": (8, 12), "weight": (30, 50)},
                    {"muscle": "chest", "sets": 4, "reps": (10, 15), "weight": (20, 35)},
                    {"muscle": "shoulders", "sets": 3, "reps": (10, 12), "weight": (8, 15)},
                    {"muscle": "shoulders", "sets": 3, "reps": (12, 15), "weight": (6, 12)},
                    {"muscle": "triceps", "sets": 4, "reps": (10, 15), "weight": (15, 30)},
                ],
            },
            {
                "owner_id": "demo-user-2",
                "owner_username": "MuscleBro_Tom",
                "title": "Leg Day Intense 🦵",
                "hours_ago": 5,
                "exercises": [
                    {"muscle": "quadriceps", "sets": 5, "reps": (5, 8), "weight": (100, 160)},
                    {"muscle": "quadriceps", "sets": 4, "reps": (8, 12), "weight": (80, 120)},
                    {"muscle": "hamstrings", "sets": 4, "reps": (10, 12), "weight": (60, 100)},
                    {"muscle": "glutes", "sets": 4, "reps": (12, 15), "weight": (40, 80)},
                    {"muscle": "calves", "sets": 4, "reps": (15, 20), "weight": (60, 100)},
                    {"muscle": "quadriceps", "sets": 3, "reps": (12, 15), "weight": (40, 70)},
                ],
            },
            {
                "owner_id": "demo-user-3",
                "owner_username": "Coach_Alex",
                "title": "Full Body Express ⚡",
                "hours_ago": 8,
                "exercises": [
                    {"muscle": "chest", "sets": 3, "reps": (10, 15), "weight": (40, 60)},
                    {"muscle": "back", "sets": 3, "reps": (10, 12), "weight": (50, 80)},
                    {"muscle": "shoulders", "sets": 3, "reps": (12, 15), "weight": (10, 20)},
                    {"muscle": "quadriceps", "sets": 3, "reps": (12, 15), "weight": (60, 100)},
                    {"muscle": "hamstrings", "sets": 3, "reps": (12, 15), "weight": (40, 70)},
                    {"muscle": "biceps", "sets": 2, "reps": (12, 15), "weight": (10, 18)},
                    {"muscle": "triceps", "sets": 2, "reps": (12, 15), "weight": (15, 25)},
                    {"muscle": "core", "sets": 2, "reps": (15, 20), "weight": (0, 10)},
                ],
            },
            {
                "owner_id": "demo-user-1",
                "owner_username": "FitGirl_Marie",
                "title": "Back & Biceps 💥",
                "hours_ago": 24,
                "exercises": [
                    {"muscle": "back", "sets": 4, "reps": (8, 12), "weight": (40, 60)},
                    {"muscle": "back", "sets": 4, "reps": (10, 12), "weight": (35, 55)},
                    {"muscle": "back", "sets": 3, "reps": (12, 15), "weight": (25, 40)},
                    {"muscle": "biceps", "sets": 3, "reps": (10, 12), "weight": (8, 14)},
                    {"muscle": "biceps", "sets": 3, "reps": (12, 15), "weight": (6, 12)},
                    {"muscle": "forearms", "sets": 3, "reps": (15, 20), "weight": (10, 20)},
                ],
            },
            {
                "owner_id": "demo-user-2",
                "owner_username": "MuscleBro_Tom",
                "title": "Chest & Triceps 🔥",
                "hours_ago": 48,
                "exercises": [
                    {"muscle": "chest", "sets": 5, "reps": (3, 6), "weight": (100, 140)},
                    {"muscle": "chest", "sets": 4, "reps": (8, 10), "weight": (70, 100)},
                    {"muscle": "chest", "sets": 3, "reps": (12, 15), "weight": (20, 35)},
                    {"muscle": "triceps", "sets": 4, "reps": (8, 12), "weight": (30, 50)},
                    {"muscle": "triceps", "sets": 3, "reps": (12, 15), "weight": (20, 35)},
                ],
            },
        ]
        
        # Créer les séances et partages
        created_shares = 0
        for config in workouts_config:
            # Créer la séance avec exercices
            workout_id, exercise_count, set_count = create_workout_with_exercises(
                session=session,
                user_id=config["owner_id"],
                title=config["title"],
                exercises_config=config["exercises"],
                hours_ago=config["hours_ago"],
                exercises_by_muscle=exercises_by_muscle,
            )
            
            # Créer le partage lié à la séance
            share = Share(
                share_id=f"sh_{uuid.uuid4().hex[:12]}",
                owner_id=config["owner_id"],
                owner_username=config["owner_username"],
                workout_id=workout_id,
                workout_title=config["title"],
                exercise_count=exercise_count,
                set_count=set_count,
                created_at=datetime.now(timezone.utc) - timedelta(hours=config["hours_ago"]),
            )
            session.add(share)
            created_shares += 1
            print(f"   ✓ {config['title']}: {exercise_count} exos, {set_count} séries")
        
        session.commit()
        
        # Créer des relations de follow
        follow_relations = [
            ("guest-user", "demo-user-1"),
            ("guest-user", "demo-user-2"),
            ("guest-user", "demo-user-3"),
            ("demo-user-1", "demo-user-2"),
            ("demo-user-2", "demo-user-1"),
            ("demo-user-3", "demo-user-1"),
            ("demo-user-3", "demo-user-2"),
        ]
        
        created_follows = 0
        for follower_id, followed_id in follow_relations:
            existing = session.exec(
                select(Follower)
                .where(Follower.follower_id == follower_id)
                .where(Follower.followed_id == followed_id)
            ).first()
            if not existing:
                session.add(Follower(follower_id=follower_id, followed_id=followed_id))
                created_follows += 1
        
        session.commit()
        
        print(f"\n✅ {created_shares} séances de démo créées avec de vrais exercices!")
        print(f"✅ {created_follows} relations de follow créées!")
        print("🔄 Rafraîchis la page feed pour voir les données.")


if __name__ == "__main__":
    seed_demo_data()
