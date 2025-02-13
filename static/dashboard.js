const addTaskButton = document.getElementById('addTaskButton');
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const taskTitleInput = document.getElementById('taskTitle');
const taskDueDateInput = document.getElementById('taskDueDate');
const taskPriorityInput = document.getElementById('taskPriority');
const taskList = document.getElementById('taskList');
const searchInput = document.getElementById('searchInput');
const progressBar = document.getElementById('progressBar');
const totalTasks = document.getElementById('totalTasks');
const completedTasks = document.getElementById('completedTasks');
const pendingTasks = document.getElementById('pendingTasks');
const overdueTasks = document.getElementById('overdueTasks');
const taskFilters = document.querySelectorAll('.task-filters .btn');

// Fetch tasks from the backend
async function fetchTasks() {
    const response = await fetch('/tasks');
    return await response.json();
}

async function fetchTasks() {
  try {
      const response = await fetch('/tasks');
      if (!response.ok) {
          throw new Error('Failed to fetch tasks');
      }
      return await response.json();
  } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
  }
}

// Render tasks on the dashboard
async function renderTasks(filter = 'all', searchQuery = '') {
    const tasks = await fetchTasks();
    taskList.innerHTML = ''; // Clear the task list

    tasks.forEach((task) => {
        const isOverdue = new Date(task.due_date) < new Date() && !task.completed;
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());

        if (
            (filter === 'all' ||
                (filter === 'pending' && !task.completed) ||
                (filter === 'completed' && task.completed) ||
                (filter === 'overdue' && isOverdue)) &&
            matchesSearch
        ) {
            const taskElement = document.createElement('div');
            taskElement.classList.add('task');
            taskElement.setAttribute('data-id', task.id);
            taskElement.innerHTML = `
                <input type="checkbox" id="task${task.id}" ${task.completed ? 'checked' : ''} />
                <label for="task${task.id}">${task.title}</label>
                <span class="task-priority ${task.priority}">${task.priority}</span>
                <span class="task-date ${isOverdue ? 'overdue' : ''}">Due: ${new Date(task.due_date).toLocaleDateString()}</span>
                <div class="task-actions">
                    <button class="btn icon" onclick="editTask(${task.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn icon" onclick="deleteTask(${task.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            taskList.appendChild(taskElement);

            // Add event listener for checkbox
            const checkbox = taskElement.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));
        }
    });

    updateOverviewCards(tasks);
    updateProgressBar(tasks);
}

// Add Task Button Click
addTaskButton.addEventListener('click', () => {
    taskForm.reset(); // Reset form fields
    taskForm.dataset.editTaskId = ''; // Clear edit state
    document.getElementById('modalTitle').textContent = 'Create New Task';
    document.getElementById('submitButton').textContent = 'Create Task';
    taskModal.style.display = 'flex';
});

// Handle Form Submission (Add or Edit Task)
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = taskTitleInput.value.trim();
    const dueDate = taskDueDateInput.value;
    const priority = taskPriorityInput.value;

    if (title && dueDate && priority) {
        const isEditing = taskForm.dataset.editTaskId;

        if (isEditing) {
            // Edit existing task
            const taskId = parseInt(taskForm.dataset.editTaskId, 10);
            const response = await fetch(`/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    dueDate,
                    priority,
                }),
            });
            if (response.ok) {
                renderTasks();
                closeModal();
            }
        } else {
            // Add new task
            const response = await fetch('/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    dueDate,
                    priority,
                }),
            });
            if (response.ok) {
                renderTasks();
                closeModal();
            }
        }
    } else {
        alert('Please fill out all fields.');
    }
});

// Close Modal
function closeModal() {
    taskModal.style.display = 'none';
    taskForm.reset(); // Reset form fields
    taskForm.dataset.editTaskId = ''; // Clear edit state
}

// Delete Task
async function deleteTask(taskId) {
    const response = await fetch(`/tasks/${taskId}`, {
        method: 'DELETE',
    });
    if (response.ok) {
        renderTasks();
    }
}

// Toggle Task Completion
async function toggleTaskCompletion(taskId) {
    const task = await fetch(`/tasks/${taskId}`).then(res => res.json());
    const response = await fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            completed: !task.completed,
        }),
    });
    if (response.ok) {
        renderTasks();
    }
}

// Edit Task (Open Modal with Task Details)
async function editTask(taskId) {
    const task = await fetch(`/tasks/${taskId}`).then(res => res.json());
    if (task) {
        // Update modal title and submit button text
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('submitButton').textContent = 'Save Changes';

        // Pre-fill the form with task details
        taskTitleInput.value = task.title;
        taskDueDateInput.value = task.due_date.split('T')[0]; // Format date for input
        taskPriorityInput.value = task.priority;

        // Store the task ID in a data attribute for reference
        taskForm.dataset.editTaskId = taskId;

        // Open the modal
        taskModal.style.display = 'flex';
    }
}

// Filter Tasks
taskFilters.forEach((filter) => {
    filter.addEventListener('click', () => {
        taskFilters.forEach((btn) => btn.classList.remove('active'));
        filter.classList.add('active');
        renderTasks(filter.dataset.filter);
    });
});

// Search Tasks
searchInput.addEventListener('input', () => {
    renderTasks('all', searchInput.value);
});

// Update Overview Cards
function updateOverviewCards(tasks) {
    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter((task) => task.completed).length;
    const pendingTasksCount = tasks.filter((task) => !task.completed).length;
    const overdueTasksCount = tasks.filter(
        (task) => new Date(task.due_date) < new Date() && !task.completed
    ).length;

    totalTasks.textContent = totalTasksCount;
    completedTasks.textContent = completedTasksCount;
    pendingTasks.textContent = pendingTasksCount;
    overdueTasks.textContent = overdueTasksCount;
}

// Update Progress Bar
function updateProgressBar(tasks) {
    const completedTasksCount = tasks.filter((task) => task.completed).length;
    const totalTasksCount = tasks.length;
    const progress = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
    progressBar.style.width = `${progress}%`;
}

const themeToggle = document.querySelector('.theme-toggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});


if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }

// Initial Render
renderTasks();