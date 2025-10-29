from datetime import datetime

from pydantic import BaseModel


class ExerciseBase(BaseModel):
    name: str
    muscle_group: str
    equipment: str
    description: str | None = None
    image_url: str | None = None
    source_type: str = "local"
    source_value: str | None = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseRead(ExerciseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
