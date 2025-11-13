from flask import Flask, render_template, request, redirect, url_for, flash, session


app = Flask(__name__)


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
    app.run(debug=True)
