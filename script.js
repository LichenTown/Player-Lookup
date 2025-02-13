async function getProfile() {
  const username = document.getElementById("username").value;
  if (!username) {
    alert("Please enter a username.");
    return;
  }

  try {
    // Fetch UUID
    const uuidResponse = await fetch(
      `/api/users/profiles/minecraft/${username}`
    );
    if (!uuidResponse.ok) {
      if (uuidResponse.status === 404) {
        alert("Username not found.");
      } else if (uuidResponse.status === 500) {
        alert("Too many requests. Please try again later.");
      } else {
        throw new Error(`Error: ${uuidResponse.status}`);
      }
      return;
    }
    const uuidData = await uuidResponse.json();
    const uuid = uuidData.id.replace(
      /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/,
      "$1-$2-$3-$4-$5"
    );

    // Fetch username from UUID (for case)
    const usernameData = await getUsernameFromUUID(uuid);
    const correctUsername = usernameData.username;

    // Get stat data
    const statsResponse = await fetch(`/api/stats/${uuid}`);
    if (!statsResponse.ok) {
      alert("Invalid player. Please try again.");
      return;
    }
    const statsData = await statsResponse.json();

    // Check if the player is currently online or not
    const serverStatus = await getServerStatus(uuid);

    // Update profile info and display statistics
    updateProfileInfo(correctUsername, serverStatus, uuid);

    const sortedStats = sortStats(statsData.stats); // Call sortStats
    displayStats(sortedStats); // Pass the SORTED stats to displayStats

    displaySelectedStats(statsData.stats);
  } catch (error) {
    alert("An error occurred. See console for details.");
    console.error(error);
  }
}

async function getUsernameFromUUID(uuid) {
  const response = await fetch(`/api/users/by-uuid/${uuid}`);
  if (!response.ok) {
    throw new Error(`Error fetching username: ${response.status}`);
  }
  return await response.json();
}

async function getServerStatus(uuid) {
  try {
    const response = await fetch(`/api/server-status/${uuid}`);
    if (!response.ok) {
      throw new Error(`Server status error: ${response.status}`);
    }
    const data = await response.json();
    return data.online;
  } catch (error) {
    console.error("Error fetching server status:", error);
    return { online: false };
  }
}

function updateProfileInfo(username, isOnline, uuid) {
  const avatarImg = document.getElementById("player-avatar");
  const usernameEl = document.getElementById("player-username");
  const onlineStatusEl = document.getElementById("online-status");
  const statusTextEl = onlineStatusEl.querySelector("span:last-child");
  const avatarContainer = document.querySelector(".avatar-container");
  avatarImg.src = `https://mc-heads.net/avatar/${uuid}/512`;
  usernameEl.textContent = username;
  const existingBadges = document.querySelectorAll(".role-badge");
  existingBadges.forEach((badge) => badge.remove());

  const roleBadge = document.createElement("span");
  roleBadge.classList.add("role-badge");
  const helpers = [
    "PalmMC",
    "iits_kai",
    "tarpmt_",
    "Robux_Generator",
    "Raf_af",
    "Chewbonga_",
  ];
  if (helpers.includes(username)) {
    roleBadge.classList.add("role-badge-helper");
    roleBadge.textContent = "Helper";
  } else {
    roleBadge.classList.add("role-badge-member");
    roleBadge.textContent = "Member";
  }
  avatarContainer.appendChild(roleBadge);

  if (isOnline) {
    statusTextEl.textContent = "Online";
    onlineStatusEl.querySelector(".status-indicator").classList.add("online");
    onlineStatusEl
      .querySelector(".status-indicator")
      .classList.remove("offline");
  } else {
    statusTextEl.textContent = "Offline";
    onlineStatusEl.querySelector(".status-indicator").classList.add("offline");
    onlineStatusEl
      .querySelector(".status-indicator")
      .classList.remove("online");
  }
}

function displaySelectedStats(stats) {
  const timePlayedEl = document.getElementById("time-played");
  const deathsEl = document.getElementById("deaths");
  const timeSinceLastDeathEl = document.getElementById("time-since-last-death");

  function findStat(statsObj, keyToFind) {
    for (const key in statsObj) {
      if (statsObj.hasOwnProperty(key)) {
        if (key === keyToFind) {
          return statsObj[key];
        } else if (typeof statsObj[key] === "object") {
          const result = findStat(statsObj[key], keyToFind);
          if (result) return result;
        }
      }
    }
    return null;
  }

  const timePlayed =
    findStat(stats, "minecraft:play_time") ||
    findStat(stats, "minecraft:play_one_minute") ||
    0;
  const deaths = findStat(stats, "minecraft:deaths") || 0;
  const timeSinceLastDeath = findStat(stats, "minecraft:time_since_death") || 0;
  timePlayedEl.textContent = formatTime(timePlayed / 20);
  deathsEl.textContent = formatNumber(deaths);
  timeSinceLastDeathEl.textContent = formatTime(timeSinceLastDeath / 20);
}

function formatTime(seconds) {
  const days = Math.floor(seconds / (60 * 60 * 24));
  seconds -= days * (60 * 60 * 24);
  const hours = Math.floor(seconds / (60 * 60));
  seconds -= hours * (60 * 60);
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  seconds = Math.floor(seconds);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function formatNumber(number) {
  return number.toLocaleString();
}

function displayStats(stats) {
  const statsDiv = document.getElementById("stats");
  statsDiv.innerHTML = "";

  const mainDetails = document.createElement("details");
  mainDetails.open = true;
  const mainSummary = document.createElement("summary");
  mainSummary.textContent = "Statistics";
  mainSummary.classList.add("main-summary");
  mainDetails.appendChild(mainSummary);
  buildStatTree(mainDetails, stats, 0);

  statsDiv.appendChild(mainDetails);
  document.getElementById("search").addEventListener("input", (event) => {
    searchStats(event.target.value);
  });
}

function buildStatTree(parentElement, data, level) {
  const container = document.createElement("div");
  container.classList.add("stat-container");
  if (level > 0) {
    container.classList.add("nested");
  }

  const formattedData = {};
  const minecraftData = {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      const [prefix, cleanKey] = key.includes(":") ? key.split(":") : ["", key];
      const formattedKey = cleanKey
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

      if (prefix === "minecraft") {
        minecraftData[formattedKey] = value;
      } else if (prefix) {
        if (!formattedData[prefix]) {
          formattedData[prefix] = {};
        }
        formattedData[prefix][formattedKey] = value;
      } else {
        formattedData[formattedKey] = value;
      }
    }
  }

  if (Object.keys(minecraftData).length > 0) {
    const details = document.createElement("details");
    details.classList.add("stat-group");
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Minecraft";
    summary.classList.add("stat-name");

    details.appendChild(summary);
    buildStatTree(details, minecraftData, level + 1);
    container.appendChild(details);
  }
  for (const key in formattedData) {
    if (formattedData.hasOwnProperty(key)) {
      const value = formattedData[key];

      if (typeof value === "object" && value !== null) {
        const details = document.createElement("details");
        details.classList.add("stat-group");
        const summary = document.createElement("summary");
        summary.textContent = key;
        summary.classList.add("stat-name");

        details.appendChild(summary);
        buildStatTree(details, value, level + 1);
        container.appendChild(details);
      } else {
        const item = document.createElement("div");
        item.classList.add("stat-item");

        const nameSpan = document.createElement("span");
        nameSpan.classList.add("stat-name");
        nameSpan.textContent = key;

        const valueSpan = document.createElement("span");
        valueSpan.classList.add("stat-value");
        valueSpan.textContent = formatNumber(value);

        item.appendChild(nameSpan);
        item.appendChild(valueSpan);
        container.appendChild(item);
      }
    }
  }

  parentElement.appendChild(container);
}

function sortStats(data, sortByValue = true, descending = true) {
  if (typeof data !== "object" || data === null) {
    return data; // Nothing to sort
  }

  const sortable = [];
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      sortable.push([key, data[key]]);
    }
  }

  sortable.sort((a, b) => {
    const keyA = a[0];
    const keyB = b[0];
    const valA = a[1];
    const valB = b[1];

    if (sortByValue) {
      if (typeof valA === "number" && typeof valB === "number") {
        return descending ? valB - valA : valA - valB;
      } else if (typeof valA === "object" && typeof valB === "object") {
        return 0;
      } else if (typeof valA === "number") {
        return descending ? -1 : 1;
      } else if (typeof valB === "number") {
        return descending ? 1 : -1;
      } else {
        return 0;
      }
    } else {
      return descending ? keyB.localeCompare(keyA) : keyA.localeCompare(keyB);
    }
  });

  const sortedData = {};
  for (let item of sortable) {
    const [key, value] = item;
    sortedData[key] =
      typeof value === "object" && value !== null
        ? sortStats(value, sortByValue, descending)
        : value;
  }
  return sortedData;
}

function searchStats(searchTerm) {
  const term = searchTerm.toLowerCase();
  const statGroups = document.querySelectorAll(".stat-group");
  statGroups.forEach((group) => {
    const summary = group.querySelector(".stat-name");
    if (!summary) return;
    let groupVisible = false;
    const summaryText = summary.textContent.toLowerCase();
    if (summaryText.includes(term)) {
      groupVisible = true;
    }
    const statItems = group.querySelectorAll(".stat-item");
    statItems.forEach((item) => {
      const statName = item.querySelector(".stat-name");
      const statValue = item.querySelector(".stat-value");
      if (!statName) return;
      let itemText = statName.textContent.toLowerCase();
      if (statValue) itemText += " " + statValue.textContent.toLowerCase();
      if (itemText.includes(term)) {
        item.classList.remove("hidden");
        groupVisible = true;
      } else {
        item.classList.add("hidden");
      }
    });
    if (groupVisible) {
      group.classList.remove("hidden");
    } else {
      group.classList.add("hidden");
    }
  });
}

document.getElementById("username").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    getProfile();
  }
});

async function displayLastCommitDate() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/palmmc/palmmc/commits?per_page=1`
    );
    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }
    const data = await response.json();

    if (data.length > 0) {
      const commitDate = new Date(data[0].commit.committer.date);
      const formattedDate = formatDate(commitDate);
      document.getElementById(
        "last-updated"
      ).textContent = `Last Updated: ${formattedDate}`;
    } else {
      document.getElementById("last-updated").textContent = "Last Updated: N/A";
    }
  } catch (error) {
    console.error("Error fetching commit data:", error);
    document.getElementById("last-updated").textContent = "Last Updated: Error";
  }
}

function formatDate(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString(undefined, options);
}

displayLastCommitDate("your-username", "your-repo-name");
