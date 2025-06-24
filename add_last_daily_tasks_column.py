from app import app, db
from sqlalchemy import text

with app.app_context():
    db.session.execute(text('ALTER TABLE user ADD COLUMN last_daily_tasks TEXT'))
    db.session.commit()
    print('Column last_daily_tasks added to user table.')
