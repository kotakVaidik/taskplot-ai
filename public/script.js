
const projectForm = document.getElementById("projectForm");
const projectDescription = document.getElementById("projectDescription");
const charCount = document.getElementById("charCount");
const generateBtn = document.getElementById("generateBtn");

const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const resultsSection = document.getElementById("resultsSection");

const projectName = document.getElementById("projectName");
const projectSummary = document.getElementById("projectSummary");

const totalTasks = document.getElementById("totalTasks");
const totalMilestones = document.getElementById("totalMilestones");
const totalRisks = document.getElementById("totalRisks");

const progressPercentage = document.getElementById("progressPercentage");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");

const tasksContainer = document.getElementById("tasksContainer");
const milestonesContainer = document.getElementById("milestonesContainer");
const risksContainer = document.getElementById("risksContainer");

const newProjectBtn = document.getElementById("newProjectBtn");

let currentTasks = [];


// ==========================================
// ASSISTANT RESPONSE PANEL
// ==========================================

// Create a separate panel for text responses.

const assistantResponse = document.createElement("div");

assistantResponse.className = "assistant-response";
assistantResponse.hidden = true;

assistantResponse.style.padding = "24px";
assistantResponse.style.marginTop = "20px";
assistantResponse.style.borderRadius = "12px";
assistantResponse.style.background = "#f4f6f9";
assistantResponse.style.color = "#222";
assistantResponse.style.lineHeight = "1.7";
assistantResponse.style.whiteSpace = "pre-wrap";

const assistantTitle = document.createElement("h3");
assistantTitle.textContent = "TaskPilot AI";
assistantTitle.style.marginBottom = "12px";

const assistantMessage = document.createElement("p");
assistantMessage.className = "assistant-response-message";

assistantResponse.append(assistantTitle, assistantMessage);

// Insert the response panel before project results.
resultsSection.parentNode.insertBefore(
    assistantResponse,
    resultsSection
);


// ==========================================
// CHARACTER COUNTER
// ==========================================

projectDescription.addEventListener("input", () => {
    charCount.textContent =
        `${projectDescription.value.length} / 5000`;
});


// ==========================================
// SUBMIT USER MESSAGE
// ==========================================

projectForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const description = projectDescription.value.trim();

    if (!description) {
        showError("Please enter a message.");
        return;
    }

    if (description.length > 5000) {
        showError("Maximum 5000 characters allowed.");
        return;
    }

    hideError();

    setLoading(true);

    // Hide previous responses.
    resultsSection.hidden = true;
    assistantResponse.hidden = true;

    try {

        const response = await fetch("/api/generate-plan", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                description
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "Unable to process your request."
            );
        }


        // ==================================
        // PROJECT PLAN RESPONSE
        // ==================================

        if (
            data.type === "project" &&
            data.intent === "PROJECT_PLAN" &&
            data.project
        ) {

            assistantResponse.hidden = true;

            renderProject(data.project);

            resultsSection.hidden = false;

            resultsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }


        // ==================================
        // TEXT RESPONSE
        // ==================================

        else if (
            data.type === "text" &&
            typeof data.message === "string"
        ) {

            showAssistantResponse(data.message);

        }


        // ==================================
        // INVALID RESPONSE
        // ==================================

        else {

            throw new Error(
                "Unexpected response received from TaskPilot AI."
            );

        }

    } catch (error) {

        console.error("TaskPilot AI error:", error);

        showError(
            error.message || "Something went wrong. Please try again."
        );

    } finally {

        setLoading(false);

    }

});


// ==========================================
// DISPLAY TEXT RESPONSE
// ==========================================

function showAssistantResponse(message) {

    assistantMessage.textContent = message;

    assistantResponse.hidden = false;

    resultsSection.hidden = true;

    assistantResponse.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


// ==========================================
// RENDER COMPLETE PROJECT
// ==========================================

function renderProject(project) {

    const tasks = Array.isArray(project.tasks)
        ? project.tasks
        : [];

    const milestones = Array.isArray(project.milestones)
        ? project.milestones
        : [];

    const risks = Array.isArray(project.risks)
        ? project.risks
        : [];

    projectName.textContent =
        project.projectName || "Untitled Project";

    projectSummary.textContent =
        project.summary || "No summary available.";

    currentTasks = tasks.map(task => ({
        ...task,

        status:
            task.status === "Completed"
                ? "Completed"
                : "Pending"
    }));

    totalTasks.textContent = currentTasks.length;
    totalMilestones.textContent = milestones.length;
    totalRisks.textContent = risks.length;

    renderTasks();

    renderMilestones(milestones);

    renderRisks(risks);

    updateProgress();

}


// ==========================================
// RENDER TASKS
// ==========================================

function renderTasks() {

    tasksContainer.replaceChildren();

    if (currentTasks.length === 0) {

        tasksContainer.textContent = "No tasks generated.";

        return;

    }

    currentTasks.forEach((task, index) => {

        const taskCard = document.createElement("div");
        taskCard.className = "task-card";

        const taskInfo = document.createElement("div");
        taskInfo.className = "task-info";

        const title = document.createElement("h4");

        title.textContent =
            task.title || "Untitled Task";

        const description = document.createElement("p");

        description.textContent =
            task.description || "No description available.";

        const details = document.createElement("div");
        details.className = "task-details";

        const priority = document.createElement("span");

        const taskPriority = task.priority || "Medium";

        priority.className =
            `priority-badge ${taskPriority.toLowerCase()}`;

        priority.textContent =
            `${taskPriority} Priority`;

        const duration = document.createElement("span");

        duration.textContent =
            `${task.estimatedDays || 1} day(s)`;

        details.append(priority, duration);

        taskInfo.append(title, description, details);

        const checkboxLabel = document.createElement("label");
        checkboxLabel.className = "task-checkbox";

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";

        checkbox.checked =
            task.status === "Completed";

        checkbox.dataset.index = index;

        const statusText = document.createElement("span");

        statusText.textContent = task.status;

        checkbox.addEventListener("change", () => {

            currentTasks[index].status =
                checkbox.checked
                    ? "Completed"
                    : "Pending";

            statusText.textContent =
                currentTasks[index].status;

            updateProgress();

        });

        checkboxLabel.append(checkbox, statusText);

        taskCard.append(taskInfo, checkboxLabel);

        tasksContainer.appendChild(taskCard);

    });

}

function renderMilestones(milestones) {

    milestonesContainer.replaceChildren();

    if (milestones.length === 0) {

        milestonesContainer.textContent =
            "No milestones generated.";

        return;

    }

    milestones.forEach((milestone, index) => {

        const card = document.createElement("div");
        card.className = "milestone-card";

        const number = document.createElement("span");

        number.className = "milestone-number";

        number.textContent =
            String(index + 1).padStart(2, "0");

        const content = document.createElement("div");

        const title = document.createElement("h4");

        title.textContent =
            milestone.title || "Untitled Milestone";

        const description = document.createElement("p");

        description.textContent =
            milestone.description || "No description available.";

        const target = document.createElement("span");

        target.textContent =
            `Target: Day ${milestone.targetDays || "N/A"}`;

        content.append(title, description, target);

        card.append(number, content);

        milestonesContainer.appendChild(card);

    });

}


function renderRisks(risks) {

    risksContainer.replaceChildren();

    if (risks.length === 0) {

        risksContainer.textContent =
            "No risks identified.";

        return;

    }

    risks.forEach(risk => {

        const card = document.createElement("div");
        card.className = "risk-card";

        const title = document.createElement("h4");

        title.textContent =
            risk.title || "Untitled Risk";

        const severity = document.createElement("span");

        const riskSeverity = risk.severity || "Low";

        severity.className =
            `severity-badge ${riskSeverity.toLowerCase()}`;

        severity.textContent =
            `${riskSeverity} Severity`;

        const description = document.createElement("p");

        description.textContent =
            risk.description || "No description available.";

        const solution = document.createElement("p");

        solution.textContent =
            `Suggested Solution: ${
                risk.solution || "No solution provided."
            }`;

        card.append(
            title,
            severity,
            description,
            solution
        );

        risksContainer.appendChild(card);

    });

}

// UPDATE PROJECT PROGRESS

function updateProgress() {

    const total = currentTasks.length;

    const completed = currentTasks.filter(
        task => task.status === "Completed"
    ).length;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    progressPercentage.textContent =
        `${percentage}%`;

    progressText.textContent =
        `${completed} of ${total} tasks completed`;

    progressBar.style.width =
        `${percentage}%`;

}


function setLoading(isLoading) {

    generateBtn.disabled = isLoading;

    generateBtn.textContent = isLoading
        ? "Processing..."
        : "✦ Generate Project Plan";

    loadingMessage.hidden = !isLoading;

}


// ERROR HANDLING
function showError(message) {

    errorMessage.textContent = message;

    errorMessage.hidden = false;

}


function hideError() {

    errorMessage.textContent = "";

    errorMessage.hidden = true;

}



newProjectBtn.addEventListener("click", () => {

    projectForm.reset();

    charCount.textContent = "0 / 5000";

    resultsSection.hidden = true;

    assistantResponse.hidden = true;

    currentTasks = [];

    hideError();

    projectDescription.focus();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

});
