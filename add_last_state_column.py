from app import app, db
from sqlalchemy import text
import sqlite3

with app.app_context():
    db.session.execute(text('ALTER TABLE user ADD COLUMN last_daily_tasks TEXT'))
    db.session.commit()
    print('Column last_daily_tasks_state added to user table.')

conn = sqlite3.connect('instance/users.db')
c = conn.cursor()
try:
    c.execute('ALTER TABLE user ADD COLUMN last_anxiety_tab TEXT')
    print('Column last_anxiety_tab added.')
except Exception as e:
    print('Migration error:', e)
conn.commit()
conn.close()
