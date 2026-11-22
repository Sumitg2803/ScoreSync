import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://scoresync_admin:JcGXFcaB3MjJ02Rs@cluster0.p3yqq7r.mongodb.net/scoresync?retryWrites=true&w=majority"
)
DATABASE_NAME = os.getenv("DATABASE_NAME", "scoresync")

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

def get_database() -> AsyncIOMotorDatabase:
    global client, db
    if client is None:
        client = AsyncIOMotorClient(MONGODB_URI)
        db = client[DATABASE_NAME]
    return db

async def close_database():
    global client
    if client is not None:
        client.close()
