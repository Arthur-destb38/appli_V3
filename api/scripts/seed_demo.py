"""Script pour ajouter des données de démo au feed."""
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import text
from sqlmodel import Session, select
from src.api.db import get_engine
from src.api.models import User, Share, Follower

def seed_demo_data():
    engine = get_engine()
    
    with Session(engine) as session:
        # Vérifier si des données existent déjà
        existing_shares = session.exec(select(Share)).first()
        if existing_shares:
            print("Des données existent déjà. On garde les existantes.")
        
        # Créer/récupérer les utilisateurs de démo
        users_data = [
            {
                "id": "demo-user-1",
                "username": "FitGirl_Marie",
                "email": "fitgirl.marie@demo.local",
                "bio": "Coach fitness 💪 Paris | Objectif: inspirer les autres",
                "objective": "Hypertrophie",
            },
            {
                "id": "demo-user-2",
                "username": "MuscleBro_Tom",
                "email": "musclebro.tom@demo.local",
                "bio": "Powerlifter | 5 ans d'expérience | Never skip leg day 🦵",
                "objective": "Force",
            },
            {
                "id": "demo-user-3",
                "username": "Coach_Alex",
                "email": "coach.alex@demo.local",
                "bio": "Coach certifié | Spécialiste perte de poids & renfo",
                "objective": "Perte de poids",
            },
            {
                "id": "guest-user",
                "username": "Moi",
                "email": "guest@demo.local",
                "bio": None,
                "objective": None,
            },
        ]
        
        for user_data in users_data:
            existing = session.get(User, user_data["id"])
            if existing:
                # Mettre à jour les champs existants
                existing.bio = user_data.get("bio")
                existing.objective = user_data.get("objective")
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
                )
                session.add(user)
        
        session.commit()
        
        # Créer des partages de démo
        shares_data = [
            {
                "owner_id": "demo-user-1",
                "owner_username": "FitGirl_Marie",
                "workout_title": "Push Day - Week 4 💪",
                "exercise_count": 5,
                "set_count": 18,
                "hours_ago": 2,
            },
            {
                "owner_id": "demo-user-2",
                "owner_username": "MuscleBro_Tom",
                "workout_title": "Leg Day Intense 🦵",
                "exercise_count": 6,
                "set_count": 24,
                "hours_ago": 5,
            },
            {
                "owner_id": "demo-user-3",
                "owner_username": "Coach_Alex",
                "workout_title": "Full Body Express ⚡",
                "exercise_count": 8,
                "set_count": 20,
                "hours_ago": 8,
            },
            {
                "owner_id": "demo-user-1",
                "owner_username": "FitGirl_Marie",
                "workout_title": "Back & Biceps 💥",
                "exercise_count": 6,
                "set_count": 21,
                "hours_ago": 24,
            },
            {
                "owner_id": "demo-user-2",
                "owner_username": "MuscleBro_Tom",
                "workout_title": "Chest & Triceps 🔥",
                "exercise_count": 5,
                "set_count": 15,
                "hours_ago": 48,
            },
        ]
        
        for share_data in shares_data:
            share = Share(
                share_id=f"sh_{uuid.uuid4().hex[:12]}",
                owner_id=share_data["owner_id"],
                owner_username=share_data["owner_username"],
                workout_title=share_data["workout_title"],
                exercise_count=share_data["exercise_count"],
                set_count=share_data["set_count"],
                created_at=datetime.now(timezone.utc) - timedelta(hours=share_data["hours_ago"]),
            )
            session.add(share)
        
        session.commit()
        
        # Créer des relations de follow
        follow_relations = [
            ("guest-user", "demo-user-1"),  # Moi suit FitGirl_Marie
            ("guest-user", "demo-user-2"),  # Moi suit MuscleBro_Tom
            ("demo-user-1", "demo-user-2"),  # Marie suit Tom
            ("demo-user-2", "demo-user-1"),  # Tom suit Marie
            ("demo-user-3", "demo-user-1"),  # Alex suit Marie
            ("demo-user-3", "demo-user-2"),  # Alex suit Tom
        ]
        
        for follower_id, followed_id in follow_relations:
            existing = session.exec(
                select(Follower)
                .where(Follower.follower_id == follower_id)
                .where(Follower.followed_id == followed_id)
            ).first()
            if not existing:
                session.add(Follower(follower_id=follower_id, followed_id=followed_id))
        
        session.commit()
        
        print(f"✅ {len(shares_data)} partages de démo créés!")
        print(f"✅ {len(follow_relations)} relations de follow créées!")
        print("🔄 Rafraîchis la page feed pour voir les données.")

if __name__ == "__main__":
    seed_demo_data()

