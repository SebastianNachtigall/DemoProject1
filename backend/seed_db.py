from app import app, db, MovieProp

# Sample movie props data
props = [
    {
        "name": "Indiana Jones' Fedora",
        "description": "The iconic fedora worn by Harrison Ford in Raiders of the Lost Ark. Made from high-quality rabbit felt with a distinctive pinched crown.",
        "price": 12999.99,
        "category": "Costumes",
        "image_url": "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=600"
    },
    {
        "name": "Luke Skywalker's Lightsaber",
        "description": "Screen-used lightsaber prop from Star Wars: A New Hope. Features metal hilt with blue blade attachment.",
        "price": 24999.99,
        "category": "Weapons",
        "image_url": "https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=600"
    },
    {
        "name": "DeLorean Time Machine Dashboard",
        "description": "Original dashboard prop from Back to the Future featuring the iconic flux capacitor display and time circuits.",
        "price": 15999.99,
        "category": "Vehicles",
        "image_url": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600"
    },
    {
        "name": "Thor's Mjolnir",
        "description": "Screen-used prop hammer from Thor (2011). Made from high-density foam and detailed with Norse runes.",
        "price": 8999.99,
        "category": "Weapons",
        "image_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600"
    },
    {
        "name": "Jurassic Park Night Vision Goggles",
        "description": "Screen-matched night vision goggles as seen in the original Jurassic Park. Fully functional with green LED display.",
        "price": 4999.99,
        "category": "Accessories",
        "image_url": "https://images.unsplash.com/photo-1589578228447-e1a4e481c6c8?w=600"
    }
]

def seed_database():
    with app.app_context():
        # Clear existing data
        MovieProp.query.delete()
        
        # Add new props
        for prop_data in props:
            prop = MovieProp(**prop_data)
            db.session.add(prop)
        
        # Commit the changes
        db.session.commit()
        print("Database seeded successfully!")

if __name__ == "__main__":
    seed_database()
