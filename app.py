from flask import Flask, request, jsonify, render_template, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import os
from datetime import datetime

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(basedir, "data.sqlite")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "mysecretkey"

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"


# User Model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False, default="user")
    tasks = db.relationship("Task", backref="user", lazy=True)

    def set_password(self, password):
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)


# Task Model
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    priority = db.Column(db.String(50), nullable=False, default="medium")
    completed = db.Column(db.Boolean, nullable=False, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# Create database tables
with app.app_context():
    db.create_all()


# Routes
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        password = request.form.get("password")
        terms = request.form.get("terms")
        if terms == "on":
            terms = True
        else:
            terms = False
        if not name or not email or not password or not terms:
            return render_template("signup.html", error="Please fill in all fields")
        user = User.query.filter_by(email=email).first()
        if user:
            return render_template("signup.html", error="Email already exists")
        user = User(username=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        flash("Account created successfully", "success")
        return redirect(url_for("login"))
    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user)
            flash("Login successful", "success")
            return redirect(url_for("dashboard"))
        flash("Invalid email or password", "danger")
        return redirect(url_for("login"))
    return render_template("login.html")


@app.route("/dashboard")
@login_required
def dashboard():
    tasks = Task.query.filter_by(user_id=current_user.id).all()
    print(f"Tasks for user {current_user.id}: {tasks}")  # Debugging
    return render_template("dashboard.html", user=current_user, tasks=tasks)


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Logout successful", "success")
    return redirect(url_for("index"))


# Task CRUD Routes
@app.route("/tasks", methods=["POST"])
@login_required
def create_task():
    data = request.json
    title = data.get("title")
    due_date = datetime.strptime(data.get("dueDate"), "%Y-%m-%d")
    priority = data.get("priority")
    new_task = Task(title=title, due_date=due_date, priority=priority, user_id=current_user.id)
    db.session.add(new_task)
    db.session.commit()
    return jsonify({"id": new_task.id, "title": new_task.title, "dueDate": new_task.due_date, "priority": new_task.priority}), 201


@app.route("/tasks/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json
    task.title = data.get("title", task.title)
    task.due_date = datetime.strptime(data.get("dueDate"), "%Y-%m-%d") if data.get("dueDate") else task.due_date
    task.priority = data.get("priority", task.priority)
    task.completed = data.get("completed", task.completed)
    db.session.commit()
    return jsonify({"id": task.id, "title": task.title, "dueDate": task.due_date, "priority": task.priority, "completed": task.completed})


@app.route("/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted"}), 200


if __name__ == "__main__":
    app.run(debug=True)