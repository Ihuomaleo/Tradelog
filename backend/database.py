from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None

async def connect_to_mongo():
    global client, database
    client = AsyncIOMotorClient(mongo_url)
    database = client[db_name]
    
    # Create indexes
    await database.users.create_index("email", unique=True)
    await database.trades.create_index("user_id")
    await database.trades.create_index("entry_time")
    await database.economic_events.create_index("timestamp")
    await database.economic_events.create_index("impact_level")
    print("Connected to MongoDB")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

async def get_database() -> AsyncIOMotorDatabase:
    return database