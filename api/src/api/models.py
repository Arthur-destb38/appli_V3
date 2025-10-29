from datetime import datetime

from sqlmodel import Field
from sqlmodel import SQLModel


class Exercise(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    muscle_group: str
    equipment: str
    description: str | None = None
    image_url: str | None = None
    source_type: str = Field(default="local")
    source_value: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExerciseAlias(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    exercise_id: int = Field(foreign_key="exercise.id")
    name: str = Field(index=True)


class Workout(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkoutExercise(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    workout_id: int = Field(foreign_key="workout.id")
    exercise_id: int = Field(foreign_key="exercise.id")
    order_index: int = Field(default=0, index=True)


class WorkoutSet(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    workout_exercise_id: int = Field(foreign_key="workoutexercise.id")
    reps: int
    weight: float | None = None
    rpe: float | None = None
    done_at: datetime | None = None
