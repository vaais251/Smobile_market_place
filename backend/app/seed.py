"""
SMobile — Database Seed Script

Creates sample users (admin, sellers, buyers) and phone listings
with real product images from Unsplash.

Usage:
    cd backend
    uv run python -m app.seed
"""

from sqlmodel import Session, select, SQLModel
from app.core.database import engine
from app.core.security import hash_password
from app.models.user import User, UserRole, SellerProfile
from app.models.listing import PhoneListing, PhoneType, OldPhoneDetails, NewPhoneDetails

# ── Ensure all models are registered ──
from app.models.order import Order            # noqa: F401
from app.models.chat import ChatRoom, ChatParticipant, Message  # noqa: F401


def seed():
    # Create tables if they don't exist
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Check if data already exists
        existing = session.exec(select(User)).first()
        if existing:
            print("⚠️  Database already has data. Skipping seed.")
            print("   To re-seed, drop all tables first or clear the database.")
            return

        print("🌱 Seeding database...")

        # ════════════════════════════════════════
        # 1. USERS
        # ════════════════════════════════════════
        admin = User(
            name="Admin SMobile",
            phone="+923001111111",
            email="admin@smobile.pk",
            hashed_password=hash_password("Admin@123"),
            role=UserRole.ADMIN,
        )

        seller1 = User(
            name="Ali Khan",
            phone="+923002222222",
            email="ali.khan@email.com",
            hashed_password=hash_password("Seller@123"),
            role=UserRole.SELLER,
        )

        seller2 = User(
            name="Fatima Noor",
            phone="+923003333333",
            email="fatima.noor@email.com",
            hashed_password=hash_password("Seller@123"),
            role=UserRole.SELLER,
        )

        seller3 = User(
            name="Hassan Mobile Zone",
            phone="+923004444444",
            email="hassan.mobile@email.com",
            hashed_password=hash_password("Seller@123"),
            role=UserRole.SELLER,
        )

        buyer1 = User(
            name="Ahmed Raza",
            phone="+923005555555",
            email="ahmed.raza@email.com",
            hashed_password=hash_password("Buyer@123"),
            role=UserRole.BUYER,
        )

        buyer2 = User(
            name="Sara Malik",
            phone="+923006666666",
            email="sara.malik@email.com",
            hashed_password=hash_password("Buyer@123"),
            role=UserRole.BUYER,
        )

        session.add_all([admin, seller1, seller2, seller3, buyer1, buyer2])
        session.flush()
        print(f"   ✅ Created {6} users (1 admin, 3 sellers, 2 buyers)")

        # ════════════════════════════════════════
        # 2. SELLER PROFILES
        # ════════════════════════════════════════
        profiles = [
            SellerProfile(
                user_id=seller1.id,
                address="Shop #12, Hall Road Mobile Market",
                city="Lahore",
                latitude=31.5204,
                longitude=74.3587,
                is_shop=True,
                shop_name="Ali Mobile Hub",
            ),
            SellerProfile(
                user_id=seller2.id,
                address="Flat 5B, Clifton Block 4",
                city="Karachi",
                latitude=24.8607,
                longitude=67.0011,
                is_shop=False,
                shop_name=None,
            ),
            SellerProfile(
                user_id=seller3.id,
                address="Shop 45, Saddar Bazaar",
                city="Rawalpindi",
                latitude=33.6007,
                longitude=73.0679,
                is_shop=True,
                shop_name="Hassan Mobile Zone",
            ),
        ]
        session.add_all(profiles)
        session.flush()
        print(f"   ✅ Created {len(profiles)} seller profiles")

        # ════════════════════════════════════════
        # 3. PHONE LISTINGS
        # ════════════════════════════════════════

        # ── High-quality phone images (Unsplash, free to use) ──
        IMG = {
            "samsung_s24":    "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
            "samsung_a54":    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
            "samsung_z_flip": "https://images.unsplash.com/photo-1628744876497-eb30460be9f6?w=800&q=80",
            "iphone_15":      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80",
            "iphone_14":      "https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&q=80",
            "iphone_13":      "https://images.unsplash.com/photo-1632633173522-47456de71b68?w=800&q=80",
            "xiaomi_14":      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
            "oneplus_12":     "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&q=80",
            "pixel_8":        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
            "oppo_reno":      "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=800&q=80",
            "realme_gt":      "https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&q=80",
            "infinix_note":   "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80",
        }

        listings_data = [
            # ── NEW PHONES ──────────────────────
            {
                "seller_id": seller1.id,
                "type": PhoneType.NEW,
                "brand": "Samsung",
                "model": "Galaxy S24 Ultra",
                "price": 329999,
                "ram": "12GB",
                "storage": "256GB",
                "main_image_url": IMG["samsung_s24"],
                "location_lat": 31.5204,
                "location_long": 74.3587,
                "new_phone": {
                    "processor": "Snapdragon 8 Gen 3",
                    "battery_mah": 5000,
                },
            },
            {
                "seller_id": seller1.id,
                "type": PhoneType.NEW,
                "brand": "Apple",
                "model": "iPhone 15 Pro Max",
                "price": 459999,
                "ram": "8GB",
                "storage": "256GB",
                "main_image_url": IMG["iphone_15"],
                "location_lat": 31.5204,
                "location_long": 74.3587,
                "new_phone": {
                    "processor": "A17 Pro Bionic",
                    "battery_mah": 4441,
                },
            },
            {
                "seller_id": seller3.id,
                "type": PhoneType.NEW,
                "brand": "OnePlus",
                "model": "12 5G",
                "price": 179999,
                "ram": "12GB",
                "storage": "256GB",
                "main_image_url": IMG["oneplus_12"],
                "location_lat": 33.6007,
                "location_long": 73.0679,
                "new_phone": {
                    "processor": "Snapdragon 8 Gen 3",
                    "battery_mah": 5400,
                },
            },
            {
                "seller_id": seller3.id,
                "type": PhoneType.NEW,
                "brand": "Samsung",
                "model": "Galaxy Z Flip 5",
                "price": 249999,
                "ram": "8GB",
                "storage": "256GB",
                "main_image_url": IMG["samsung_z_flip"],
                "location_lat": 33.6007,
                "location_long": 73.0679,
                "new_phone": {
                    "processor": "Snapdragon 8 Gen 2",
                    "battery_mah": 3700,
                },
            },
            {
                "seller_id": seller1.id,
                "type": PhoneType.NEW,
                "brand": "Xiaomi",
                "model": "14 Pro",
                "price": 149999,
                "ram": "12GB",
                "storage": "256GB",
                "main_image_url": IMG["xiaomi_14"],
                "location_lat": 31.5204,
                "location_long": 74.3587,
                "new_phone": {
                    "processor": "Snapdragon 8 Gen 3",
                    "battery_mah": 4880,
                },
            },

            # ── USED / OLD PHONES ───────────────
            {
                "seller_id": seller2.id,
                "type": PhoneType.OLD,
                "brand": "Apple",
                "model": "iPhone 14 Pro",
                "price": 239999,
                "ram": "6GB",
                "storage": "128GB",
                "main_image_url": IMG["iphone_14"],
                "location_lat": 24.8607,
                "location_long": 67.0011,
                "old_phone": {
                    "battery_health": 89,
                    "battery_mah": 3200,
                    "pta_approved": True,
                    "accessories": "Original box, charger, EarPods",
                    "condition_rating": 8,
                    "defect_details": "Minor scratch on back glass, barely visible",
                },
            },
            {
                "seller_id": seller2.id,
                "type": PhoneType.OLD,
                "brand": "Apple",
                "model": "iPhone 13",
                "price": 149999,
                "ram": "4GB",
                "storage": "128GB",
                "main_image_url": IMG["iphone_13"],
                "location_lat": 24.8607,
                "location_long": 67.0011,
                "old_phone": {
                    "battery_health": 82,
                    "battery_mah": 3240,
                    "pta_approved": True,
                    "accessories": "Charger only",
                    "condition_rating": 7,
                    "defect_details": None,
                },
            },
            {
                "seller_id": seller1.id,
                "type": PhoneType.OLD,
                "brand": "Samsung",
                "model": "Galaxy A54 5G",
                "price": 54999,
                "ram": "8GB",
                "storage": "128GB",
                "main_image_url": IMG["samsung_a54"],
                "location_lat": 31.5204,
                "location_long": 74.3587,
                "old_phone": {
                    "battery_health": 91,
                    "battery_mah": 5000,
                    "pta_approved": True,
                    "accessories": "Box, charger, back cover",
                    "condition_rating": 9,
                    "defect_details": None,
                },
            },
            {
                "seller_id": seller3.id,
                "type": PhoneType.OLD,
                "brand": "Google",
                "model": "Pixel 8 Pro",
                "price": 139999,
                "ram": "12GB",
                "storage": "128GB",
                "main_image_url": IMG["pixel_8"],
                "location_lat": 33.6007,
                "location_long": 73.0679,
                "old_phone": {
                    "battery_health": 95,
                    "battery_mah": 5050,
                    "pta_approved": False,
                    "accessories": "Original box and charger",
                    "condition_rating": 9,
                    "defect_details": "Non-PTA, works with all SIMs via CPID",
                },
            },
            {
                "seller_id": seller2.id,
                "type": PhoneType.OLD,
                "brand": "Oppo",
                "model": "Reno 10 Pro+",
                "price": 84999,
                "ram": "12GB",
                "storage": "256GB",
                "main_image_url": IMG["oppo_reno"],
                "location_lat": 24.8607,
                "location_long": 67.0011,
                "old_phone": {
                    "battery_health": 87,
                    "battery_mah": 4700,
                    "pta_approved": True,
                    "accessories": "Charger, back cover",
                    "condition_rating": 8,
                    "defect_details": "Small dent on bottom edge",
                },
            },
            {
                "seller_id": seller1.id,
                "type": PhoneType.OLD,
                "brand": "Realme",
                "model": "GT 5 Pro",
                "price": 89999,
                "ram": "12GB",
                "storage": "256GB",
                "main_image_url": IMG["realme_gt"],
                "location_lat": 31.5204,
                "location_long": 74.3587,
                "old_phone": {
                    "battery_health": 93,
                    "battery_mah": 5400,
                    "pta_approved": True,
                    "accessories": "Full box with all accessories",
                    "condition_rating": 9,
                    "defect_details": None,
                },
            },
            {
                "seller_id": seller3.id,
                "type": PhoneType.OLD,
                "brand": "Infinix",
                "model": "Note 30 Pro",
                "price": 42999,
                "ram": "8GB",
                "storage": "256GB",
                "main_image_url": IMG["infinix_note"],
                "location_lat": 33.6007,
                "location_long": 73.0679,
                "old_phone": {
                    "battery_health": 96,
                    "battery_mah": 5000,
                    "pta_approved": True,
                    "accessories": "Charger, earphones",
                    "condition_rating": 8,
                    "defect_details": "Screen protector has bubbles, screen itself is perfect",
                },
            },
        ]

        for data in listings_data:
            new_phone_data = data.pop("new_phone", None)
            old_phone_data = data.pop("old_phone", None)

            listing = PhoneListing(**data)
            session.add(listing)
            session.flush()

            if new_phone_data:
                detail = NewPhoneDetails(listing_id=listing.id, **new_phone_data)
                session.add(detail)

            if old_phone_data:
                detail = OldPhoneDetails(listing_id=listing.id, **old_phone_data)
                session.add(detail)

        session.flush()
        print(f"   ✅ Created {len(listings_data)} phone listings (5 new, 7 used)")

        # ════════════════════════════════════════
        # 4. COMMIT
        # ════════════════════════════════════════
        session.commit()

        print()
        print("═" * 50)
        print("🎉 Seed complete! Here are the test accounts:")
        print("═" * 50)
        print()
        print("  👑 ADMIN")
        print("     Phone: +923001111111")
        print("     Pass:  Admin@123")
        print()
        print("  🏪 SELLERS")
        print("     Ali Khan:           +923002222222 / Seller@123")
        print("     Fatima Noor:        +923003333333 / Seller@123")
        print("     Hassan Mobile Zone: +923004444444 / Seller@123")
        print()
        print("  🛒 BUYERS")
        print("     Ahmed Raza:  +923005555555 / Buyer@123")
        print("     Sara Malik:  +923006666666 / Buyer@123")
        print()


if __name__ == "__main__":
    seed()
