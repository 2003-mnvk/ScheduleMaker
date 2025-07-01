document.addEventListener("DOMContentLoaded", function () {
    // Initialize JSConfetti
    const jsConfetti = new JSConfetti();
    
    // DOM Elements
    const taskList = document.getElementById("task-list");
    const scheduleForm = document.getElementById("schedule-form");
    const deleteButton = document.getElementById("delete-completed");
    const taskSearch = document.getElementById("task-search");
    const categoryFilter = document.getElementById("category-filter");
    const themeToggle = document.getElementById("theme-toggle");
    const exportBtn = document.getElementById("export-btn");
    const importBtn = document.getElementById("import-btn");
    const importFile = document.getElementById("import-file");
    const quickNotes = document.getElementById("quick-notes");
    const saveNotesBtn = document.getElementById("save-notes");
    const totalTasksEl = document.getElementById("total-tasks");
    const completedTasksEl = document.getElementById("completed-tasks");
    const pendingTasksEl = document.getElementById("pending-tasks");
    
    // Check for saved theme preference
    const currentTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    updateThemeIcon(currentTheme);
    
    // Load all data
    loadTasks();
    loadQuickNotes();
    updateTaskStats();
    updateDigitalClock();
    setInterval(updateDigitalClock, 1000);
    
    // Initialize stopwatch
    initStopwatch();
    
    // Event Listeners
    scheduleForm.addEventListener("submit", handleFormSubmit);
    deleteButton.addEventListener("click", deleteCompletedTasks);
    taskSearch.addEventListener("input", filterTasks);
    categoryFilter.addEventListener("change", filterTasks);
    themeToggle.addEventListener("click", toggleTheme);
    exportBtn.addEventListener("click", exportTasks);
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", importTasks);
    saveNotesBtn.addEventListener("click", saveQuickNotes);
    
    // Drag and drop functionality
    let draggedItem = null;
    
    taskList.addEventListener("dragstart", (e) => {
        if (e.target.tagName === "LI") {
            draggedItem = e.target;
            e.target.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/html", e.target.innerHTML);
        }
    });
    
    taskList.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        
        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(draggedItem);
        } else {
            taskList.insertBefore(draggedItem, afterElement);
        }
    });
    
    taskList.addEventListener("dragend", (e) => {
        if (e.target.tagName === "LI") {
            e.target.classList.remove("dragging");
            saveTaskOrder();
        }
    });
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll("li:not(.dragging)")];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    // Task Functions
    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        taskList.innerHTML = "";
        
        // Sort tasks by due date (ascending) and priority (high first)
        tasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            const dateA = new Date(a.rawDate);
            const dateB = new Date(b.rawDate);
            
            if (dateA - dateB !== 0) {
                return dateA - dateB;
            }
            
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        tasks.forEach(task => addTaskToList(task));
    }
    
    function addTaskToList(task) {
        const listItem = document.createElement("li");
        listItem.draggable = true;
        listItem.dataset.id = task.id;
        listItem.dataset.category = task.category;
        
        // Check if task is overdue or due soon
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.rawDate);
        
        if (!task.completed && dueDate < today) {
            listItem.classList.add("overdue");
        } else if (!task.completed && isDueSoon(dueDate)) {
            listItem.classList.add("due-soon");
        }
        
        // Priority indicator
        const priorityIcons = {
            high: "⭐️",
            medium: "⏳",
            low: "⭕"
        };
        
        const priorityClasses = {
            high: "priority-high",
            medium: "priority-medium",
            low: "priority-low"
        };
        
        listItem.innerHTML = `
            <input type="checkbox" id="task-${task.id}" ${task.completed ? "checked" : ""}>
            <div class="task-content">
                <div class="task-title">
                    <span class="priority ${priorityClasses[task.priority]}">${priorityIcons[task.priority]}</span>
                    ${task.text}
                </div>
                <div class="task-meta">
                    <span class="task-date"><i class="far fa-calendar-alt"></i> ${task.date}</span>
                    <span class="task-category">${task.category}</span>
                </div>
                ${task.notes ? `<div class="task-notes">${task.notes}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="toggle-notes" title="Toggle notes"><i class="fas fa-chevron-down"></i></button>
                <button class="delete-task" title="Delete task"><i class="far fa-trash-alt"></i></button>
            </div>
        `;
        
        taskList.appendChild(listItem);
        
        // Add event listeners for the new task
        const checkbox = listItem.querySelector("input[type='checkbox']");
        const toggleNotesBtn = listItem.querySelector(".toggle-notes");
        const deleteTaskBtn = listItem.querySelector(".delete-task");
        const notesElement = listItem.querySelector(".task-notes");
        
        checkbox.addEventListener("change", () => {
            toggleTaskComplete(task.id, checkbox.checked);
            
            if (checkbox.checked) {
                // Celebrate task completion!
                jsConfetti.addConfetti({
                    emojis: ['✅', '🎉', '✨', '👏'],
                    emojiSize: 30,
                    confettiNumber: 30,
                });
            }
        });
        
        if (notesElement) {
            toggleNotesBtn.addEventListener("click", () => {
                notesElement.classList.toggle("show");
                toggleNotesBtn.querySelector("i").classList.toggle("fa-chevron-down");
                toggleNotesBtn.querySelector("i").classList.toggle("fa-chevron-up");
            });
        } else {
            toggleNotesBtn.style.display = "none";
        }
        
        deleteTaskBtn.addEventListener("click", () => deleteTask(task.id));
    }
    
    function isDueSoon(dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const timeDiff = dueDate - today;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        return daysDiff <= 3 && daysDiff >= 0;
    }
    
    function handleFormSubmit(event) {
        event.preventDefault();
        
        const eventText = document.getElementById("event").value.trim();
        const eventDate = document.getElementById("date").value;
        const priority = document.getElementById("priority").value;
        const category = document.getElementById("category").value;
        const notes = document.getElementById("notes").value.trim();
        
        if (eventText && eventDate) {
            const newTask = {
                id: Date.now(),
                text: eventText,
                date: formatDateForDisplay(eventDate),
                rawDate: eventDate,
                priority: priority,
                category: category,
                notes: notes,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            addTaskToList(newTask);
            saveTask(newTask);
            updateTaskStats();
            scheduleForm.reset();
            
            // Reset notes textarea
            document.getElementById("notes").value = "";
        }
    }
    
    function formatDateForDisplay(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    function saveTask(task) {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks.push(task);
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }
    
    function toggleTaskComplete(taskId, isCompleted) {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
                task.completed = isCompleted;
            }
            return task;
        });
        localStorage.setItem("tasks", JSON.stringify(updatedTasks));
        updateTaskStats();
    }
    
    function deleteTask(taskId) {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        localStorage.setItem("tasks", JSON.stringify(updatedTasks));
        loadTasks();
        updateTaskStats();
    }
    
    function deleteCompletedTasks() {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const incompleteTasks = tasks.filter(task => !task.completed);
        localStorage.setItem("tasks", JSON.stringify(incompleteTasks));
        loadTasks();
        updateTaskStats();
    }
    
    function saveTaskOrder() {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const taskElements = taskList.querySelectorAll("li");
        
        // Create a mapping of task IDs to their order
        const orderMap = {};
        taskElements.forEach((el, index) => {
            orderMap[el.dataset.id] = index;
        });
        
        // Sort tasks based on the DOM order
        tasks.sort((a, b) => orderMap[a.id] - orderMap[b.id]);
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }
    
    function filterTasks() {
        const searchTerm = taskSearch.value.toLowerCase();
        const category = categoryFilter.value;
        const taskElements = taskList.querySelectorAll("li");
        
        taskElements.forEach(taskEl => {
            const text = taskEl.textContent.toLowerCase();
            const taskCategory = taskEl.dataset.category;
            
            const matchesSearch = text.includes(searchTerm);
            const matchesCategory = category === "all" || taskCategory === category;
            
            if (matchesSearch && matchesCategory) {
                taskEl.style.display = "flex";
            } else {
                taskEl.style.display = "none";
            }
        });
    }
    
    function updateTaskStats() {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;
        
        totalTasksEl.textContent = `Total: ${total}`;
        completedTasksEl.textContent = `Completed: ${completed}`;
        pendingTasksEl.textContent = `Pending: ${pending}`;
    }
    
    // Theme Functions
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "light" ? "dark" : "light";
        
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        updateThemeIcon(newTheme);
    }
    
    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector("i");
        icon.className = theme === "light" ? "fas fa-moon" : "fas fa-sun";
    }
    
    // Import/Export Functions
    function exportTasks() {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const dataStr = JSON.stringify(tasks, null, 2);
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
        
        const exportName = `tasks-${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportName);
        linkElement.click();
    }
    
    function importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedTasks = JSON.parse(e.target.result);
                
                if (Array.isArray(importedTasks)) {
                    // Merge with existing tasks, avoiding duplicates
                    const existingTasks = JSON.parse(localStorage.getItem("tasks")) || [];
                    const existingIds = existingTasks.map(task => task.id);
                    
                    const newTasks = importedTasks.filter(task => !existingIds.includes(task.id));
                    const allTasks = [...existingTasks, ...newTasks];
                    
                    localStorage.setItem("tasks", JSON.stringify(allTasks));
                    loadTasks();
                    updateTaskStats();
                    alert(`Successfully imported ${newTasks.length} new tasks!`);
                } else {
                    alert("Invalid tasks file format.");
                }
            } catch (error) {
                alert("Error parsing the file. Please make sure it's a valid JSON file.");
                console.error(error);
            }
        };
        reader.readAsText(file);
        
        // Reset the file input
        event.target.value = "";
    }
    
    // Quick Notes Functions
    function loadQuickNotes() {
        const notes = localStorage.getItem("quick-notes") || "";
        quickNotes.value = notes;
    }
    
    function saveQuickNotes() {
        localStorage.setItem("quick-notes", quickNotes.value);
        const notification = document.createElement("div");
        notification.textContent = "Notes saved!";
        notification.style.position = "fixed";
        notification.style.bottom = "20px";
        notification.style.right = "20px";
        notification.style.backgroundColor = "var(--success-color)";
        notification.style.color = "white";
        notification.style.padding = "10px 20px";
        notification.style.borderRadius = "5px";
        notification.style.zIndex = "1000";
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = "0";
            notification.style.transition = "opacity 0.5s";
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    }
    
    // Digital Clock
    function updateDigitalClock() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const amPm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        
        document.getElementById("amPm").textContent = amPm;
        document.getElementById("digitalTime").textContent = 
            `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        
        document.getElementById("digitalDate").textContent = 
            now.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
    }
    
    // Stopwatch
    function initStopwatch() {
        let stopwatchTimer;
        let stopwatchMinutes = 0;
        let stopwatchSeconds = 0;
        let stopwatchMilliseconds = 0;
        let stopwatchRunning = false;
        let lapCount = 1;
        
        const display = document.querySelector('.stopwatch .display');
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const resetBtn = document.getElementById('resetBtn');
        const lapBtn = document.getElementById('lapBtn');
        const lapTimesList = document.getElementById('lap-times');
        
        function updateStopwatchDisplay() {
            display.textContent = 
                `${String(stopwatchMinutes).padStart(2, '0')}:` +
                `${String(stopwatchSeconds).padStart(2, '0')}:` +
                `${String(Math.floor(stopwatchMilliseconds / 10)).padStart(2, '0')}`;
        }
        
        function startStopwatch() {
            if (!stopwatchRunning) {
                stopwatchRunning = true;
                stopwatchTimer = setInterval(() => {
                    stopwatchMilliseconds += 10;
                    if (stopwatchMilliseconds >= 1000) {
                        stopwatchMilliseconds = 0;
                        stopwatchSeconds++;
                    }
                    if (stopwatchSeconds >= 60) {
                        stopwatchSeconds = 0;
                        stopwatchMinutes++;
                    }
                    updateStopwatchDisplay();
                }, 10);
            }
        }
        
        function stopStopwatch() {
            stopwatchRunning = false;
            clearInterval(stopwatchTimer);
        }
        
        function resetStopwatch() {
            stopwatchRunning = false;
            clearInterval(stopwatchTimer);
            stopwatchMinutes = 0;
            stopwatchSeconds = 0;
            stopwatchMilliseconds = 0;
            lapCount = 1;
            lapTimesList.innerHTML = '';
            updateStopwatchDisplay();
        }
        
        function recordLap() {
            if (stopwatchRunning) {
                const lapTime = document.createElement('li');
                lapTime.textContent = `Lap ${lapCount++}: ${display.textContent}`;
                lapTimesList.prepend(lapTime);
            }
        }
        
        startBtn.addEventListener('click', startStopwatch);
        stopBtn.addEventListener('click', stopStopwatch);
        resetBtn.addEventListener('click', resetStopwatch);
        lapBtn.addEventListener('click', recordLap);
        
        // Initialize display
        updateStopwatchDisplay();
    }
});

// Pomodoro Timer Functionality
function initPomodoroTimer() {
  const timerDisplay = document.querySelector('.timer-display');
  const startBtn = document.getElementById('pomodoro-start');
  const pauseBtn = document.getElementById('pomodoro-pause');
  const resetBtn = document.getElementById('pomodoro-reset');
  const cycleCount = document.getElementById('cycle-count');
  
  let timer;
  let minutes = 25;
  let seconds = 0;
  let cycles = 0;
  let isRunning = false;
  let isBreak = false;

  function updateDisplay() {
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function startTimer() {
    if (!isRunning) {
      isRunning = true;
      timer = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer completed
            clearInterval(timer);
            isRunning = false;
            handleTimerCompletion();
            return;
          }
          minutes--;
          seconds = 59;
        } else {
          seconds--;
        }
        updateDisplay();
      }, 1000);
    }
  }

  function handleTimerCompletion() {
    // Play alert sound
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
    audio.play();

    if (!isBreak) {
      // Work session completed → Start break
      isBreak = true;
      minutes = 5;
      cycles++;
      cycleCount.textContent = cycles;
      
      // Show notification
      alert('Time for a 5-minute break!');
      
      // Auto-start break timer (optional)
      startTimer();
    } else {
      // Break completed → Start work session
      isBreak = false;
      minutes = 25;
      
      if (cycles % 4 === 0) {
        // Every 4 cycles → Long break
        minutes = 15;
        alert('Great job! Take a 15-minute long break.');
      } else {
        alert('Break over! Back to work for 25 minutes.');
      }
      
      startTimer();
    }
    updateDisplay();
  }

  function pauseTimer() {
    clearInterval(timer);
    isRunning = false;
  }

  function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    isBreak = false;
    minutes = 25;
    seconds = 0;
    updateDisplay();
  }

  // Event Listeners
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Initialize
  updateDisplay();
}

// Call this in your DOMContentLoaded event
initPomodoroTimer();
