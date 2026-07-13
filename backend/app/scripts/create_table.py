import os
import boto3
from botocore.exceptions import ClientError

ENDPOINT = os.environ.get("DYNAMODB_ENDPOINT", "http://localhost:8000")

dynamodb = boto3.client(
    "dynamodb",
    endpoint_url=ENDPOINT,
    region_name="us-east-1",
    aws_access_key_id="local",
    aws_secret_access_key="local",
)


def create_candidates_table():
    dynamodb.create_table(
        TableName="candidates",
        KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "id", "AttributeType": "S"},
            {"AttributeName": "status", "AttributeType": "S"},
            {"AttributeName": "role_applied", "AttributeType": "S"},
            {"AttributeName": "created_at", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "status-created_at-index",
                "KeySchema": [
                    {"AttributeName": "status", "KeyType": "HASH"},
                    {"AttributeName": "created_at", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "role_applied-created_at-index",
                "KeySchema": [
                    {"AttributeName": "role_applied", "KeyType": "HASH"},
                    {"AttributeName": "created_at", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def create_users_table():
    dynamodb.create_table(
        TableName="users",
        KeySchema=[{"AttributeName": "email", "KeyType": "HASH"}],
        AttributeDefinitions=[
            {"AttributeName": "email", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def create_scores_table():
    dynamodb.create_table(
        TableName="scores",
        KeySchema=[
            {"AttributeName": "candidate_id", "KeyType": "HASH"},
            {"AttributeName": "id", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "candidate_id", "AttributeType": "S"},
            {"AttributeName": "id", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def main():
    tables = [
        ("candidates", create_candidates_table),
        ("scores", create_scores_table),
        ("users", create_users_table),
    ]
    for name, fn in tables:
        try:
            fn()
            print(f"created table: {name}")
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceInUseException":
                print(f"table already exists, skipping: {name}")
            else:
                raise


if __name__ == "__main__":
    main()