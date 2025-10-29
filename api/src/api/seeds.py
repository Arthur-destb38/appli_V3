from dataclasses import dataclass

from sqlmodel import Session

from .db import get_engine
from .db import init_db
from .models import Exercise


@dataclass(frozen=True)
class SeedExercise:
    name: str
    muscle_group: str
    equipment: str
    description: str
    source_type: str = "local"
    source_value: str | None = None


SEED_EXERCISES: tuple[SeedExercise, ...] = (
    SeedExercise(
        name="Squat",
        muscle_group="legs",
        equipment="barbell",
        description="Back squat focusing on quads and glutes.",
    ),
    SeedExercise(
        name="Deadlift",
        muscle_group="posterior_chain",
        equipment="barbell",
        description="Conventional deadlift from the floor.",
    ),
    SeedExercise(
        name="Bench Press",
        muscle_group="chest",
        equipment="barbell",
        description="Flat bench press with barbell.",
    ),
    SeedExercise(
        name="Overhead Press",
        muscle_group="shoulders",
        equipment="barbell",
        description="Standing press with full lockout overhead.",
    ),
    SeedExercise(
        name="Bent-Over Row",
        muscle_group="back",
        equipment="barbell",
        description="Row focusing on mid-back engagement.",
    ),
    SeedExercise(
        name="Pull-Up",
        muscle_group="back",
        equipment="bodyweight",
        description="Pronated grip pull-up to bar.",
    ),
    SeedExercise(
        name="Dip",
        muscle_group="chest",
        equipment="bodyweight",
        description="Parallel bar dips with upright torso.",
    ),
    SeedExercise(
        name="Lunge",
        muscle_group="legs",
        equipment="dumbbell",
        description="Alternating walking lunges.",
    ),
    SeedExercise(
        name="Romanian Deadlift",
        muscle_group="posterior_chain",
        equipment="barbell",
        description="Hip hinge Romanian deadlift.",
    ),
    SeedExercise(
        name="Lat Pulldown",
        muscle_group="back",
        equipment="machine",
        description="Wide grip pulldown to chest.",
    ),
    SeedExercise(
        name="Cable Row",
        muscle_group="back",
        equipment="machine",
        description="Seated cable row with neutral grip.",
    ),
    SeedExercise(
        name="Leg Press",
        muscle_group="legs",
        equipment="machine",
        description="45-degree sled leg press.",
    ),
    SeedExercise(
        name="Calf Raise",
        muscle_group="calves",
        equipment="machine",
        description="Standing calf raise machine.",
    ),
    SeedExercise(
        name="Bicep Curl",
        muscle_group="arms",
        equipment="dumbbell",
        description="Alternating dumbbell curl.",
    ),
    SeedExercise(
        name="Tricep Extension",
        muscle_group="arms",
        equipment="cable",
        description="Cable rope tricep pushdown.",
    ),
)


def seed_exercises(force: bool = False) -> int:
    """Populate the database with default exercises.

    Args:
        force: if True, truncate existing exercises before inserting.

    Returns:
        The number of exercises inserted.
    """

    init_db()
    engine = get_engine()
    with Session(engine) as session:
        if force:
            session.query(Exercise).delete()
            session.commit()

        existing_count = session.query(Exercise).count()
        if existing_count >= len(SEED_EXERCISES):
            return 0

        for item in SEED_EXERCISES:
            session.add(Exercise(**item.__dict__))
        session.commit()
        return len(SEED_EXERCISES)
