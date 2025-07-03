document.addEventListener("DOMContentLoaded", function () {
  // Initialize JSConfetti
  const jsConfetti = new JSConfetti();

  // DOM Elements
  const taskList = document.getElementById("task-list");
  const scheduleForm = document.getElementById("schedule-form");
  const deleteButton = document.getElementById("delete-completed");
  const taskSearch = document.getElementById("task-search");
  const categoryFilter = document.getElementById("category-filter");
  const subcategoryFilter = document.getElementById("subcategory-filter");
  const themeToggle = document.getElementById("theme-toggle");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");
  const quickNotes = document.getElementById("quick-notes");
  const saveNotesBtn = document.getElementById("save-notes");
  const totalTasksEl = document.getElementById("total-tasks");
  const completedTasksEl = document.getElementById("completed-tasks");
  const pendingTasksEl = document.getElementById("pending-tasks");

  // Timer variables
  let activeTimer = null;

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
  // Initialize Pomodoro timer
  initPomodoroTimer();

  // Event Listeners
  scheduleForm.addEventListener("submit", handleFormSubmit);
  deleteButton.addEventListener("click", deleteCompletedTasks);
  taskSearch.addEventListener("input", filterTasks);
  categoryFilter.addEventListener("change", filterTasks);
  subcategoryFilter.addEventListener("change", filterTasks);
  themeToggle.addEventListener("click", toggleTheme);
  exportBtn.addEventListener("click", exportTasks);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", importTasks);
  saveNotesBtn.addEventListener("click", saveQuickNotes);

  // Task Functions
  function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    taskList.innerHTML = "";

    // Sort tasks by completion status and then by their saved order
    tasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // Completed tasks come after incomplete ones
      }
      return (a.order || 0) - (b.order || 0); // Then sort by saved order
    });

    tasks.forEach((task) => addTaskToList(task));
  }

  function addTaskToList(task) {
    const listItem = document.createElement("li");
    listItem.draggable = true;
    listItem.dataset.id = task.id;
    listItem.dataset.category = task.category;
    listItem.dataset.subcategory = task.subcategory || "General";

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
      low: "⭕",
    };

    const priorityClasses = {
      high: "priority-high",
      medium: "priority-medium",
      low: "priority-low",
    };

    // Time tracking HTML
    const timeTrackingHTML = `
      <div class="time-tracking">
        <span class="time-spent">${task.timeSpent || 0}</span> / 
        <span class="time-estimated">${task.estimatedTime || 30}</span> mins
        <button class="start-timer" title="Start Timer"><i class="fas fa-play"></i></button>
        <button class="stop-timer" title="Stop Timer"><i class="fas fa-stop"></i></button>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(
            100,
            ((task.timeSpent || 0) / (task.estimatedTime || 30)) * 100
          )}%"></div>
        </div>
      </div>
    `;

    // Resources HTML
    const resourcesHTML =
      task.resources && task.resources.length > 0
        ? `
      <div class="task-resources">
        <strong>Resources:</strong>
        ${task.resources
          .map(
            (url) => `
          <a href="${url}" target="_blank"><i class="fas fa-link"></i> ${url.substring(
              0,
              30
            )}${url.length > 30 ? "..." : ""}</a>
        `
          )
          .join("")}
      </div>
    `
        : "";

    // Recurrence indicator
    const recurrenceHTML =
      task.recurrence && task.recurrence !== "none"
        ? `
      <span class="recurrence-badge">${
        task.recurrence === "spaced"
          ? "🔄 Spaced"
          : task.recurrence === "daily"
          ? "🔄 Daily"
          : "🔄 Weekly"
      }</span>
    `
        : "";

    listItem.innerHTML = `
      <input type="checkbox" id="task-${task.id}" ${
      task.completed ? "checked" : ""
    }>
      <div class="task-content">
          <div class="task-title">
              <span class="priority ${priorityClasses[task.priority]}">${
      priorityIcons[task.priority]
    }</span>
              <span class="task-text">${task.text}</span>
              ${recurrenceHTML}
          </div>
          <div class="task-meta">
              <span class="task-date"><i class="far fa-calendar-alt"></i> ${
                task.date
              }</span>
              <span class="task-category">${task.category}</span>
              <span class="task-subcategory">${
                task.subcategory || "General"
              }</span>
          </div>
          ${timeTrackingHTML}
          ${task.notes ? `<div class="task-notes">${task.notes}</div>` : ""}
          ${resourcesHTML}
      </div>
      <div class="task-actions">
          <button class="edit-task" title="Edit task"><i class="far fa-edit"></i></button>
          <button class="toggle-notes" title="Toggle notes"><i class="fas fa-chevron-down"></i></button>
          <button class="delete-task" title="Delete task"><i class="far fa-trash-alt"></i></button>
      </div>
    `;

    taskList.appendChild(listItem);

    // Add event listeners for the new task
    const checkbox = listItem.querySelector("input[type='checkbox']");
    const editTaskBtn = listItem.querySelector(".edit-task");
    const toggleNotesBtn = listItem.querySelector(".toggle-notes");
    const deleteTaskBtn = listItem.querySelector(".delete-task");
    const notesElement = listItem.querySelector(".task-notes");
    const taskTextElement = listItem.querySelector(".task-text");
    const startTimerBtn = listItem.querySelector(".start-timer");
    const stopTimerBtn = listItem.querySelector(".stop-timer");

    checkbox.addEventListener("change", () => {
      toggleTaskComplete(task.id, checkbox.checked);
      if (checkbox.checked) {
        // Move completed task to bottom
        listItem.remove();
        taskList.appendChild(listItem);
        // Celebrate task completion!
        jsConfetti.addConfetti({
          emojis: ["✅", "🎉", "✨", "👏"],
          emojiSize: 30,
          confettiNumber: 30,
        });
      }
    });

    editTaskBtn.addEventListener("click", () => {
      const newText = prompt("Edit task:", task.text);
      if (newText !== null && newText.trim() !== "") {
        task.text = newText.trim();
        taskTextElement.textContent = task.text;
        updateTaskInStorage(task);
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

    startTimerBtn.addEventListener("click", () => startTimer(task.id));
    stopTimerBtn.addEventListener("click", () => stopTimer(task.id));

    deleteTaskBtn.addEventListener("click", () => deleteTask(task.id));
  }

  // Timer functions
  function startTimer(taskId) {
    if (activeTimer) stopTimer(activeTimer.taskId);

    const task = getTaskById(taskId);
    task.timerStart = new Date().toISOString();
    updateTaskInStorage(task);

    activeTimer = {
      taskId,
      interval: setInterval(() => updateTimerDisplay(taskId), 1000),
    };

    // Update UI
    const listItem = document.querySelector(`li[data-id="${taskId}"]`);
    if (listItem) {
      listItem.querySelector(".start-timer").disabled = true;
      listItem.querySelector(".stop-timer").disabled = false;
    }
  }

  function stopTimer(taskId) {
    if (!activeTimer) return;

    clearInterval(activeTimer.interval);
    const task = getTaskById(taskId);
    const now = new Date();
    const elapsed = Math.round((now - new Date(task.timerStart)) / 60000); // in minutes
    task.timeSpent = (task.timeSpent || 0) + elapsed;
    task.timerStart = null;
    updateTaskInStorage(task);
    updateTaskDisplay(taskId);
    activeTimer = null;

    // Update UI
    const listItem = document.querySelector(`li[data-id="${taskId}"]`);
    if (listItem) {
      listItem.querySelector(".start-timer").disabled = false;
      listItem.querySelector(".stop-timer").disabled = true;
    }
  }

  function updateTimerDisplay(taskId) {
    const task = getTaskById(taskId);
    const now = new Date();
    const elapsed = Math.round((now - new Date(task.timerStart)) / 60000);
    const totalSpent = (task.timeSpent || 0) + elapsed;
    const percentage = Math.min(
      100,
      (totalSpent / (task.estimatedTime || 30)) * 100
    );

    const element = document.querySelector(`li[data-id="${taskId}"]`);
    if (element) {
      element.querySelector(".time-spent").textContent = totalSpent;
      element.querySelector(".progress-fill").style.width = `${percentage}%`;
    }
  }

  function updateTaskDisplay(taskId) {
    const task = getTaskById(taskId);
    const element = document.querySelector(`li[data-id="${taskId}"]`);
    if (element) {
      const percentage = Math.min(
        100,
        ((task.timeSpent || 0) / (task.estimatedTime || 30)) * 100
      );
      element.querySelector(".time-spent").textContent = task.timeSpent || 0;
      element.querySelector(".progress-fill").style.width = `${percentage}%`;
    }
  }

  function handleRecurrence(task) {
    if (task.recurrence === "spaced") {
      task.repetitions = (task.repetitions || 0) + 1;
      const intervals = [1, 3, 7, 14, 30]; // Spaced repetition intervals
      const interval =
        intervals[Math.min(task.repetitions - 1, intervals.length - 1)];
      const nextDate = new Date(task.rawDate);
      nextDate.setDate(nextDate.getDate() + interval);

      return {
        ...task,
        id: Date.now(),
        rawDate: nextDate.toISOString().split("T")[0],
        date: formatDateForDisplay(nextDate.toISOString().split("T")[0]),
        completed: false,
        timeSpent: 0,
        timerStart: null,
      };
    } else if (task.recurrence === "daily") {
      const nextDate = new Date(task.rawDate);
      nextDate.setDate(nextDate.getDate() + 1);
      return {
        ...task,
        id: Date.now(),
        rawDate: nextDate.toISOString().split("T")[0],
        date: formatDateForDisplay(nextDate.toISOString().split("T")[0]),
        completed: false,
        timeSpent: 0,
        timerStart: null,
      };
    } else if (task.recurrence === "weekly") {
      const nextDate = new Date(task.rawDate);
      nextDate.setDate(nextDate.getDate() + 7);
      return {
        ...task,
        id: Date.now(),
        rawDate: nextDate.toISOString().split("T")[0],
        date: formatDateForDisplay(nextDate.toISOString().split("T")[0]),
        completed: false,
        timeSpent: 0,
        timerStart: null,
      };
    }
    return null;
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
    const subcategory = document.getElementById("subcategory").value;
    const notes = document.getElementById("notes").value.trim();
    const recurrence = document.getElementById("recurrence").value;
    const estimatedTime =
      parseInt(document.getElementById("estimated-time").value) || 30;
    const resources = document
      .getElementById("resources")
      .value.split(",")
      .map((url) => url.trim())
      .filter((url) => url);

    if (eventText && eventDate) {
      const newTask = {
        id: Date.now(),
        text: eventText,
        date: formatDateForDisplay(eventDate),
        rawDate: eventDate,
        priority: priority,
        category: category,
        subcategory: subcategory,
        notes: notes,
        completed: false,
        createdAt: new Date().toISOString(),
        order: document.querySelectorAll("#task-list li").length,
        recurrence: recurrence,
        estimatedTime: estimatedTime,
        timeSpent: 0,
        resources: resources,
        repetitions: 0,
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
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function saveTask(task) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.push(task);
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function getTaskById(taskId) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    return tasks.find((t) => t.id === taskId);
  }

  function updateTaskInStorage(updatedTask) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const index = tasks.findIndex((t) => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = updatedTask;
      localStorage.setItem("tasks", JSON.stringify(tasks));
    }
  }

  function toggleTaskComplete(taskId, isCompleted) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const taskIndex = tasks.findIndex((t) => t.id === taskId);

    if (taskIndex !== -1) {
      tasks[taskIndex].completed = isCompleted;

      if (isCompleted && tasks[taskIndex].recurrence !== "none") {
        const nextTask = handleRecurrence(tasks[taskIndex]);
        if (nextTask) {
          tasks.push(nextTask);
          addTaskToList(nextTask);
        }
      }

      localStorage.setItem("tasks", JSON.stringify(tasks));
      updateTaskStats();
    }
  }

  function deleteTask(taskId) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
    loadTasks();
    updateTaskStats();
  }

  function deleteCompletedTasks() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const incompleteTasks = tasks.filter((task) => !task.completed);
    localStorage.setItem("tasks", JSON.stringify(incompleteTasks));
    loadTasks();
    updateTaskStats();
  }

  function saveTaskOrder() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const taskElements = taskList.querySelectorAll("li");

    // Update order property based on current DOM position
    taskElements.forEach((el, index) => {
      const taskId = parseInt(el.dataset.id);
      const taskIndex = tasks.findIndex((task) => task.id === taskId);
      if (taskIndex !== -1) {
        tasks[taskIndex].order = index;
      }
    });

    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  // Set up drag and drop with order persistence
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
      saveTaskOrder(); // Save the new order
    }
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll("li:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  function filterTasks() {
    const searchTerm = taskSearch.value.toLowerCase();
    const category = categoryFilter.value;
    const subcategory = subcategoryFilter.value;
    const taskElements = taskList.querySelectorAll("li");

    taskElements.forEach((taskEl) => {
      const text = taskEl.textContent.toLowerCase();
      const taskCategory = taskEl.dataset.category;
      const taskSubcategory = taskEl.dataset.subcategory;
      const isHighPriority = taskEl.querySelector(".priority-high");
      const isCompleted = taskEl.querySelector(
        'input[type="checkbox"]'
      ).checked;

      const matchesSearch = text.includes(searchTerm);
      const matchesCategory = category === "all" || taskCategory === category;
      const matchesSubcategory =
        subcategory === "all" || taskSubcategory === subcategory;

      // New focus mode condition
      const focusCondition =
        !isFocusMode || (isFocusMode && isHighPriority && !isCompleted);

      if (
        matchesSearch &&
        matchesCategory &&
        matchesSubcategory &&
        focusCondition
      ) {
        taskEl.style.display = "flex";
      } else {
        taskEl.style.display = "none";
      }
    });
  }

  function updateTaskStats() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
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
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;

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
    reader.onload = function (e) {
      try {
        const importedTasks = JSON.parse(e.target.result);

        if (Array.isArray(importedTasks)) {
          // Merge with existing tasks, avoiding duplicates
          const existingTasks = JSON.parse(localStorage.getItem("tasks")) || [];
          const existingIds = existingTasks.map((task) => task.id);

          const newTasks = importedTasks.filter(
            (task) => !existingIds.includes(task.id)
          );
          const allTasks = [...existingTasks, ...newTasks];

          localStorage.setItem("tasks", JSON.stringify(allTasks));
          loadTasks();
          updateTaskStats();
          alert(`Successfully imported ${newTasks.length} new tasks!`);
        } else {
          alert("Invalid tasks file format.");
        }
      } catch (error) {
        alert(
          "Error parsing the file. Please make sure it's a valid JSON file."
        );
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
    document.getElementById("digitalTime").textContent = `${String(
      hours
    ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    document.getElementById("digitalDate").textContent = now.toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  // Stopwatch
  function initStopwatch() {
    let stopwatchTimer;
    let stopwatchMinutes = 0;
    let stopwatchSeconds = 0;
    let stopwatchMilliseconds = 0;
    let stopwatchRunning = false;
    let lapCount = 1;

    const display = document.querySelector(".stopwatch .display");
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");
    const resetBtn = document.getElementById("resetBtn");
    const lapBtn = document.getElementById("lapBtn");
    const lapTimesList = document.getElementById("lap-times");

    function updateStopwatchDisplay() {
      display.textContent =
        `${String(stopwatchMinutes).padStart(2, "0")}:` +
        `${String(stopwatchSeconds).padStart(2, "0")}:` +
        `${String(Math.floor(stopwatchMilliseconds / 10)).padStart(2, "0")}`;
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
      lapTimesList.innerHTML = "";
      updateStopwatchDisplay();
    }

    function recordLap() {
      if (stopwatchRunning) {
        const lapTime = document.createElement("li");
        lapTime.textContent = `Lap ${lapCount++}: ${display.textContent}`;
        lapTimesList.prepend(lapTime);
      }
    }

    startBtn.addEventListener("click", startStopwatch);
    stopBtn.addEventListener("click", stopStopwatch);
    resetBtn.addEventListener("click", resetStopwatch);
    lapBtn.addEventListener("click", recordLap);

    // Initialize display
    updateStopwatchDisplay();
  }

  // Pomodoro Timer
  function initPomodoroTimer() {
    const timerDisplay = document.querySelector(
      ".pomodoro-timer .timer-display"
    );
    const startBtn = document.getElementById("pomodoro-start");
    const pauseBtn = document.getElementById("pomodoro-pause");
    const resetBtn = document.getElementById("pomodoro-reset");
    const cycleCount = document.getElementById("cycle-count");

    let timer;
    let minutes = 25;
    let seconds = 0;
    let cycles = 0;
    let isRunning = false;
    let isBreak = false;

    function updateDisplay() {
      timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;
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
      const audio = new Audio(
        "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3"
      );
      audio.play();

      if (!isBreak) {
        // Work session completed → Start break
        isBreak = true;
        minutes = 5;
        cycles++;
        cycleCount.textContent = cycles;

        // Show notification
        alert("Time for a 5-minute break!");

        // Auto-start break timer (optional)
        startTimer();
      } else {
        // Break completed → Start work session
        isBreak = false;
        minutes = 25;

        if (cycles % 4 === 0) {
          // Every 4 cycles → Long break
          minutes = 15;
          alert("Great job! Take a 15-minute long break.");
        } else {
          alert("Break over! Back to work for 25 minutes.");
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
    startBtn.addEventListener("click", startTimer);
    pauseBtn.addEventListener("click", pauseTimer);
    resetBtn.addEventListener("click", resetTimer);

    // Initialize
    updateDisplay();
  }
});
// Replace any existing focus mode code with this:

// Create Focus Mode button
const focusModeBtn = document.createElement('button');
focusModeBtn.id = 'focus-mode';
focusModeBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Focus Mode';
document.querySelector('.header-controls').appendChild(focusModeBtn);

let isFocusMode = false;

focusModeBtn.addEventListener('click', () => {
  isFocusMode = !isFocusMode;
  document.body.classList.toggle('focus-mode', isFocusMode);
  
  if (isFocusMode) {
    // Move Pomodoro timer to center
    const pomodoro = document.querySelector('.pomodoro-section');
    document.body.appendChild(pomodoro);
    pomodoro.classList.add('focus-pomodoro');
    
    // Create exit button
    const exitBtn = document.createElement('button');
    exitBtn.className = 'exit-focus';
    exitBtn.innerHTML = '<i class="fas fa-times"></i> Exit Focus';
    document.body.appendChild(exitBtn);
    
    exitBtn.addEventListener('click', () => {
      focusModeBtn.click(); // Toggle focus mode off
    });
  } else {
    // Return Pomodoro to original position
    const tasksSection = document.getElementById('tasks');
    tasksSection.querySelector('.container').appendChild(
      document.querySelector('.pomodoro-section')
    );
    document.querySelector('.pomodoro-section').classList.remove('focus-pomodoro');
    
    // Remove exit button
    document.querySelector('.exit-focus')?.remove();
  }
});

// Update your existing Focus Mode code:

// Check for saved focus mode state
const savedFocusMode = localStorage.getItem('focusMode') === 'true';
if (savedFocusMode) {
  document.body.classList.add('focus-mode');
  activateFocusMode(); // Initialize focus mode if it was active
}

focusModeBtn.addEventListener('click', () => {
  const newFocusMode = !document.body.classList.contains('focus-mode');
  document.body.classList.toggle('focus-mode', newFocusMode);
  localStorage.setItem('focusMode', newFocusMode.toString());
  
  if (newFocusMode) {
    activateFocusMode();
  } else {
    deactivateFocusMode();
  }
});

// Separate functions for cleaner code
function activateFocusMode() {
  const pomodoro = document.querySelector('.pomodoro-section');
  document.body.appendChild(pomodoro);
  pomodoro.classList.add('focus-pomodoro');
  
  const exitBtn = document.createElement('button');
  exitBtn.className = 'exit-focus';
  exitBtn.innerHTML = '<i class="fas fa-times"></i> Exit Focus';
  document.body.appendChild(exitBtn);
  
  exitBtn.addEventListener('click', () => {
    document.body.classList.remove('focus-mode');
    localStorage.setItem('focusMode', 'false');
    deactivateFocusMode();
  });
}

function deactivateFocusMode() {
  const tasksSection = document.getElementById('tasks');
  const pomodoro = document.querySelector('.pomodoro-section');
  tasksSection.querySelector('.container').appendChild(pomodoro);
  pomodoro.classList.remove('focus-pomodoro');
  document.querySelector('.exit-focus')?.remove();
}
