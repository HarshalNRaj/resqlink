
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

uri = os.getenv("MONGODB_URI")
database_name = os.getenv("MONGODB_DATABASE", "resqlink")

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    client.admin.command("ping")
    print("MongoDB connected successfully!")
    print("Database:", database_name)
    client.close()
except Exception as e:
    print("MongoDB connection failed:")
    print(e)
