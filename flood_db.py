import sqlite3

DB_NAME = "flood.db"   # or flood.db if you want separate DB

def init_flood_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS flood_zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            area_name TEXT UNIQUE NOT NULL,
            latitude REAL,
            longitude REAL,
            severity TEXT,
            description TEXT
        )
    """)

    conn.commit()
    conn.close()


def add_flood_area(area_name, latitude, longitude, severity, description):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        INSERT INTO flood_zones (area_name, latitude, longitude, severity, description)
        VALUES (?, ?, ?, ?, ?)
    """, (area_name, latitude, longitude, severity, description))

    conn.commit()
    conn.close()


def get_all_flood_areas():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("SELECT * FROM flood_zones")
    data = c.fetchall()

    conn.close()
    return data


def search_flood_area(keyword):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT * FROM flood_zones
        WHERE area_name LIKE ?
    """, ('%' + keyword + '%',))

    result = c.fetchall()
    conn.close()

    return result


# sqlite3 flood.db
# .headers on
# .mode column
# .width 5 20 12 12 10 40
# SELECT * FROM flood_zones;
