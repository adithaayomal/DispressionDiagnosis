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

DEPRESSION_TASKS = [
    "Make your bed and tidy your immediate space",
    "Take a 5-10 minute walk outside",
    "Write down 1-2 things you are grateful for",
    "Practice 5 minutes of deep breathing or mindfulness meditation",
    "Call or message a supportive friend or family member",
    "Spend 10 minutes doing a hobby or enjoyable activity",
    "Prepare and eat a healthy meal mindfully",
    "Set a small achievable goal for the day (e.g., study a lesson) and complete it",
    "Try gentle stretching or yoga for 10 minutes",
    "Write a short journal entry about your feelings",
    "Practice progressive muscle relaxation for 5-10 minutes",
    "Plan a simple social activity or virtual meet-up",
    "Spend time outdoors in nature (park, garden)",
    "Reflect on one positive experience from the week",
    "Declutter one small space (drawer, shelf)",
    "Listen to uplifting music or a podcast",
    "Try a guided meditation or relaxation app for 5-10 minutes",
    "Write a letter or message to express feelings (even if unsent)",
    "Practice mindful eating during one meal",
    "Do a small creative activity (drawing, crafts, journaling)",
    "Take a longer walk or gentle exercise (15-20 minutes)",
    "Reach out to a support group or online community",
    "Try a new healthy recipe or meal",
    "Reflect on your strengths or qualities",
    "Practice “holding space” — allow yourself to feel emotions without judgment",
    "Break a larger task into small steps and complete one step",
    "Take a relaxing bath or do something comforting",
    "Plan your goals for the upcoming week",
    "Spend quality time with a loved one",
    "Review your mood journal or notes from the month"
]

ANXIETY_TASKS = [
    "Start your day with 5 minutes of mindful breathing",
    "Write down your worries and set a 15-minute “worry time” later",
    "Take a 10-minute walk focusing on your surroundings",
    "Practice progressive muscle relaxation for 10 minutes",
    "Avoid caffeine or reduce intake for the day",
    "Try a 15-minute yoga or gentle stretching session",
    "Use a guided meditation app for 5-10 minutes",
    "Make a prioritized to-do list and tackle one small task",
    "Practice mindful eating during one meal",
    "Reach out to a trusted friend or family member",
    "Listen to calming music or nature sounds for 10 minutes",
    "Write down three things you can control today",
    "Do a grounding exercise (e.g., 5-4-3-2-1 sensory technique)",
    "Take a break from screens and social media for an hour",
    "Practice gentle yoga",
    "Try aromatherapy with calming scents (lavender, chamomile)",
    "Engage in a creative activity (drawing, journaling)",
    "Practice deep breathing exercises during breaks",
    "Take a nature walk focusing on sensory details",
    "Write a positive affirmation and repeat it throughout the day",
    "Try a new relaxation technique (e.g., body scan meditation)",
    "Limit multitasking; focus on one thing at a time",
    "Reach out to a support group or therapist",
    "Practice “holding space” for your emotions without judgment",
    "Plan a fun or rewarding activity for the weekend",
    "Take a warm bath or shower to relax muscles",
    "Write down three things you accomplished this week",
    "Practice mindful walking or movement for 10 minutes",
    "Avoid procrastination by breaking tasks into small steps",
    "Reflect on progress and set gentle goals for next month"
]

STRESS_TASKS = [
    "Identify one controllable stressor and brainstorm a small change",
    "Take 10 minutes to practice deep breathing exercises",
    "Write a to-do list prioritizing important tasks",
    "Take a short walk or do light stretching",
    "Practice saying “no” to one non-essential request",
    "Spend 15 minutes doing something you enjoy",
    "Practice mindfulness meditation for 5-10 minutes",
    "Delegate one task to someone else",
    "Avoid multitasking; focus on one task at a time",
    "Take a break from screens and social media for an hour",
    "Connect face-to-face with a supportive person",
    "Practice progressive muscle relaxation",
    "Reflect on your accomplishments this week",
    "Plan your week ahead with realistic goals",
    "Try a yoga or gentle movement class",
    "Practice mindful eating during one meal",
    "Write down three things you are grateful for",
    "Take a relaxing bath or shower",
    "Practice a grounding exercise (5-4-3-2-1 technique)",	
    "Limit caffeine and sugar intake for the day",
    "Spend time outdoors in nature",
    "Listen to calming music or nature sounds",
    "Break a large project into small steps",
    "Practice “holding space” for your emotions",
    "Take a nap or rest when feeling overwhelmed",
    "Connect with a friend or family member",
    "Reflect on positive moments from the day",
    "Plan a fun or relaxing weekend activity",
    "Practice gentle stretching or yoga",
    "Review your stress management techniques and adjust as needed"
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

            # Use the same indices as get_diagnosis for consistency
            answers = list(session['responses'].values())
            depression_qs = [0, 1, 2, 3, 4, 5]
            anxiety_qs = [2, 3, 4]
            stress_qs = [0, 2, 3, 4]

            def count_positive(indices):
                return sum(
                    answers[i].lower() in ['yes', 'y', 'yeah', 'true']
                    for i in indices if i < len(answers)
                )
            depression_score = count_positive(depression_qs)
            anxiety_score = count_positive(anxiety_qs)
            stress_score = count_positive(stress_qs)

            # Assign category: depression > anxiety > stress
            user_category = None
            if depression_score >= 3:
                user_category = 'depression'
            elif anxiety_score >= 1:
                user_category = 'anxiety'
            elif stress_score >= 2:
                user_category = 'stress'
            session['user_category'] = user_category

            bot_msg = f"Assessment complete!\n\n{diagnosis}\n\nYou can now chat with the bot and ask any question."
            chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=bot_msg)
            db.session.add(chat_msg)
            db.session.commit()
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
    user_category = session.get('user_category')
    if user_category == 'depression':
        tasks = DEPRESSION_TASKS
    elif user_category == 'anxiety':
        tasks = ANXIETY_TASKS
    elif user_category == 'stress':
        tasks = STRESS_TASKS
    else:
        tasks = []
    return render_template('daily_tasks.html', tasks=tasks, category=user_category)

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
    depression_qs = [0, 1, 2, 3, 4, 5]  # sadness, loss of interest, sleep, energy
    anxiety_qs = [2, 3, 4]              # sleep, energy, concentration
    stress_qs = [0, 2, 3, 4]            # sadness, sleep, energy, concentration

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