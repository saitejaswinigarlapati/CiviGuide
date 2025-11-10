from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.secret_key = "civiguide_secret_key"

# Database setup
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

# --- Page Routes ---
@app.route('/')
@app.route('/home')
def home():
    return render_template('home.html')

@app.route('/live')
def live():
    return render_template('live.html')

@app.route('/alternate')
def alternate():
    return render_template('alternate.html')

@app.route('/border_alert')
def border_alert():
    return render_template('border.html')

@app.route('/emergency')
def emergency():
    return render_template('emergency.html')

@app.route('/safety_tips')
def safety_tips():
    return render_template('safety.html')

# --- Signup/Login Routes ---
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    return render_template('signup.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    # GET request
    return redirect(url_for('signup'))


@app.route('/logout')
def logout():
    session.clear()
    flash("Logged out successfully.", "info")
    return redirect(url_for('home'))

# Initialize DB if not exists
if __name__ == '__main__':
    if not os.path.exists('users.db'):
        with app.app_context():
            db.create_all()
    app.run(debug=True)
