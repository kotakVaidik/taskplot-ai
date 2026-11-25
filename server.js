
import express from "express";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const MODEL_NAME = "openai/gpt-oss-120b";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.error("Groq API key not found. Check your .env file.");
    process.exit(1);
}

const groq = new Groq({ apiKey });

const app = express();

app.use(express.json());
app.use(express.static("public"));

const systemPrompt = `
You are TaskPilot AI, an intelligent project planning assistant.

Analyze the user's project description and generate a realistic project plan.

Return a valid JSON object using exactly this structure:

{
  "projectName": "Project name",
  "summary": "Short project summary",
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "priority": "High",
      "estimatedDays": 2,
      "status": "Pending"
    }
  ],
  "milestones": [
    {
      "title": "Milestone title",
      "description": "Milestone description",
      "targetDays": 7
    }
  ],
  "risks": [
    {
      "title": "Risk title",
      "severity": "High",
      "description": "Risk description",
      "solution": "Suggested solution"
    }
  ]
}

Rules:
- Analyze the actual project description.
- Generate relevant and realistic tasks.
- Do not use predefined task lists.
- Avoid unnecessary tasks.
- Priority and severity must be High, Medium, or Low.
- Task status must initially be Pending.
- Estimated days and target days must be positive numbers.
- Generate meaningful milestones and project risks.
- Do not invent deadlines or requirements.
- Return JSON only.
- Do not include Markdown code blocks.
`;

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

// Retry temporary Groq API errors
async function generateWithRetry(description, retries = 3) {
    let delay = 2000;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await groq.chat.completions.create({
                model: MODEL_NAME,

                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `Create a project plan for this project:\n\n${description}`
                    }
                ],

                response_format: {
                    type: "json_object"
                },

                max_completion_tokens: 4000
            });

        } catch (error) {
            const status = error.status;

            const temporary =
                status === 429 ||
                status === 500 ||
                status === 502 ||
                status === 503 ||
                status === 504;

            if (temporary && attempt < retries - 1) {
                console.log(`Groq API busy. Retrying in ${delay / 1000}s...`);

                await sleep(delay);
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
}

// Generate project plan API
app.post("/api/generate-plan", async (req, res) => {

    const description =
        typeof req.body?.description === "string"
            ? req.body.description.trim()
            : "";

    if (!description) {
        return res.status(400).json({
            success: false,
            error: "Please enter a project description."
        });
    }

    if (description.length < 15) {
        return res.status(400).json({
            success: false,
            error: "Project description must contain at least 15 characters."
        });
    }

    try {
        const response = await generateWithRetry(description);

        const rawText = response.choices[0]?.message?.content;

        if (!rawText) {
            throw new Error("Empty response received from Groq.");
        }

        const projectPlan = JSON.parse(rawText);

        if (
            !projectPlan.projectName ||
            !Array.isArray(projectPlan.tasks) ||
            !Array.isArray(projectPlan.milestones) ||
            !Array.isArray(projectPlan.risks)
        ) {
            throw new Error("Invalid project plan structure received from AI.");
        }

        res.json({
            success: true,
            project: projectPlan
        });

    } catch (error) {

        console.error("Project generation failed:", error.message);
        console.error("Groq API status:", error.status || "Unknown");

        res.status(500).json({
            success: false,
            error: "Unable to generate project plan. Please try again."
        });
    }
});

app.listen(PORT, () => {
    console.log(`TaskPilot AI server running at http://localhost:${PORT}`);
});
