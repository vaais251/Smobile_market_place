"""
Resets the database by dropping all tables and re-seeding.
"""
from sqlmodel import SQLModel
from app.core.database import engine
from app.seed import seed

# Import ALL models that need to be dropped
from app.models.user import User, SellerProfile
from app.models.listing import PhoneListing, OldPhoneDetails, NewPhoneDetails
from app.models.order import Order
from app.models.chat import ChatRoom, ChatParticipant, Message

def reset_and_seed():
    print("WARNING: This will delete all data in the database.")
    print("🗑️  Dropping all tables from metadata...")
    # This drops tables associated with the imported models
    SQLModel.metadata.drop_all(engine)
    print("✅  Tables dropped.")
    
    # Run the seed function
    # Note: seed() calls SQLModel.metadata.create_all(engine)
    print("🌱 Starting seed process...")
    seed()

if __name__ == "__main__":
    reset_and_seed()
