from flask import Flask, jsonify, request, render_template, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import CountVectorizer
import nltk
nltk.download('punkt')
nltk.download('wordnet')
nltk.download('omw-1.4')  
from nltk.stem import WordNetLemmatizer
import random
import json
import os


app = Flask(__name__)
app.config['SECRET_KEY'] = '026e523d0d581335786094c9c6df43a4dbfa11781f9906482e2c2c8946fcb185'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not all([username, email, password, confirm_password]):
            flash('All fields are required', 'error')
            return redirect(url_for('register'))

        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return redirect(url_for('register'))

        if len(password) < 6:
            flash('Password must be at least 6 characters long', 'error')
            return redirect(url_for('register'))

        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'error')
            return redirect(url_for('register'))

        if User.query.filter_by(email=email).first():
            flash('Email already registered', 'error')
            return redirect(url_for('register'))

        try:
            new_user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password)
            )
            db.session.add(new_user)
            db.session.commit()
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('login'))
        except Exception:
            db.session.rollback()
            flash('An error occurred. Please try again.', 'error')
            return redirect(url_for('register'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            flash('Successfully logged in!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid email or password', 'error')
            return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    session.pop('_flashes', None)  # Clear any previous flash messages
    flash('Successfully logged out!', 'success')
    return redirect(url_for('login'))

# Depression assessment questions
QUESTIONS = [
    "Do you feel sad or empty most of the day?",
    "Have you lost interest in activities you used to enjoy?",
    "Do you have trouble sleeping or sleep too much?",
    "Do you feel tired or have little energy?",
    "Do you have difficulty concentrating?",
    "Do you have thoughts of self-harm or suicide?"
]

@app.route('/')
@login_required
def index():
    session['current_question'] = 0
    session['responses'] = {}
    session['assessment_started'] = True
    return render_template('depression_diagnosis_chatbot.html',
                         initial_message="Hello! I'll ask you a few questions to assess your mental health.",
                         question=QUESTIONS[0],
                         question_number=1,
                         total_questions=len(QUESTIONS))

@app.route('/submit_response', methods=['POST'])
@login_required
def submit_response():
    response = request.form.get('response')
    current_question = session.get('current_question', 0)
    session['responses'][f'question_{current_question}'] = response
    next_question = current_question + 1
    session['current_question'] = next_question

    if next_question < len(QUESTIONS):
        return render_template('depression_diagnosis_chatbot.html',
                             question=QUESTIONS[next_question],
                             question_number=next_question + 1,
                             total_questions=len(QUESTIONS))
    else:
        score, yes_responses = calculate_score(session['responses'])
        diagnosis = get_diagnosis((score, yes_responses), session['responses'])
        return render_template('assessment_result.html',
                             score=score,
                             diagnosis=diagnosis,
                             total_questions=len(QUESTIONS))

@app.route('/next_question', methods=['POST'])
@login_required
def next_question():
    data = request.get_json()
    user_answer = data.get('message', '').strip()
    current_question = session.get('current_question', 0)
    responses = session.get('responses', {})

    valid_answers = ['yes', 'y', 'yeah', 'true', 'no', 'n', 'nope', 'false']
    if current_question < len(QUESTIONS):
        if user_answer.lower() not in valid_answers:
            # Save invalid user message
            chat_msg = ChatMessage(user_id=current_user.id, sender='user', message=user_answer)
            db.session.add(chat_msg)
            db.session.commit()
            bot_msg = "Invalid answer. Please type 'yes' or 'no' to answer questions."
            chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=bot_msg)
            db.session.add(chat_msg)
            db.session.commit()
            return jsonify({
                "response": bot_msg,
                "finished": False
            })
        # Save the user's answer
        chat_msg = ChatMessage(user_id=current_user.id, sender='user', message=user_answer)
        db.session.add(chat_msg)
        db.session.commit()
        responses[f'question_{current_question}'] = user_answer
        session['responses'] = responses
        # Move to next question
        next_question_idx = current_question + 1
        session['current_question'] = next_question_idx
        if next_question_idx < len(QUESTIONS):
            next_q = QUESTIONS[next_question_idx]
            chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=next_q)
            db.session.add(chat_msg)
            db.session.commit()
            return jsonify({"response": next_q, "finished": False})
        else:
            # Assessment finished, calculate result
            score, yes_responses = calculate_score(session['responses'])
            diagnosis = get_diagnosis((score, yes_responses), session['responses'])
            session['assessment_finished'] = True
            bot_msg = f"Assessment complete!\n\n{diagnosis}\n\nYou can now chat with the bot and ask any question."
            chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=bot_msg)
            db.session.add(chat_msg)
            db.session.commit()
            # Only show daily task prompt if user answered 'yes' to at least one question
            show_daily_task_prompt = score > 0
            return jsonify({
                "response": bot_msg,
                "finished": True,
                "show_daily_task_prompt": show_daily_task_prompt
            })
    else:
        # After assessment, allow free chat
        user_message = user_answer
        bot_response = None
        # Save user message
        chat_msg = ChatMessage(user_id=current_user.id, sender='user', message=user_message)
        db.session.add(chat_msg)
        db.session.commit()
        try:
            bot_response = get_response(user_message)
        except Exception as e:
            print('Error in get_response:', e)
            bot_msg = f'Internal error: {str(e)}'
            chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=bot_msg)
            db.session.add(chat_msg)
            db.session.commit()
            return jsonify({'response': bot_msg, 'finished': False}), 500
        if "I'm not sure how to respond" in bot_response:
            # Use Wikipedia API as fallback
            import requests
            try:
                search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={requests.utils.quote(user_message)}&utf8=&format=json"
                r = requests.get(search_url, timeout=5)
                data = r.json()
                if data.get('query', {}).get('search'):
                    first_result = data['query']['search'][0]
                    page_title = first_result['title']
                    snippet = first_result['snippet']
                    # Get the page summary
                    summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(page_title)}"
                    summary_r = requests.get(summary_url, timeout=5)
                    summary_data = summary_r.json()
                    extract = summary_data.get('extract')
                    if extract:
                        bot_response = f"{extract}"
                    else:
                        bot_response = f"{snippet}"
                else:
                    bot_response = "Sorry, I couldn't find a mental health–related answer to your question."
            except Exception as e:
                print('Fallback error:', e)
                bot_response = f"Sorry, I couldn't search at the moment. ({str(e)})"
        # Save bot response
        chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=bot_response)
        db.session.add(chat_msg)
        db.session.commit()
        return jsonify({"response": bot_response, "finished": False})

@app.route('/daily_tasks')
@login_required
def daily_tasks():
    tasks = [
        "Take a 5-minute mindful breathing break",
        "Write down 3 things you're grateful for",
        "Go for a short walk outdoors",
        "Reach out to a friend or family member",
        "Reflect on a positive moment from today"
    ]
    return render_template('daily_tasks.html', tasks=tasks)

@app.route('/chat_history')
@login_required
def chat_history():
    messages = ChatMessage.query.filter_by(user_id=current_user.id).order_by(ChatMessage.timestamp.asc()).all()
    return render_template('chat_history.html', messages=messages)

@app.route('/chat_history_api')
@login_required
def chat_history_api():
    messages = ChatMessage.query.filter_by(user_id=current_user.id).order_by(ChatMessage.timestamp.asc()).all()
    # If no chat history, insert the two initial bot messages
    if not messages:
        initial_msgs = [
            "Hello! I'll ask you a few questions to assess your mental health.",
            "Do you feel sad or empty most of the day?"
        ]
        for msg in initial_msgs:
            chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=msg)
            db.session.add(chat_msg)
        db.session.commit()
        messages = ChatMessage.query.filter_by(user_id=current_user.id).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify({
        'messages': [
            {'sender': m.sender, 'message': m.message, 'timestamp': m.timestamp.strftime('%Y-%m-%d %H:%M')} for m in messages
        ]
    })

@app.route('/clear_chat', methods=['POST'])
@login_required
def clear_chat():
    ChatMessage.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return '', 204

def calculate_score(responses):
    score = 0
    yes_responses = []
    for question, response in responses.items():
        if response.lower() in ['yes', 'y', 'yeah', 'true']:
            score += 1
            yes_responses.append(question)
    return score, yes_responses

def get_diagnosis(score, user_responses):
    score_value, yes_questions = score
    answers = list(user_responses.values())

    # Map questions to categories
    depression_qs = [0, 1, 2, 3]  # sadness, loss of interest, sleep, energy
    anxiety_qs = [4]              # concentration
    stress_qs = [2, 3, 5]         # sleep, fatigue, self-harm (stress indicator)

    # Score calculation
    def count_positive(indices):
        return sum(
            answers[i].lower() in ['yes', 'y', 'yeah', 'true']
            for i in indices if i < len(answers)
        )

    depression_score = count_positive(depression_qs)
    anxiety_score = count_positive(anxiety_qs)
    stress_score = count_positive(stress_qs)

    feedback = "Thank you for completing the assessment. "
    suggestions = []

    if depression_score >= 3:
        suggestions.append(
            "You may be experiencing symptoms of depression, such as sadness, low energy, and loss of interest."
            " Talking to a mental health professional could help you understand and manage these feelings."
        )
    if anxiety_score >= 1:
        suggestions.append(
            "You reported difficulties with concentration, which may indicate anxiety."
            " Mindfulness practices or speaking with a counselor may be beneficial."
        )
    if stress_score >= 2:
        suggestions.append(
            "Your responses suggest you might be under significant stress."
            " Managing sleep, energy levels, and emotional strain is important. Consider lifestyle adjustments or seeking guidance."
        )

    if not suggestions:
        suggestions.append("Your answers do not indicate strong signs of depression, anxiety, or stress. Stay mindful and take care of your mental well-being.")

    feedback += " ".join(suggestions)

    # Add emergency support for self-harm thoughts
    if answers[5].lower() in ['yes', 'y', 'yeah', 'true']:
        feedback += (
            "\n\nIf you're having thoughts of self-harm, please reach out for immediate support."
            " You can contact a crisis line, speak with someone you trust, or reach out to mental health professionals."
        )

    # Add resources if any score is high
    if depression_score >= 3 or anxiety_score >= 1 or stress_score >= 1:
        feedback += (
            "\n\nHere are some resources that might be helpful:\n"
            "- National Crisis Helpline: 988\n"
            "- University Counseling Services\n"
            "- Student Mental Health Support Groups"
        )
    return feedback

# --- Chatbot logic using scikit-learn ---
lemmatizer = WordNetLemmatizer()

# Ensure intents.json exists with minimal content if missing
intents_file = 'intents.json'
if not os.path.isfile(intents_file):
    with open(intents_file, 'w', encoding='utf-8') as file:
        json.dump({
            "intents": [
                {
                    "tag": "greeting",
                    "patterns": ["Hi", "Hello", "Hey", "Good morning", "Good evening"],
                    "responses": ["Hello!", "Hi there!", "Hey! How can I help you?"]
                },
                {
                    "tag": "goodbye",
                    "patterns": ["Bye", "See you later", "Goodbye"],
                    "responses": ["Goodbye!", "See you later!", "Take care!"]
                },
                {
                    "tag": "thanks",
                    "patterns": ["Thanks", "Thank you", "That's helpful"],
                    "responses": ["You're welcome!", "No problem!", "Glad I could help!"]
                }
            ]
        }, file, ensure_ascii=False, indent=4)

with open(intents_file, 'r', encoding='utf-8') as file:
    intents = json.load(file)

X = []
y = []
responses = {}

for intent in intents['intents']:
    responses[intent['tag']] = intent['responses']
    for pattern in intent['patterns']:
        tokens = pattern.lower().split()
        tokens = [lemmatizer.lemmatize(word) for word in tokens]
        X.append(' '.join(tokens))
        y.append(intent['tag'])

vectorizer = CountVectorizer()
X_vectorized = vectorizer.fit_transform(X)
classifier = MultinomialNB()
classifier.fit(X_vectorized, y)

def preprocess(text):
    tokens = nltk.word_tokenize(text.lower())
    tokens = [lemmatizer.lemmatize(word) for word in tokens]
    return ' '.join(tokens)

def get_response(text):
    text = preprocess(text)
    text_vectorized = vectorizer.transform([text])
    prediction = classifier.predict(text_vectorized)
    prob = classifier.predict_proba(text_vectorized)
    confidence = max(prob[0])
    if confidence < 0.75:
        return "I'm not sure how to respond to that. Could you please rephrase?"
    tag = prediction[0]
    return random.choice(responses[tag])

@app.route('/get_response', methods=['POST'])
@login_required
def chatbot_response():
    message = request.json['message']
    res = get_response(message)
    return jsonify({"response": res})

# Chat message model
class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sender = db.Column(db.String(10), nullable=False)  # 'user' or 'bot'
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('chat_messages', lazy=True))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)