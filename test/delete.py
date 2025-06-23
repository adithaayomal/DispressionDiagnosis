from app import app, db, ChatMessage

with app.app_context():
    db.session.query(ChatMessage).delete()
    db.session.commit()
    print("All ChatMessage records deleted.")
