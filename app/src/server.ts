import express from "express";
import jiraRoutes from "./routes/jira.routes";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Add debug logging for env variables
console.log("Environment variables loaded:");
console.log("JIRA_WEBHOOK_SECRET:", process.env.JIRA_WEBHOOK_SECRET);
console.log("JIRA_BASE_URL:", process.env.JIRA_BASE_URL);
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Set" : "Not set");

const app = express();

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log("--------------------");
  console.log("Request received:");
  console.log("URL:", req.url);
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("--------------------");
  next();
});

app.use(express.json());
app.use((req, res, next) => {
  console.log("Request Body:", req.body);
  next();
});
app.use(jiraRoutes);
// app.use('/ai-test', aiTestRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running in DEBUG mode on port ${PORT}`);
});
