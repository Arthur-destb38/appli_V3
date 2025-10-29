from collections.abc import Iterable

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from sqlmodel import select

from ..db import get_session
from ..models import Exercise
from ..schemas import ExerciseCreate
from ..schemas import ExerciseRead

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseRead], summary="List exercises")
def list_exercises(session=Depends(get_session)) -> list[ExerciseRead]:
    statement = select(Exercise)
    results = session.exec(statement).all()
    return [ExerciseRead.model_validate(result) for result in results]


@router.get(
    "/{exercise_id}",
    response_model=ExerciseRead,
    summary="Get exercise by id",
)
def get_exercise(exercise_id: int, session=Depends(get_session)) -> ExerciseRead:
    exercise = session.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercise {exercise_id} not found",
        )
    return ExerciseRead.model_validate(exercise)


@router.post("", response_model=ExerciseRead, status_code=status.HTTP_201_CREATED)
def create_exercise(
    payload: ExerciseCreate,
    session=Depends(get_session),
) -> ExerciseRead:
    exercise = Exercise(**payload.model_dump())
    session.add(exercise)
    session.commit()
    session.refresh(exercise)
    return ExerciseRead.model_validate(exercise)


@router.post("/bulk", response_model=list[ExerciseRead], status_code=status.HTTP_201_CREATED)
def create_exercises_bulk(
    payloads: Iterable[ExerciseCreate],
    session=Depends(get_session),
) -> list[ExerciseRead]:
    exercises = [Exercise(**payload.model_dump()) for payload in payloads]
    session.add_all(exercises)
    session.commit()
    refreshed: list[ExerciseRead] = []
    for exercise in exercises:
        session.refresh(exercise)
        refreshed.append(ExerciseRead.model_validate(exercise))
    return refreshed
