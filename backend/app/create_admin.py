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