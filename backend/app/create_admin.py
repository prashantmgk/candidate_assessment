"""
backend/app/create_admin.py

/auth/register hardcodes role="reviewer" by design - no HTTP path accepts
a role from the client. This is the deliberate escape hatch for creating
the one admin account you need to test the admin-only endpoints. Run it
by hand, inside the backend container so it shares the same
DYNAMODB_ENDPOINT env var:

    docker compose exec backend python -m app.create_admin admin@techkraft.com somepassword
"""
import sys

from . import auth, db


def main():
    if len(sys.argv) != 3:
        print("usage: python -m app.create_admin <email> <password>")
        sys.exit(1)

    email, password = sys.argv[1], sys.argv[2]
    if db.get_user_by_email(email):
        print(f"user {email} already exists")
        sys.exit(1)

    db.create_user(email=email, password_hash=auth.hash_password(password), role="admin")
    print(f"created admin user: {email}")


if __name__ == "__main__":
    main()