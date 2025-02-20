from flask import Flask, request, jsonify, render_template, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from forms import TaskForm
from models import db, User
from werkzeug.utils import secure_filename
from datetime import datetime
import os

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(basedir, "data.sqlite")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "mysecretkey"
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False, default="user")
    def set_password(self, password):
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)
    
class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    def __repr__(self):
        return f"Feedback('{self.name}', '{self.email}', '{self.message}')"
    
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    priority = db.Column(db.String(20), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    tags = db.Column(db.JSON, default=list)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'due_date': self.due_date.strftime('%Y-%m-%d'),
            'priority': self.priority,
            'category': self.category,
            'tags': self.tags,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
    
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

with app.app_context():
    db.create_all()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route('/feedback', methods=['GET', 'POST'])
def feedback():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        message = request.form['message']

        new_feedback = Feedback(name=name, email=email, message=message)

        db.session.add(new_feedback)
        db.session.commit()

        flash("Thank you for your feedback!", "success")
        return redirect(url_for("dashboard"))

    return render_template('feedback.html')

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

@app.route('/dashboard')
@login_required
def dashboard():
    form = TaskForm()
    tasks = Task.query.filter_by(user_id=current_user.id).all()

    filter_type = request.args.get('filter', 'all')
    if filter_type == 'pending':
        tasks = Task.query.filter_by(user_id=current_user.id, status='pending').all()
    elif filter_type == 'completed':
        tasks = Task.query.filter_by(user_id=current_user.id, status='completed').all()
    elif filter_type == 'overdue':
        tasks = Task.query.filter(
            Task.user_id == current_user.id,
            Task.due_date < datetime.utcnow(),
            Task.status != 'completed'
        ).all()

    total_tasks = Task.query.filter_by(user_id=current_user.id).count()
    completed_tasks = Task.query.filter_by(user_id=current_user.id, status='completed').count()
    pending_tasks = Task.query.filter_by(user_id=current_user.id, status='pending').count()
    overdue_tasks = Task.query.filter(
        Task.user_id == current_user.id,
        Task.due_date < datetime.utcnow(),
        Task.status != 'completed'
    ).count()

    return render_template('dashboard.html',
                         user=current_user,
                         tasks=tasks,
                         form=form,
                         total_tasks=total_tasks,
                         completed_tasks=completed_tasks,
                         pending_tasks=pending_tasks,
                         overdue_tasks=overdue_tasks)

@app.route('/task/add', methods=['POST'])
@login_required
def add_task():
    form = TaskForm()
    if form.validate_on_submit():
        try:
            tags = [tag.strip() for tag in form.tags.data.split(',') if tag.strip()]
            task = Task(
                title=form.title.data,
                due_date=form.due_date.data,
                priority=form.priority.data,
                category=form.category.data,
                tags=tags,
                user_id=current_user.id
            )
            db.session.add(task)
            db.session.commit()
            flash('Task created successfully!', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating task: {str(e)}', 'error')
    return redirect(url_for('dashboard'))

@app.route('/task/edit/<int:task_id>', methods=['GET', 'POST'])
@login_required
def edit_task(task_id):
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        flash('Unauthorized access!', 'error')
        return redirect(url_for('dashboard'))
    
    form = TaskForm(obj=task)
    if request.method == 'GET':
        form.tags.data = ', '.join(task.tags)
        tasks = Task.query.filter_by(user_id=current_user.id).all()
        return render_template('dashboard.html',
                             user=current_user,
                             tasks=tasks,
                             form=form,
                             edit_task=task)
    
    if form.validate_on_submit():
        try:
            task.title = form.title.data
            task.due_date = form.due_date.data
            task.priority = form.priority.data
            task.category = form.category.data
            task.tags = [tag.strip() for tag in form.tags.data.split(',') if tag.strip()]
            db.session.commit()
            flash('Task updated successfully!', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'Error updating task: {str(e)}', 'error')
    return redirect(url_for('dashboard'))

@app.route('/task/delete/<int:task_id>')
@login_required
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        flash('Unauthorized access!', 'error')
        return redirect(url_for('dashboard'))
    
    try:
        db.session.delete(task)
        db.session.commit()
        flash('Task deleted successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error deleting task: {str(e)}', 'error')
    return redirect(url_for('dashboard'))

@app.route('/task/toggle/<int:task_id>')
@login_required
def toggle_task(task_id):
    task = Task.query.get_or_404(task_id)
    if task.user_id != current_user.id:
        flash('Unauthorized access!', 'error')
        return redirect(url_for('dashboard'))
    
    try:
        task.status = 'completed' if task.status == 'pending' else 'pending'
        db.session.commit()
        flash('Task status updated successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Error updating task status: {str(e)}', 'error')
    return redirect(url_for('dashboard')) 

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        try:
            print("Form Data:", request.form)
            print("Files:", request.files)

            if 'profile_picture' in request.files:
                file = request.files['profile_picture']
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    filename = f"{datetime.now().timestamp()}_{filename}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(file_path)
                    current_user.profile_picture = os.path.join('uploads', filename)

            new_email = request.form.get('email')
            if new_email != current_user.email:
                existing_user = User.query.filter_by(email=new_email).first()
                if existing_user:
                    flash('Email already exists!', 'error')
                    return redirect(url_for('profile'))
                current_user.email = new_email

            current_user.username = request.form.get('username')
            current_user.phone = request.form.get('phone')
            current_user.gender = request.form.get('gender')

            dob = request.form.get('dob')
            if dob:
                try:
                    current_user.dob = datetime.strptime(dob, '%Y-%m-%d').date()
                except ValueError as e:
                    print(f"Error parsing date: {e}")
            
            current_user.address = request.form.get('address')
            current_user.bio = request.form.get('bio')
            current_user.social = request.form.get('social')

            new_password = request.form.get('password')
            if new_password:
                current_user.set_password(new_password)

            print("User object before commit:", vars(current_user))

            db.session.commit()

            flash('Profile updated successfully!', 'success')
            return redirect(url_for('dashboard'))

        except Exception as e:
            db.session.rollback()
            print(f"Error updating profile: {e}")
            flash(f'An error occurred: {str(e)}', 'error')
            return redirect(url_for('profile'))

    return render_template('profile.html', user=current_user)

@app.route("/demo")
def demo():
    return render_template("demo.html")

@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Logout successful", "success")
    return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(debug=True , port=8080)