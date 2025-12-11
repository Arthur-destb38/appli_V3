"""API endpoints pour la découverte (Explore)."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func
from typing import Optional

from ..db import get_session
from ..models import User, Share, Like, Follower

router = APIRouter(prefix="/explore", tags=["explore"])


class TrendingPost(BaseModel):
    share_id: str
    owner_id: str
    owner_username: str
    workout_title: str
    exercise_count: int
    set_count: int
    like_count: int
    created_at: str


class SuggestedUser(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str]
    bio: Optional[str]
    objective: Optional[str]
    followers_count: int
    posts_count: int


class ExploreResponse(BaseModel):
    trending_posts: list[TrendingPost]
    suggested_users: list[SuggestedUser]


class SearchResult(BaseModel):
    users: list[SuggestedUser]
    posts: list[TrendingPost]


@router.get("/trending", response_model=list[TrendingPost])
def get_trending_posts(
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_session)
) -> list[TrendingPost]:
    """Récupérer les posts les plus populaires (par likes)."""
    
    # Récupérer tous les shares avec leur nombre de likes
    shares = session.exec(select(Share).order_by(Share.created_at.desc()).limit(100)).all()
    
    posts_with_likes = []
    for share in shares:
        like_count = session.exec(
            select(func.count()).select_from(Like).where(Like.share_id == share.share_id)
        ).one()
        posts_with_likes.append({
            "share": share,
            "like_count": like_count,
        })
    
    # Trier par likes (décroissant) puis par date
    posts_with_likes.sort(key=lambda x: (-x["like_count"], -x["share"].created_at.timestamp()))
    
    return [
        TrendingPost(
            share_id=p["share"].share_id,
            owner_id=p["share"].owner_id,
            owner_username=p["share"].owner_username,
            workout_title=p["share"].workout_title,
            exercise_count=p["share"].exercise_count,
            set_count=p["share"].set_count,
            like_count=p["like_count"],
            created_at=p["share"].created_at.isoformat(),
        )
        for p in posts_with_likes[:limit]
    ]


@router.get("/suggested-users", response_model=list[SuggestedUser])
def get_suggested_users(
    current_user_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=30),
    session: Session = Depends(get_session)
) -> list[SuggestedUser]:
    """Récupérer des suggestions d'utilisateurs à suivre."""
    
    # Récupérer les utilisateurs que l'utilisateur courant ne suit pas déjà
    all_users = session.exec(select(User)).all()
    
    # Filtrer les utilisateurs déjà suivis
    following_ids = set()
    if current_user_id:
        following = session.exec(
            select(Follower.followed_id).where(Follower.follower_id == current_user_id)
        ).all()
        following_ids = set(following)
        following_ids.add(current_user_id)  # Exclure soi-même
    
    suggested = []
    for user in all_users:
        if user.id in following_ids:
            continue
        
        # Compter les followers et posts
        followers_count = session.exec(
            select(func.count()).select_from(Follower).where(Follower.followed_id == user.id)
        ).one()
        
        posts_count = session.exec(
            select(func.count()).select_from(Share).where(Share.owner_id == user.id)
        ).one()
        
        suggested.append(SuggestedUser(
            id=user.id,
            username=user.username,
            avatar_url=user.avatar_url,
            bio=user.bio,
            objective=user.objective,
            followers_count=followers_count,
            posts_count=posts_count,
        ))
    
    # Trier par nombre de followers (les plus populaires en premier)
    suggested.sort(key=lambda x: -x.followers_count)
    
    return suggested[:limit]


@router.get("/search", response_model=SearchResult)
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_session)
) -> SearchResult:
    """Rechercher des utilisateurs et des posts."""
    
    query = q.lower().strip()
    
    # Rechercher des utilisateurs
    users = session.exec(select(User)).all()
    matching_users = []
    for user in users:
        if query in user.username.lower() or (user.bio and query in user.bio.lower()):
            followers_count = session.exec(
                select(func.count()).select_from(Follower).where(Follower.followed_id == user.id)
            ).one()
            posts_count = session.exec(
                select(func.count()).select_from(Share).where(Share.owner_id == user.id)
            ).one()
            
            matching_users.append(SuggestedUser(
                id=user.id,
                username=user.username,
                avatar_url=user.avatar_url,
                bio=user.bio,
                objective=user.objective,
                followers_count=followers_count,
                posts_count=posts_count,
            ))
    
    # Rechercher des posts
    shares = session.exec(select(Share)).all()
    matching_posts = []
    for share in shares:
        if query in share.workout_title.lower() or query in share.owner_username.lower():
            like_count = session.exec(
                select(func.count()).select_from(Like).where(Like.share_id == share.share_id)
            ).one()
            
            matching_posts.append(TrendingPost(
                share_id=share.share_id,
                owner_id=share.owner_id,
                owner_username=share.owner_username,
                workout_title=share.workout_title,
                exercise_count=share.exercise_count,
                set_count=share.set_count,
                like_count=like_count,
                created_at=share.created_at.isoformat(),
            ))
    
    return SearchResult(
        users=matching_users[:limit],
        posts=matching_posts[:limit],
    )


@router.get("", response_model=ExploreResponse)
def get_explore(
    current_user_id: Optional[str] = None,
    session: Session = Depends(get_session)
) -> ExploreResponse:
    """Page Explore complète avec trending et suggestions."""
    
    trending = get_trending_posts(limit=12, session=session)
    suggested = get_suggested_users(current_user_id=current_user_id, limit=5, session=session)
    
    return ExploreResponse(
        trending_posts=trending,
        suggested_users=suggested,
    )

