from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlmodel import Session, select

from ..db import get_session
from ..models import Follower, Share, User
from ..schemas import FeedResponse, FeedItem, FollowRequest

router = APIRouter(prefix="/feed", tags=["feed"])


@router.post("/follow/{followed_id}", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(followed_id: str, payload: FollowRequest, session: Session = Depends(get_session)) -> Response:
    if payload.follower_id == followed_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot_follow_self")

    follower = session.get(User, payload.follower_id)
    followed = session.get(User, followed_id)
    if follower is None or followed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    existing = session.exec(
        select(Follower)
        .where(Follower.follower_id == payload.follower_id)
        .where(Follower.followed_id == followed_id)
    ).first()
    if existing is None:
        session.add(Follower(follower_id=payload.follower_id, followed_id=followed_id))
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/follow/{followed_id}", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(followed_id: str, payload: FollowRequest, session: Session = Depends(get_session)) -> Response:
    statement = (
        select(Follower)
        .where(Follower.follower_id == payload.follower_id)
        .where(Follower.followed_id == followed_id)
    )
    existing = session.exec(statement).first()
    if existing is not None:
        session.delete(existing)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=FeedResponse)
def get_feed(
    user_id: str,
    limit: int = Query(10, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    session: Session = Depends(get_session),
) -> FeedResponse:
    # Mode démo: créer l'utilisateur s'il n'existe pas
    user = session.get(User, user_id)
    if user is None:
        # Créer un utilisateur temporaire pour le feed
        user = User(
            id=user_id,
            username=f"User_{user_id[:8]}",
            email=f"{user_id}@temp.local",
            password_hash="temp_not_for_login",
            consent_to_public_share=True,
        )
        session.add(user)
        session.commit()

    # Affiche les partages publics de tous les utilisateurs (simplifié pour le mode démo)
    statement = select(Share)
    parsed_cursor: Optional[datetime] = None
    if cursor:
        parsed_cursor = datetime.fromisoformat(cursor)
        statement = statement.where(Share.created_at <= parsed_cursor)
    statement = statement.order_by(Share.created_at.desc()).limit(limit + 1)

    shares = session.exec(statement).all()
    next_cursor = None
    if len(shares) > limit:
        next_cursor = shares[-1].created_at
        shares = shares[:limit]

    items = [
        {
            'share_id': share.share_id,
            'owner_id': share.owner_id,
            'owner_username': share.owner_username,
            'workout_title': share.workout_title,
            'exercise_count': share.exercise_count,
            'set_count': share.set_count,
            'created_at': share.created_at,
        }
        for share in shares
    ]

    cursor_value = next_cursor.isoformat() if next_cursor else None
    return FeedResponse(items=items, next_cursor=cursor_value)
