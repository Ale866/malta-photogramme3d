import { createApp } from "./app";

const app = createApp();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello from Express + TypeScript + ES Modules!");
});

app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}`);
});
