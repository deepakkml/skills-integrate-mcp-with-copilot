document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const authStatus = document.getElementById("auth-status");
  const authForms = document.getElementById("login-forms");
  const currentUserSpan = document.getElementById("current-user");
  const currentRoleSpan = document.getElementById("current-role");
  const logoutButton = document.getElementById("logout-button");
  const authMessage = document.getElementById("auth-message");
  const adminContainer = document.getElementById("admin-container");
  const createForm = document.getElementById("create-activity-form");
  const createMessage = document.getElementById("create-message");

  let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  let authToken = localStorage.getItem("token");

  function getAuthHeaders() {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }

  function showMessage(element, text, type = "success") {
    element.textContent = text;
    element.className = type;
    element.classList.remove("hidden");
    setTimeout(() => {
      element.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    if (currentUser && authToken) {
      authStatus.classList.remove("hidden");
      authForms.classList.add("hidden");
      currentUserSpan.textContent = currentUser.name || currentUser.email;
      currentRoleSpan.textContent = currentUser.role || "student";
      if (currentUser.role === "admin") {
        adminContainer.classList.remove("hidden");
      } else {
        adminContainer.classList.add("hidden");
      }
    } else {
      authStatus.classList.add("hidden");
      authForms.classList.remove("hidden");
      adminContainer.classList.add("hidden");
    }
  }

  function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    updateAuthUI();
    showMessage(authMessage, "You have been logged out.", "success");
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities", {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants.map((email) => {
                  const canRemove = currentUser && (currentUser.role === "admin" || currentUser.email === email);
                  const button = canRemove ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : "";
                  return `<li><span class="participant-email">${email}</span>${button}</li>`;
                }).join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!authToken) {
      showMessage(messageDiv, "Please log in before signing up.", "error");
      return;
    }

    const activity = document.getElementById("activity").value;
    if (!activity) {
      showMessage(messageDiv, "Please select an activity.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (response.ok) {
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem("token", authToken);
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        updateAuthUI();
        fetchActivities();
        showMessage(authMessage, `Logged in as ${currentUser.email}.`, "success");
        loginForm.reset();
      } else {
        showMessage(authMessage, result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage(authMessage, "Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "student", name: email }),
      });
      const result = await response.json();
      if (response.ok) {
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem("token", authToken);
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        updateAuthUI();
        fetchActivities();
        showMessage(authMessage, `Registered and logged in as ${currentUser.email}.`, "success");
        registerForm.reset();
      } else {
        showMessage(authMessage, result.detail || "Registration failed", "error");
      }
    } catch (error) {
      showMessage(authMessage, "Registration failed. Please try again.", "error");
      console.error("Error registering:", error);
    }
  });

  logoutButton.addEventListener("click", () => {
    logout();
  });

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!authToken || !currentUser || currentUser.role !== "admin") {
      showMessage(createMessage, "Only admin users can create activities.", "error");
      return;
    }

    const name = document.getElementById("new-name").value;
    const description = document.getElementById("new-description").value;
    const schedule = document.getElementById("new-schedule").value;
    const maxParticipants = parseInt(document.getElementById("new-max").value, 10);

    try {
      const response = await fetch("/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name, description, schedule, max_participants: maxParticipants }),
      });
      const result = await response.json();
      if (response.ok) {
        showMessage(createMessage, result.message, "success");
        createForm.reset();
        fetchActivities();
      } else {
        showMessage(createMessage, result.detail || "Failed to create activity", "error");
      }
    } catch (error) {
      showMessage(createMessage, "Activity creation failed. Please try again.", "error");
      console.error("Error creating activity:", error);
    }
  });

  updateAuthUI();
  fetchActivities();
});
