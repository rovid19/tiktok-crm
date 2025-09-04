import { Router, RequestHandler } from "express";
import {
  fetchAccounts,
  addAccount,
  deleteAccount,
  launchProfile,
  generateTodaySessions,
} from "../controllers/accountController";

const router = Router();

router.get("/", fetchAccounts as unknown as RequestHandler);
router.post("/add", addAccount as unknown as RequestHandler);
router.delete(
  "/delete/:account_id",
  deleteAccount as unknown as RequestHandler
);
router.post(
  "/:account_id/launch_profile",
  launchProfile as unknown as RequestHandler
);
router.post(
  "/generate-today-sessions",
  generateTodaySessions as unknown as RequestHandler
);

export default router;
