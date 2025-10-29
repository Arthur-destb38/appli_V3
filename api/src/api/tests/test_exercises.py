from sqlmodel import Session
from sqlmodel import select

from api.db import get_engine
from api.models import Exercise
from api.seeds import seed_exercises


def test_seed_populates_and_list_endpoint(client):
    inserted = seed_exercises(force=True)
    assert inserted == 15

    with Session(get_engine()) as session:
        results = session.exec(select(Exercise)).all()
    assert len(results) == 15

    response = client.get("/exercises")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 15
    assert {item["name"] for item in payload}


def test_create_exercise(client):
    payload = {
        "name": "Face Pull",
        "muscle_group": "shoulders",
        "equipment": "cable",
        "description": "Cable face pull",
    }
    response = client.post("/exercises", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Face Pull"
    assert body["id"] > 0

    list_response = client.get("/exercises")
    assert len(list_response.json()) >= 1
