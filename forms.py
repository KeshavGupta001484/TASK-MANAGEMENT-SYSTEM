from flask_wtf import FlaskForm
from wtforms import StringField, DateField, SelectField, HiddenField
from wtforms.validators import DataRequired

class TaskForm(FlaskForm):
    id = HiddenField('Task ID')
    title = StringField('Task Title', validators=[DataRequired()])
    due_date = DateField('Due Date', validators=[DataRequired()])
    priority = SelectField('Priority', 
                         choices=[('low', 'Low'), 
                                ('medium', 'Medium'), 
                                ('high', 'High')],
                         validators=[DataRequired()])
    category = SelectField('Category',
                         choices=[('work', 'Work'),
                                ('personal', 'Personal'),
                                ('shopping', 'Shopping')],
                         validators=[DataRequired()])
    tags = StringField('Tags')