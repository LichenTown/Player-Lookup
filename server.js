import express from "express";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;

// CORS handling
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Get UUID from username
app.get("/api/users/profiles/minecraft/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const response = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${username}`
    );
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: "Username not found" });
      }
      throw new Error(`Mojang API Error: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Get username from UUID
app.get("/api/users/by-uuid/:uuid", async (req, res) => {
  const uuid = req.params.uuid;
  try {
    const response = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return res
          .status(404)
          .json({ error: "Username not found for this UUID." });
      }
      throw new Error(`Mojang API Error: ${response.status}`);
    }
    const data = await response.json();
    res.json({ username: data.name });
  } catch (error) {
    console.error("Error fetching username from UUID", error);
    res.status(500).json({ error: "Error fetching username by UUID." });
  }
});

// Get stats from file
app.get("/api/stats/:uuid", async (req, res) => {
  const uuid = req.params.uuid;
  const statsFilePath = path.join(process.cwd(), "stats", `${uuid}.json`);
  try {
    const data = await fs.readFile(statsFilePath, "utf8");
    const statsData = JSON.parse(data);
    res.json(statsData);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`Stats file not found for UUID: ${uuid}`);
      return res.status(404).json({ error: "Stats not found for this player" });
    } else {
      console.error(`Error reading stats file for UUID ${uuid}:`, error);
      return res.status(500).json({ error: "Error fetching stats" });
    }
  }
});

// Function to check whether or not player is on the server
app.get("/api/server-status/:uuid", async (req, res) => {
  const serverAddress = "lichen.town";
  const playerUUID = req.params.uuid;
  try {
    const response = await fetch(
      `https://api.mcstatus.io/v2/status/java/${serverAddress}`
    );

    if (!response.ok) {
      throw new Error(`mcstatus.io API Error: ${response.status}`);
    }
    const data = await response.json();

    if (data.players && data.players.list) {
      const playerOnline = data.players.list.some(
        (player) =>
          player.uuid.replace(/-/g, "") === playerUUID.replace(/-/g, "")
      );
      res.json({ online: playerOnline });
    } else {
      res.json({ online: false });
    }
  } catch (error) {
    console.error("Error fetching server status from mcstatus.io:", error);
    res
      .status(500)
      .json({ error: "Error fetching server status", online: false });
  }
});

app.use(express.static("."));
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
