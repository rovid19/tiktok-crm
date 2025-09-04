import express from "express";
import accountRoutes from "./routes/AccountRoutes";
import cors from "cors";

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/accounts", accountRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
