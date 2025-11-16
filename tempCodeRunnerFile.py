import os
import sqlite3
import uuid
from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# ------------ Config ------------
DB_NAME = "users.db"
UPLOAD_FOLDER = "static/uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
ADMIN_DEFAULT_USER = "admin"
ADMIN_DEFAULT_PASS = "adminpass"  # change for production

app = Flask(__name__)
app.secret_key = "supersecretkey"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------- Database ----------
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Users table
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            profile_pic TEXT,
            is_admin INTEGER DEFAULT 0
        )
    """)
    # ensure admin exists
    c.execute("SELECT * FROM users WHERE username=?", (ADMIN_DEFAULT_USER,))
    if not c.fetchone():
        c.execute("INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 1)",
                (ADMIN_DEFAULT_USER, "admin@example.local", generate_password_hash(ADMIN_DEFAULT_PASS)))
    conn.commit()
    conn.close()

init_db()

# ---------- Utilities ----------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".",1)[1].lower() in ALLOWED_EXTENSIONS

def save_profile_pic(file_storage):
    if file_storage and allowed_file(file_storage.filename):
        ext = secure_filename(file_storage.filename).rsplit(".",1)[1]
        filename = f"{uuid.uuid4().hex}.{ext}"
        path = os.path.join(UPLOAD_FOLDER, filename)
        file_storage.save(path)
        return filename
    return None

# ---------- Routes ----------

# Index → login if not logged in
@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("home"))
    return redirect(url_for("login"))

# Signup
@app.route("/signup", methods=["GET","POST"])
def signup():
    if request.method == "POST":
        username = request.form["username"].strip()
        email = request.form["email"].strip()
        password = request.form["password"]
        pic = request.files.get("profile_pic")
        pic_filename = save_profile_pic(pic) if pic and pic.filename else None

        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        try:
            c.execute("INSERT INTO users (username, email, password, profile_pic) VALUES (?, ?, ?, ?)",
                    (username, email, generate_password_hash(password), pic_filename))
            conn.commit()
            flash("Signup successful! Please login.", "success")
            return redirect(url_for("login"))
        except sqlite3.IntegrityError:
            flash("Username or Email already exists!", "danger")
        finally:
            conn.close()
    return render_template("signup.html")

# Login
@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]

        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE username=?", (username,))
        user = c.fetchone()
        conn.close()

        if user and check_password_hash(user[3], password):
            session['user_id'] = user[0]
            session['user_name'] = user[1]
            session['email'] = user[2]
            session['is_admin'] = user[5]

            flash(f"Welcome, {user[1]}!", "success")
            
            # redirect admin to admin panel
            if session['is_admin']:
                return redirect(url_for("admin_panel"))
            else:
                return redirect(url_for("home"))
        else:
            flash("Invalid username or password!", "danger")
    return render_template("login.html")



@app.route("/admin")
def admin_panel():
    if not session.get("is_admin"):
        flash("Admin access required.", "danger")
        return redirect(url_for("login"))

    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id, username, email, profile_pic, is_admin FROM users ORDER BY id DESC")
    users = c.fetchall()
    conn.close()
    
    return render_template("admin.html", users=users)

# Logout
@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("login"))

# Home (dashboard)
@app.route("/home")
def home():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return render_template("home.html", username=session['user_name'], email=session['email'])

# Forgot password simulation
@app.route("/forgot", methods=["GET","POST"])
def forgot():
    if request.method == "POST":
        email = request.form["email"].strip()
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email=?", (email,))
        user = c.fetchone()
        conn.close()
        if user:
            flash("Password reset link would be sent to the email (simulation).", "success")
        else:
            flash("Email not found!", "danger")
    return render_template("forgot.html")

# -------- Profile Routes --------
@app.route("/view_profile")
def view_profile():
    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id, username, email, profile_pic FROM users WHERE id=?", (session["user_id"],))
    user = c.fetchone()
    conn.close()
    return render_template("profile.html", user=user)

@app.route("/update_profile", methods=["GET","POST"])
def update_profile():
    if "user_id" not in session:
        return redirect(url_for("login"))

    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    uid = session["user_id"]

    if request.method == "POST":
        new_username = request.form.get("username","").strip()
        new_email = request.form.get("email","").strip()
        current_pass = request.form.get("current_password","")
        new_pass = request.form.get("new_password","")
        pic_file = request.files.get("profile_pic")

        c.execute("SELECT * FROM users WHERE id=?", (uid,))
        user = c.fetchone()

        if (new_pass or new_email != user["email"] or new_username != user["username"]) and not check_password_hash(user["password"], current_pass):
            flash("Enter correct current password to change profile or password.", "danger")
            conn.close()
            return redirect(url_for("update_profile"))

        pic_filename = None
        if pic_file and pic_file.filename:
            pic_filename = save_profile_pic(pic_file)
            if user["profile_pic"]:
                old_path = os.path.join(UPLOAD_FOLDER, user["profile_pic"])
                if os.path.exists(old_path):
                    os.remove(old_path)

        update_fields = []
        params = []
        if new_username: update_fields.append("username=?"); params.append(new_username)
        if new_email: update_fields.append("email=?"); params.append(new_email)
        if new_pass: update_fields.append("password=?"); params.append(generate_password_hash(new_pass))
        if pic_filename: update_fields.append("profile_pic=?"); params.append(pic_filename)
        params.append(uid)

        if update_fields:
            try:
                c.execute(f"UPDATE users SET {', '.join(update_fields)} WHERE id=?", params)
                conn.commit()
                c.execute("SELECT username,email FROM users WHERE id=?", (uid,))
                updated = c.fetchone()
                session["user_name"] = updated["username"]
                session["email"] = updated["email"]
                flash("Profile updated successfully.", "success")
            except sqlite3.IntegrityError:
                flash("Username or email already taken.", "danger")

        conn.close()
        return redirect(url_for("view_profile"))

    else:
        c.execute("SELECT id, username, email, profile_pic FROM users WHERE id=?", (uid,))
        user = c.fetchone()
        conn.close()
        return render_template("edit_profile.html", user=user)

@app.route("/delete_account", methods=["GET","POST"])
def delete_account():
    if "user_id" not in session:
        return redirect(url_for("login"))

    uid = session["user_id"]
    if request.method == "POST":
        conn = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT profile_pic FROM users WHERE id=?", (uid,))
        row = c.fetchone()
        if row and row["profile_pic"]:
            path = os.path.join(UPLOAD_FOLDER, row["profile_pic"])
            if os.path.exists(path):
                os.remove(path)
        c.execute("DELETE FROM users WHERE id=?", (uid,))
        conn.commit()
        conn.close()
        session.clear()
        flash("Account deleted successfully.", "success")
        return redirect(url_for("signup"))

    return render_template("confirm_delete.html")

# Serve uploaded files
@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

# Placeholder feature pages
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


@app.route("/admin/delete/<int:user_id>", methods=["POST"])
def admin_delete_user(user_id):
    if not session.get("is_admin"):
        flash("Admin access required.", "danger")
        return redirect(url_for("login"))

    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Prevent deleting main admin
    c.execute("SELECT username, profile_pic FROM users WHERE id=?", (user_id,))
    user = c.fetchone()
    if user and user["username"] == "admin":
        flash("Cannot delete main admin!", "danger")
        conn.close()
        return redirect(url_for("admin_panel"))

    if user and user["profile_pic"]:
        path = os.path.join(app.config["UPLOAD_FOLDER"], user["profile_pic"])
        if os.path.exists(path):
            os.remove(path)

    c.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    flash("User deleted successfully.", "success")
    return redirect(url_for("admin_panel"))


if __name__ == "__main__":
    app.run(debug=True)
