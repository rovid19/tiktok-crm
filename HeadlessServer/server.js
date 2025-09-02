// server.js
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

app.listen(8080, () => {
  console.log("TikTok signature server running at http://localhost:8080");
});
