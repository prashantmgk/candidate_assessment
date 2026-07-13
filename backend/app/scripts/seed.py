import random
import logging
from faker import Faker
from .. import db

logger = logging.getLogger("uvicorn.error")
fake = Faker()

ROLES = [
    "Senior React Developer", 
    "Backend Engineer", 
    "Data Scientist", 
    "Product Manager", 
    "DevOps Engineer"
]

SKILLS_POOL = [
    "react", "python", "aws", "docker", "fastapi", 
    "dynamodb", "sql", "typescript", "kubernetes", "node.js"
]

def main(num_records: int = 55):
    """
    Seeds the database with candidates only if the table is empty.
    """
    try:
        # Check if we already have candidates. If total > 0, skip seeding.
        _, total = db.list_candidates(page=1, page_size=1)
        if total > 0:
            logger.info(f"Database already contains {total} candidates. Skipping seed.")
            return

        logger.info(f"Database empty. Seeding {num_records} candidates...")
        
        for _ in range(num_records):
            name = fake.name()
            email = fake.unique.email()
            role = random.choice(ROLES)
            
            # Pick between 2 and 4 random skills
            skills = random.sample(SKILLS_POOL, random.randint(2, 4))
            
            db.create_candidate(
                name=name,
                email=email,
                role_applied=role,
                skills=skills
            )
            
        logger.info("Database seeding complete!")
        
    except Exception as e:
        logger.error(f"Failed to seed database: {e}")

if __name__ == "__main__":
    main()