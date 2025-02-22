import express from "express";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const port = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Proxy middleware
app.use("/proxy", async (req, res) => {
  try {
    const url = req.query.url;
    const response = await fetch(url);
    const content = await response.text();
    res.set("Content-Type", response.headers.get("Content-Type"));
    res.send(content);
  } catch (error) {
    res.status(500).send("Error fetching URL");
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
