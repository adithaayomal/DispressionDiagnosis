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
app.config['SECRET_KEY'] = 'your_secret_key_here'
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
    if user_answer.lower() not in valid_answers:
        return jsonify({
            "response": "Invalid answer. Please type 'yes' or 'no' to answer questions.",
            "finished": False
        })

    # Save the user's answer
    responses[f'question_{current_question}'] = user_answer
    session['responses'] = responses

    # Move to next question
    next_question_idx = current_question + 1
    session['current_question'] = next_question_idx

    if next_question_idx < len(QUESTIONS):
        next_q = QUESTIONS[next_question_idx]
        return jsonify({"response": next_q, "finished": False})
    else:
        # Assessment finished, calculate result
        score, yes_responses = calculate_score(session['responses'])
        diagnosis = get_diagnosis((score, yes_responses), session['responses'])
        return jsonify({"response": f"Assessment complete!\n\n{diagnosis}", "finished": True})

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
    anxiety_qs = [4]               # concentration
    stress_qs = [5]                # self-harm/suicide

    depression_score = sum([answers[i].lower() in ['yes', 'y', 'yeah', 'true'] for i in depression_qs if i < len(answers)])
    anxiety_score = sum([answers[i].lower() in ['yes', 'y', 'yeah', 'true'] for i in anxiety_qs if i < len(answers)])
    stress_score = sum([answers[i].lower() in ['yes', 'y', 'yeah', 'true'] for i in stress_qs if i < len(answers)])

    feedback = "Thank you for sharing your responses. "
    suggestions = []

    if depression_score >= 3:
        suggestions.append(
            "It seems you may be experiencing some emotional challenges that can affect your mood and daily life. "
            "Consider reaching out to a counselor or someone you trust to talk about how you're feeling."
        )
    if anxiety_score >= 1:
        suggestions.append(
            "Some of your answers suggest you might be feeling worried or having trouble concentrating. "
            "Practicing relaxation techniques or speaking with a mental health professional could be helpful."
        )
    if stress_score >= 1:
        suggestions.append(
            "Your responses indicate you might be under significant stress. "
            "Remember, support is available and talking to someone can make a difference."
        )
    if not suggestions:
        suggestions.append(
            "Keep taking care of your mental health and remember that support is always available if you need it."
        )

    feedback += " ".join(suggestions)

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)