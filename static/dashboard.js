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

// Sample Tasks Data (Load from localStorage if available)
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// Render Tasks
function renderTasks(filter = 'all', searchQuery = '') {
  taskList.innerHTML = ''; // Clear the task list

  tasks.forEach((task) => {
    const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
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
      taskElement.setAttribute('draggable', true);
      taskElement.innerHTML = `
        <input type="checkbox" id="task${task.id}" ${task.completed ? 'checked' : ''} />
        <label for="task${task.id}">${task.title}</label>
        <span class="task-priority ${task.priority}">${task.priority}</span>
        <span class="task-date ${isOverdue ? 'overdue' : ''}">Due: ${task.dueDate}</span>
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

  updateOverviewCards();
  updateProgressBar();
  saveTasksToLocalStorage();
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
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const dueDate = taskDueDateInput.value;
  const priority = taskPriorityInput.value;

  if (title && dueDate && priority) {
    const isEditing = taskForm.dataset.editTaskId;

    if (isEditing) {
      // Edit existing task
      const taskId = parseInt(taskForm.dataset.editTaskId, 10);
      const task = tasks.find((task) => task.id === taskId);
      if (task) {
        task.title = title;
        task.dueDate = dueDate;
        task.priority = priority;
      }
    } else {
      // Add new task
      const newTask = {
        id: tasks.length + 1,
        title,
        dueDate,
        completed: false,
        priority,
      };
      tasks.push(newTask);
    }

    renderTasks();
    closeModal();
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
function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  renderTasks();
}

// Toggle Task Completion
function toggleTaskCompletion(taskId) {
  const task = tasks.find((task) => task.id === taskId);
  task.completed = !task.completed;
  renderTasks();
}

// Edit Task (Open Modal with Task Details)
function editTask(taskId) {
  const task = tasks.find((task) => task.id === taskId);
  if (task) {
    // Update modal title and submit button text
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('submitButton').textContent = 'Save Changes';

    // Pre-fill the form with task details
    taskTitleInput.value = task.title;
    taskDueDateInput.value = task.dueDate;
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
function updateOverviewCards() {
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const pendingTasksCount = tasks.filter((task) => !task.completed).length;
  const overdueTasksCount = tasks.filter(
    (task) => new Date(task.dueDate) < new Date() && !task.completed
  ).length;

  totalTasks.textContent = totalTasksCount;
  completedTasks.textContent = completedTasksCount;
  pendingTasks.textContent = pendingTasksCount;
  overdueTasks.textContent = overdueTasksCount;
}

// Update Progress Bar
function updateProgressBar() {
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const totalTasksCount = tasks.length;
  const progress = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
  progressBar.style.width = `${progress}%`;
}

// Save Tasks to Local Storage
function saveTasksToLocalStorage() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}


// Drag-and-Drop Reordering
let draggedTask = null;

taskList.addEventListener('dragstart', (e) => {
  if (e.target.classList.contains('task')) {
    draggedTask = e.target;
    e.target.style.opacity = '0.5';
  }
});

taskList.addEventListener('dragover', (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(taskList, e.clientY);
  if (afterElement) {
    taskList.insertBefore(draggedTask, afterElement);
  } else {
    taskList.appendChild(draggedTask);
  }
});

taskList.addEventListener('dragend', (e) => {
  if (e.target.classList.contains('task')) {
    e.target.style.opacity = '1';
    draggedTask = null;
  }
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// Dark Mode Toggle
const themeToggle = document.querySelector('.theme-toggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
}

// Export Tasks as CSV
const exportTasksButton = document.getElementById('exportTasks');
exportTasksButton.addEventListener('click', () => {
  const csvContent = tasks.map(task => `${task.id},${task.title},${task.dueDate},${task.priority},${task.completed}`).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tasks.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// Initial Render
renderTasks();