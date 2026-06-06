"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import secrets
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}

# In-memory user database and auth tokens
users = {
    "teacher@mergington.edu": {
        "email": "teacher@mergington.edu",
        "password": "adminpass",
        "role": "admin",
        "name": "Ms. Reed"
    },
    "student@mergington.edu": {
        "email": "student@mergington.edu",
        "password": "studentpass",
        "role": "student",
        "name": "Jordan"
    }
}

auth_tokens = {}


def create_token(email: str) -> str:
    token = secrets.token_urlsafe(24)
    auth_tokens[token] = users[email]
    return token


def get_user_from_token(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ", 1)[1]
    user = auth_tokens.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


def require_auth(authorization: str | None) -> dict:
    return get_user_from_token(authorization)


def require_admin(authorization: str | None) -> dict:
    user = get_user_from_token(authorization)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


@app.post("/register")
def register(credentials: dict):
    email = credentials.get("email")
    password = credentials.get("password")
    role = credentials.get("role", "student")
    name = credentials.get("name", email)

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    if email in users:
        raise HTTPException(status_code=400, detail="Email already registered")
    if role not in {"student", "admin"}:
        role = "student"

    users[email] = {
        "email": email,
        "password": password,
        "role": role,
        "name": name
    }

    token = create_token(email)
    return {"token": token, "user": {"email": email, "role": role, "name": name}}


@app.post("/login")
def login(credentials: dict):
    email = credentials.get("email")
    password = credentials.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = users.get(email)
    if not user or user.get("password") != password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(email)
    return {"token": token, "user": {"email": user["email"], "role": user["role"], "name": user["name"]}}


@app.get("/me")
def get_me(authorization: str | None = Header(None)):
    user = get_user_from_token(authorization)
    return {"email": user["email"], "role": user["role"], "name": user["name"]}


@app.post("/activities")
def create_activity(activity: dict, authorization: str | None = Header(None)):
    require_admin(authorization)

    name = activity.get("name")
    description = activity.get("description")
    schedule = activity.get("schedule")
    max_participants = activity.get("max_participants")

    if not name or not description or not schedule or not isinstance(max_participants, int):
        raise HTTPException(status_code=400, detail="Activity name, description, schedule, and max_participants are required")
    if name in activities:
        raise HTTPException(status_code=400, detail="Activity already exists")

    activities[name] = {
        "description": description,
        "schedule": schedule,
        "max_participants": max_participants,
        "participants": []
    }
    return {"message": f"Created activity {name}", "activity": activities[name]}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str | None = None, authorization: str | None = Header(None)):
    """Sign up a student for an activity"""
    current_user = require_auth(authorization)
    email = email or current_user["email"]

    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str | None = None, authorization: str | None = Header(None)):
    """Unregister a student from an activity"""
    current_user = require_auth(authorization)
    target_email = email or current_user["email"]

    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    if target_email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    if current_user["role"] != "admin" and target_email != current_user["email"]:
        raise HTTPException(status_code=403, detail="Only admins can unregister other students")

    activity["participants"].remove(target_email)
    return {"message": f"Unregistered {target_email} from {activity_name}"}
