document.addEventListener("DOMContentLoaded", function () {
  const taskList = document.getElementById("task-list");

  // Load tasks from local storage
  function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.forEach((task) => {
      addTaskToList(task);
    });
  }

  // Function to add task to the list
  function addTaskToList(task) {
    const listItem = document.createElement("li");
    listItem.innerHTML = `
            <input type="checkbox" id="${task.id}" ${
      task.completed ? "checked" : ""
    }>
            <label for="${task.id}">${task.text}</label>
        `;
    taskList.appendChild(listItem);
  }

  // Handle form submission
  const scheduleForm = document.getElementById("schedule-form");
  scheduleForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const eventText = document.getElementById("event").value.trim();
    const eventDate = document.getElementById("date").value.trim();

    if (eventText && eventDate) {
      const newTask = {
        id: Date.now(),
        text: eventText + " - " + eventDate,
        completed: false,
      };

      addTaskToList(newTask);
      saveTask(newTask);

      document.getElementById("event").value = "";
      document.getElementById("date").value = "";
    }
  });

  // Function to save task to local storage
  function saveTask(task) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.push(task);
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  // Handle checkbox clicks to mark task as completed
  taskList.addEventListener("change", function (event) {
    if (event.target.type === "checkbox") {
      const taskId = parseInt(event.target.id);
      const tasks = JSON.parse(localStorage.getItem("tasks"));
      const updatedTasks = tasks.map((task) => {
        if (task.id === taskId) {
          task.completed = event.target.checked;
        }
        return task;
      });
      localStorage.setItem("tasks", JSON.stringify(updatedTasks));
    }
  });

  // Delete all tasks after today
  const deleteAfterTodayButton = document.getElementById("delete-after-today");
  deleteAfterTodayButton.addEventListener("click", function () {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Clear time to compare dates

    // Filter tasks that are due today or earlier
    const filteredTasks = tasks.filter((task) => {
      const dueDate = new Date(task.text.split(" - ")[1]); // Assuming task.text is in format "Event - Date"
      return dueDate <= today;
    });

    // Update local storage with filtered tasks
    localStorage.setItem("tasks", JSON.stringify(filteredTasks));

    // Clear task list on the page
    taskList.innerHTML = "";

    // Reload tasks from updated local storage
    loadTasks();
  });

  // Digital clock
  function updateDigitalClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const amPm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // 12-hour format
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");

    document.getElementById("amPm").textContent = amPm;
    document.getElementById("digitalTime").textContent = `${hh}:${mm}`;
  }

  setInterval(updateDigitalClock, 1000);
  updateDigitalClock();

  // Initial load of tasks
  loadTasks();
});
