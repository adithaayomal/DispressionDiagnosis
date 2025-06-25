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
    last_assessment_category = db.Column(db.String(32), nullable=True)
    last_daily_tasks = db.Column(db.Text, nullable=True)  # already present
    last_anxiety_tab = db.Column(db.String(64), nullable=True)  # new column for last tab

# DailyTaskProgress model (must be after db is defined)
class DailyTaskProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category = db.Column(db.String(32), nullable=False)  # 'depression', 'anxiety', etc.
    progress_json = db.Column(db.Text, nullable=False, default='{}')  # JSON string
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('daily_task_progress', lazy=True))

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

# Route for Self-Love Journal page
@app.route('/self')
@login_required
def self_journal():
    return render_template('self.html')

# Route for mandala page
@app.route('/mandela_coloring')
@login_required
def mandala_coloring():
    return render_template('mandala_coloring_therapy.html')

# Route for mandala page
@app.route('/gratitude_practice')
@login_required
def gratitude_practice():
    return render_template('gratitude_practice.html')



@app.route('/spinner')
@login_required
def spinner():
    return render_template('spinner.html')

@app.route('/grounding')
@login_required
def grounding():
    return render_template('grounding_technique.html')

@app.route('/gardeningpassion')
@login_required
def gardeningpassion():
    return render_template('gardening-passion.html')

@app.route('/social_interaction')
@login_required
def social_interaction():
    return render_template('social_interaction.html')

@app.route('/water_tracker')
@login_required
def water_tracker():
    return render_template('water_tracker.html')




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
        # Accept only valid answers, but allow progression for 'no' answers
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
            # Calculate depression_score for this session
            answers = list(session['responses'].values())
            depression_qs = [0, 1, 5]
            depression_score = sum([answers[i].lower() in ['yes', 'y', 'yeah', 'true'] for i in depression_qs if i < len(answers)])
            anxiety_score = sum([answers[i].lower() in ['yes', 'y', 'yeah', 'true'] for i in [2, 4] if i < len(answers)])
            stress_qs = [2, 3, 4]
            stress_score = sum([answers[i].lower() in ['yes', 'y', 'yeah', 'true'] for i in stress_qs if i < len(answers)])
            # Send assessment complete message
            msg1 = f"Assessment complete!\n\n{diagnosis}"
            # Send daily tasks message with clickable link
            # Determine category using the same logic as get_category_override
            answers = list(session['responses'].values())
            def yes(i):
                return i < len(answers) and answers[i].lower() in ['yes', 'y', 'yeah', 'true']
            category = None
            if yes(0) and yes(1) and yes(5):
                category = 'depression'
            elif yes(2) and yes(3):
                category = 'stress'
            elif (yes(2) and yes(4)) or (yes(4) and not yes(2)):
                category = 'anxiety'
            current_user.last_assessment_category = category
            db.session.commit()
            msg2 = None
            if category == 'depression':
                msg2 = (
                    'You have daily tasks to complete.<br>'
                    '<a href="/daily_tasks" style="color:#2563eb;text-decoration:underline;font-weight:500;">Click here to view your daily tasks</a>'
                )
            elif category == 'anxiety':
                msg2 = (
                    'You have daily tasks to complete. <br>'
                    '<a href="/daily_tasks" style="color:#2563eb;text-decoration:underline;font-weight:500;">Click here to view your daily tasks</a>'
                )
            elif category == 'stress':
                msg2 = (
                    'You have daily tasks to complete. <br>'
                    '<a href="/daily_tasks" style="color:#2563eb;text-decoration:underline;font-weight:500;">Click here to view your daily tasks</a>'
                )
            # Send chat open message
            msg3 = "You can now chat with the bot and ask any question."
            for m in [msg1, msg2, msg3]:
                if m:  # Only add non-empty messages
                    chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=m)
                    db.session.add(chat_msg)
            db.session.commit()
            # Return all 3 messages as a list for separate rendering
            responses_list = [msg1]
            if msg2:
                responses_list.append(msg2)
            responses_list.append(msg3)
            return jsonify({
                "responses": responses_list,
                "response_type": "multiple",
                "finished": True
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
            # Use SerpAPI for health-related search and summarization
            import requests
            serp_api_key = os.environ.get('SERPAPI_KEY')
            if not serp_api_key:
                bot_response = "Sorry, search is temporarily unavailable (missing API key)."
            else:
                try:
                    params = {
                        'q': user_message,
                        'api_key': serp_api_key,
                        'engine': 'google',
                        'hl': 'en',
                        'num': 5
                    }
                    r = requests.get('https://serpapi.com/search', params=params, timeout=8)
                    data = r.json()
                    results = data.get('organic_results', [])
                    if results:
                        summary = []
                        for res in results:
                            title = res.get('title', '')
                            snippet = res.get('snippet', '')
                            link = res.get('link', '')
                            if title and snippet:
                                summary.append(f"{snippet} <a href='{link}' target='_blank'>(source)</a>")
                        bot_response = "<b></b><br>" + '<br><br>'.join(summary)
                    else:
                        bot_response = "Sorry, I couldn't find a mental health–related answer to your question."
                except Exception as e:
                    print('SerpAPI error:', e)
                    bot_response = f"Sorry, I couldn't search at the moment. ({str(e)})"
        # Save bot response
        chat_msg = ChatMessage(user_id=current_user.id, sender='bot', message=bot_response)
        db.session.add(chat_msg)
        db.session.commit()
        return jsonify({"response": bot_response, "finished": False})

@app.route('/daily_tasks')
@login_required
def daily_tasks():
    category = current_user.last_assessment_category
    if category == 'depression':
        return render_template('depression.html')
    elif category == 'anxiety':
        return render_template('anxiety.html')
    elif category == 'stress':
        return render_template('stress.html')
    else:
        
        return redirect(url_for('index'))
        
    
        

        

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

@app.route('/api/save_last_anxiety_tab', methods=['POST'])
@login_required
def save_last_anxiety_tab():
    data = request.get_json()
    tab = data.get('tab')
    # Accept both None and empty string as clearing
    if tab is None or tab == '' or tab == 'null':
        current_user.last_anxiety_tab = None
        current_user.last_assessment_category = None  # Also clear assessment category
    else:
        current_user.last_anxiety_tab = tab
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/get_last_anxiety_tab')
@login_required
def get_last_anxiety_tab():
    return jsonify({'tab': current_user.last_anxiety_tab})

def calculate_score(responses):
    score = 0
    yes_responses = []
    for question, response in responses.items():
        if response.lower() in ['yes', 'y', 'yeah', 'true']:
            score += 1
            yes_responses.append(question)
    return score, yes_responses

def get_category_override(answers):
    # answers: list of user answers in order
    yes = lambda i: i < len(answers) and answers[i].lower() in ['yes', 'y', 'yeah', 'true']
    # Depression: Q1, Q2, Q6 (0,1,5)
    if yes(0) and yes(1) and yes(5):
        return 'depression'
    # Stress: Q3 and Q4 (2,3)
    if yes(2) and yes(3):
        return 'stress'
    # Anxiety: Q3 and Q5 (2,4) or Q5 only (4)
    if (yes(2) and yes(4)) or (yes(4) and not yes(2)):
        return 'anxiety'
    return None

def get_diagnosis(score, user_responses):
    score_value, yes_questions = score
    answers = list(user_responses.values())

    # --- Override logic ---
    category = get_category_override(answers)
    if category == 'depression':
        return (
            "Some of your responses suggest you might be facing emotional challenges. "
            "If you ever feel comfortable, consider reaching out to a counselor or someone you trust to talk about how you're feeling.\n\n"
            "Resources:\n- National Crisis Helpline: 988\n- University Counseling Services\n- Student Mental Health Support Groups"
        )
    if category == 'stress':
        return (
            "Some of your responses suggest you might be experiencing stress. "
            "Remember, support is available and talking to someone can make a difference."
        )
    if category == 'anxiety':
        return (
            "Some of your responses suggest you might be feeling anxious. "
            "Practicing relaxation techniques or speaking with a mental health professional could be helpful."
        )
    # --- Fallback to original logic ---
    depression_qs = [0, 1, 5]  
    anxiety_qs = [2, 4]               
    stress_qs = [2, 3, 4]                

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
    if anxiety_score == 2:
        suggestions.append(
            "Some of your answers suggest you might be feeling worried or having trouble concentrating. "
            "Practicing relaxation techniques or speaking with a mental health professional could be helpful."
        )
    if stress_score == 3:
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
    if depression_score >= 3:
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
    # Custom greeting override
    greetings = [
        'hi', 'hello', 'hey', 'good morning', 'good evening',
        'hi!', 'hello!', 'hey!', 'good morning!', 'good evening!'
    ]
    user_greeting = text.strip().lower()
    if user_greeting in greetings:
        return f"{text.strip().capitalize()}! how can i assist you? Please feel free to ask anything. I can search for you."
    # Custom thanks override
    thanks_patterns = [
        'thanks', 'thank you', "that's helpful", 'thanks!', 'thank you!', "that's helpful!"
    ]
    if user_greeting in thanks_patterns:
        return random.choice(["You're welcome!", "No problem!", "Glad I could help!"])
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
    app.run(debug=True, port=5001)