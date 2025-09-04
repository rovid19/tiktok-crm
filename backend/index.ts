import express from "express";
import accountRoutes from "./routes/AccountRoutes";
import cors from "cors";
import { initAccountsDb } from "./db/db_crm";
import SchedulerWorker from "./utils/schedulerWorker";

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/accounts", accountRoutes);

// Initialize database before starting server
async function startServer() {
  try {
    await initAccountsDb();
    console.log("✅ Database initialized successfully");

    new SchedulerWorker();

    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    process.exit(1);
  }
}

startServer();
