import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();
app.listen(config.port, "0.0.0.0", () => {
  console.log(`whatsapp-ai-receptionist-demo listening on port ${config.port}`);
});
