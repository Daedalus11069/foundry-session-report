import { VueDialog } from "./VueDialog";
import SessionReportModal from "./SessionReportModal.vue";
import SessionControlModal from "./SessionControlModal.vue";
import SettingsConfig from "./SettingsConfig.vue";
import SurveyUrlDialog from "./SurveyUrlDialog.vue";
import SurveyResultsModal from "./SurveyResultsModal.vue";
import { pusherManager } from "./PusherManager";

import "./session-report.css";

/**
 * Session Report Module
 * Sends character and session data to an external endpoint
 *
 * HOOKS:
 *
 * - sessionReportResults: Called when GM broadcasts survey results from the results modal
 *   Parameters: Array of character results
 *   Example:
 *   Hooks.on("sessionReportResults", (results) => {
 *     // results is an array of objects with:
 *     // - player_id: string (Foundry user ID)
 *     // - character_id: number (database character ID)
 *     // - character_name: string
 *     // - total: number (final point total including GM bonuses)
 *     // - reasons: string[] (array of reward titles that were selected)
 *
 *     results.forEach(result => {
 *       console.log(`${result.character_name} earned ${result.total} points for: ${result.reasons.join(", ")}`);
 *     });
 *   });
 */

const MODULE_ID = "session-report";

// Register module settings
Hooks.once("init", () => {
  console.log("Session Report | Initializing module");

  // Register endpoint URL setting
  game.settings.register(MODULE_ID, "endpointURL", {
    name: "SESSION_REPORT.Settings.EndpointURL.Name",
    hint: "SESSION_REPORT.Settings.EndpointURL.Hint",
    scope: "world",
    config: false, // We'll use a custom UI
    type: String,
    default: ""
  });

  // Register API key setting
  game.settings.register(MODULE_ID, "apiKey", {
    name: "SESSION_REPORT.Settings.ApiKey.Name",
    hint: "SESSION_REPORT.Settings.ApiKey.Hint",
    scope: "world",
    config: false, // We'll use a custom UI
    type: String,
    default: ""
  });

  // Register a menu button to open settings
  game.settings.registerMenu(MODULE_ID, "settingsMenu", {
    name: "Configure Session Report",
    label: "Settings",
    hint: "Configure the API endpoint and other settings",
    icon: "fas fa-cog",
    type: SettingsConfigApp,
    restricted: true // GM only
  });

  // Register Game ID setting
  game.settings.register(MODULE_ID, "gameId", {
    name: "SESSION_REPORT.Settings.GameId.Name",
    hint: "SESSION_REPORT.Settings.GameId.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  // Register Session ID setting
  game.settings.register(MODULE_ID, "sessionId", {
    name: "SESSION_REPORT.Settings.SessionId.Name",
    hint: "SESSION_REPORT.Settings.SessionId.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  // Register button visibility setting (GM only)
  game.settings.register(MODULE_ID, "showButtonsToPlayers", {
    name: "SESSION_REPORT.Settings.ShowButtonsToPlayers.Name",
    hint: "SESSION_REPORT.Settings.ShowButtonsToPlayers.Hint",
    scope: "world",
    config: false, // Controlled via scene control toggle
    type: Boolean,
    default: false
  });

  // Register actor type filter setting
  game.settings.register(MODULE_ID, "actorTypeFilter", {
    name: "SESSION_REPORT.Settings.ActorTypeFilter.Name",
    hint: "SESSION_REPORT.Settings.ActorTypeFilter.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "pc"
  });

  // Register survey results storage
  game.settings.register(MODULE_ID, "surveyResults", {
    name: "Survey Results Storage",
    hint: "Stores completed survey results from players",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  // Register survey progress tracking
  game.settings.register(MODULE_ID, "surveyProgress", {
    name: "Survey Progress Tracking",
    hint: "Tracks expected vs received survey submissions",
    scope: "world",
    config: false,
    type: Object,
    default: { sessionId: null, expected: 0, received: 0 }
  });

  // Register Pusher App Key
  game.settings.register(MODULE_ID, "pusherAppKey", {
    name: "SESSION_REPORT.Settings.PusherAppKey.Name",
    hint: "SESSION_REPORT.Settings.PusherAppKey.Hint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  // Register Pusher Cluster
  game.settings.register(MODULE_ID, "pusherCluster", {
    name: "SESSION_REPORT.Settings.PusherCluster.Name",
    hint: "SESSION_REPORT.Settings.PusherCluster.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "us2"
  });

  // Register selected characters storage
  game.settings.register(MODULE_ID, "selectedCharacters", {
    name: "Selected Characters Storage",
    hint: "Stores the last selected character IDs for session report",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
});

/**
 * Filter actors based on the configured actor type
 */
function getPlayerCharacters(): any[] {
  const actorTypeFilter = game.settings.get(
    MODULE_ID,
    "actorTypeFilter"
  ) as string;
  const actors = game.actors || [];

  console.log(`Session Report | Actor type filter: "${actorTypeFilter}"`);
  console.log(`Session Report | Total actors in world: ${actors.length}`);

  // Get unique actor types
  const actorTypes = new Set(actors.map((a: any) => a.type));
  console.log(
    `Session Report | Available actor types: ${Array.from(actorTypes).join(", ")}`
  );

  // Filter by the specified actor type (default: "pc")
  const filtered = actors.filter(
    (actor: any) => actor.type === actorTypeFilter
  );

  console.log(
    `Session Report | Filtered characters (type="${actorTypeFilter}"): ${filtered.length}`
  );

  if (filtered.length === 0 && actors.length > 0) {
    console.warn(
      `Session Report | No actors found with type "${actorTypeFilter}". Available types: ${Array.from(actorTypes).join(", ")}`
    );
    ui.notifications?.warn(
      `No characters found with type "${actorTypeFilter}". Check module settings and update "Actor Type Filter" to match your system's character type.`
    );
  }

  return filtered;
}

/**
 * Send survey URLs to all players (excluding main GM)
 */
async function sendPlayerSurveys() {
  // Check if endpoint is configured
  const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;

  if (!endpointURL || endpointURL.trim() === "") {
    ui.notifications?.warn(
      game.i18n.localize("SESSION_REPORT.Survey.NoEndpoint")
    );
    return;
  }

  // Connect to Pusher for real-time survey results
  console.log("Session Report | Connecting to Pusher for survey results");
  pusherManager.connect();

  // Get session ID
  const sessionId = game.settings.get(MODULE_ID, "sessionId") as number;
  if (!sessionId) {
    ui.notifications?.warn(
      "No session ID configured. Please send a session report first."
    );
    return;
  }

  // Get all characters and their owners
  const characters = getPlayerCharacters();

  // Build player list with character mappings
  const players: Array<{ owner_id: string; character_id: string }> = [];

  for (const char of characters) {
    const ownerId = char.ownership
      ? (() => {
          const ownerIds = Object.keys(char.ownership).filter(
            userId => char.ownership[userId] === 3 && userId !== "default"
          );
          const nonGmOwners = ownerIds.filter(userId => {
            const user = game.users?.get(userId);
            return user && !user.isGM;
          });
          return nonGmOwners.length > 0
            ? nonGmOwners[0]
            : ownerIds.length > 0
              ? ownerIds[0]
              : null;
        })()
      : null;

    if (ownerId) {
      players.push({
        owner_id: ownerId,
        character_id: char.id
      });
    }
  }

  if (players.length === 0) {
    ui.notifications?.warn("No player characters found with owners.");
    return;
  }

  ui.notifications?.info(game.i18n.localize("SESSION_REPORT.Survey.Sending"));

  try {
    const apiKey = game.settings.get(MODULE_ID, "apiKey") as string;

    const response = await fetch(`${endpointURL}/get-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        session_id: sessionId,
        players: players
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Session Report | Survey API error:", errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const urls = data.urls || [];

    // Send URLs to each player via socket
    let sentCount = 0;
    for (const urlData of urls) {
      const user = game.users?.find((u: any) => u.id === urlData.owner_id);
      if (user) {
        game.socket?.emit("module.session-report", {
          action: "showSurveyUrl",
          userId: urlData.owner_id,
          url: urlData.url,
          characterName: urlData.character_name
        });
        sentCount++;
      }
    }

    if (sentCount > 0) {
      // Initialize survey progress tracking
      await game.settings.set(MODULE_ID, "surveyProgress", {
        sessionId: sessionId,
        expected: players.length,
        received: 0
      });

      ui.notifications?.info(
        game.i18n
          .localize("SESSION_REPORT.Survey.Success")
          .replace("{count}", String(sentCount))
      );
    } else {
      ui.notifications?.warn(
        game.i18n.localize("SESSION_REPORT.Survey.NoPlayers")
      );
    }
  } catch (error) {
    console.error("Session Report | Failed to send surveys:", error);
    ui.notifications?.error(
      game.i18n
        .localize("SESSION_REPORT.Survey.Error")
        .replace(
          "{error}",
          error instanceof Error ? error.message : String(error)
        )
    );
  }
}

/**
 * Open survey results viewer
 */
async function openSurveyResults() {
  const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;
  const apiKey = game.settings.get(MODULE_ID, "apiKey") as string;
  const gameId = game.settings.get(MODULE_ID, "gameId") as number;
  const sessionId = game.settings.get(MODULE_ID, "sessionId") as number;

  if (!endpointURL || !gameId || !sessionId) {
    ui.notifications?.warn(
      "Missing configuration. Please configure endpoint, game ID, and session ID."
    );
    return;
  }

  try {
    // Fetch results from API
    const response = await fetch(
      `${endpointURL}/get-results?game_id=${gameId}&session_id=${sessionId}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const apiResults = await response.json();

    // Open dialog with API results
    const dialog = new SurveyResultsModalApp(apiResults);
    dialog.render(true);
  } catch (error) {
    console.error("Session Report | Failed to fetch survey results:", error);
    ui.notifications?.error(
      `Failed to fetch survey results: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Survey URL Dialog wrapper
 */
class SurveyUrlDialogApp extends VueDialog {
  constructor(surveyUrl: string) {
    super(
      SurveyUrlDialog,
      { surveyUrl },
      {
        window: {
          title: game.i18n.localize("SESSION_REPORT.Survey.Title"),
          icon: "fas fa-poll-h"
        },
        position: {
          width: 600
        }
      }
    );
  }
}

/**
 * Survey Results Modal wrapper
 */
class SurveyResultsModalApp extends VueDialog {
  constructor(apiResults: any) {
    super(
      SurveyResultsModal,
      { apiResults },
      {
        window: {
          title: game.i18n.localize("SESSION_REPORT.SurveyResults.Title"),
          icon: "fas fa-chart-bar"
        },
        position: {
          width: 800,
          height: 700
        }
      }
    );
  }
}

/**
 * Settings configuration application wrapper
 */
class SettingsConfigApp extends VueDialog {
  constructor() {
    super(
      SettingsConfig,
      {},
      {
        window: {
          title: "Session Report Settings",
          icon: "fas fa-cog"
        },
        position: {
          width: 600
        }
      }
    );
  }
}

// Add button to UI when ready
Hooks.on("getSceneControlButtons", (controls: any) => {
  // Only show to GMs
  if (!game.user?.isGM) return;

  // Check if token controls exist
  if (!controls.tokens) return;

  // Add tools to the token control group
  controls.tokens.tools.sendReport = {
    name: "sendReport",
    title: game.i18n.localize("SESSION_REPORT.Button.SendReport"),
    icon: "fas fa-file-export",
    button: true,
    onChange: () => openSessionReportModal(),
    visible: true
  };

  controls.tokens.tools.sendSurvey = {
    name: "sendSurvey",
    title: game.i18n.localize("SESSION_REPORT.Button.SendSurvey"),
    icon: "fas fa-poll-h",
    button: true,
    onChange: () => sendPlayerSurveys(),
    visible: true
  };

  controls.tokens.tools.viewResults = {
    name: "viewResults",
    title: game.i18n.localize("SESSION_REPORT.SurveyResults.ViewResults"),
    icon: "fas fa-chart-bar",
    button: true,
    onChange: () => openSurveyResults(),
    visible: true
  };

  controls.tokens.tools.closeSurvey = {
    name: "closeSurvey",
    title: game.i18n.localize("SESSION_REPORT.Button.CloseSurvey"),
    icon: "fas fa-stop-circle",
    button: true,
    onChange: () => closeSurvey(),
    visible: true
  };

  controls.tokens.tools.manageSession = {
    name: "manageSession",
    title: "Manage Session Report",
    icon: "fas fa-cog",
    button: true,
    onChange: () => openSessionControlModal(),
    visible: true
  };
});

/**
 * Open the session report modal
 */
async function openSessionReportModal() {
  // Check if endpoint is configured
  const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;

  if (!endpointURL || endpointURL.trim() === "") {
    ui.notifications?.warn(
      game.i18n.localize("SESSION_REPORT.Modal.NoEndpoint")
    );
    return;
  }

  // Gather character data
  const characters = getPlayerCharacters();

  // Get saved character selection
  const savedSelection =
    (game.settings.get(MODULE_ID, "selectedCharacters") as string[]) || [];

  // Open the modal
  const result = await VueDialog.show(
    SessionReportModal,
    {
      characters: characters.map((char: any) => ({
        id: char.id,
        name: char.name,
        img: char.img,
        folderId: char.folder?.id || null,
        folderName: char.folder?.name || "No Folder",
        ownerId: char.ownership
          ? (() => {
              // Get all users with OWNER permission (level 3)
              const ownerIds = Object.keys(char.ownership).filter(
                userId => char.ownership[userId] === 3 && userId !== "default"
              );

              // Filter out GMs
              const nonGmOwners = ownerIds.filter(userId => {
                const user = game.users?.get(userId);
                return user && !user.isGM;
              });

              // Return first non-GM owner, or first GM owner if no non-GMs, or null
              return nonGmOwners.length > 0
                ? nonGmOwners[0]
                : ownerIds.length > 0
                  ? ownerIds[0]
                  : null;
            })()
          : null
      })),
      gmId: game.users?.find((u: any) => u.isGM && u.active)?.id || null,
      initialSelection: savedSelection
    },
    {
      window: {
        title: game.i18n.localize("SESSION_REPORT.Modal.Title"),
        icon: "fas fa-file-export"
      },
      position: {
        width: 700,
        height: 600
      }
    }
  );

  if (result) {
    // Save the selected character IDs for next time
    const selectedIds = result.characters.map((c: any) => c.id);
    await game.settings.set(MODULE_ID, "selectedCharacters", selectedIds);

    const { game_id, session_id } = await sendSessionReport(result);
    await game.settings.set(MODULE_ID, "gameId", game_id);
    await game.settings.set(MODULE_ID, "sessionId", session_id);
  }
}

/**
 * Open the session control modal
 */
async function openSessionControlModal() {
  await VueDialog.show(
    SessionControlModal,
    {},
    {
      window: {
        title: "Session Report Control",
        icon: "fas fa-cog"
      },
      position: {
        width: 600
      }
    }
  );
}

/**
 * Send the session report to the configured endpoint
 */
async function sendSessionReport(data: any) {
  const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;
  const apiKey = game.settings.get(MODULE_ID, "apiKey") as string;
  const savedGameId = game.settings.get(MODULE_ID, "gameId") as number;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Add saved game_id to the payload if it exists
    const payload = {
      ...data,
      ...(savedGameId ? { game_id: savedGameId } : {})
    };

    const response = await fetch(`${endpointURL}/set-characters`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Show success notification with link to view game
    const baseUrl = endpointURL.replace(/\/api$/, "");
    const gameUrl = `${baseUrl}/games/${result.game_id}`;

    ui.notifications?.info(
      `${game.i18n.localize("SESSION_REPORT.Modal.Success")} <a href="${gameUrl}" target="_blank" style="color: #ef4444; text-decoration: underline;">View on Website</a>`,
      { permanent: true }
    );

    return result;
  } catch (error) {
    console.error("Session Report | Failed to send report:", error);
    ui.notifications?.error(
      game.i18n.format("SESSION_REPORT.Modal.Error", {
        error: error instanceof Error ? error.message : String(error)
      })
    );
  }
}

/**
 * Fetch the external URL from the API endpoint
 */
async function fetchExternalUrl(
  ownerId: string,
  characterId: string,
  sessionId: number
): Promise<string | null> {
  const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;
  const apiKey = game.settings.get(MODULE_ID, "apiKey") as string;

  if (!endpointURL || endpointURL.trim() === "") {
    console.warn("Session Report | No endpoint URL configured");
    return null;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${endpointURL}/get-url`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        owner_id: ownerId,
        character_id: characterId,
        session_id: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error("Session Report | Failed to fetch external URL:", error);
    return null;
  }
}

// Register external buttons
Hooks.on("session-report.registerExternalButtons", async (registry: any) => {
  console.log("Session Report | Registering external button");

  // Register the button
  registry.register({
    id: "session-report-link",
    label: "Session Report",
    icon: "fas fa-chart-line",
    tooltip: "Session survey",
    severity: "info",
    moduleId: MODULE_ID,
    url: async (actor: any) => {
      // Get the owner ID (primary owner of the character)
      const ownerId = actor.ownership
        ? Object.keys(actor.ownership).find(
            (userId: string) =>
              actor.ownership[userId] === 3 && userId !== "default"
          )
        : null;

      if (!ownerId) {
        console.warn("Session Report | No owner found for actor:", actor.name);
        return "#";
      }

      // Get session ID from settings
      const sessionId = game.settings.get(MODULE_ID, "sessionId") as number;

      if (!sessionId || sessionId === 0) {
        console.warn("Session Report | No session ID configured");
        ui.notifications?.warn(
          "Please configure a session ID in Session Report settings"
        );
        return "#";
      }

      // Fetch URL with required parameters
      const url = await fetchExternalUrl(ownerId, actor.id, sessionId);
      return url || "#";
    },
    isVisible: (actor: any) => {
      // Only show if endpoint is configured and session ID is set
      const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;
      const sessionId = game.settings.get(MODULE_ID, "sessionId") as number;
      const showToPlayers = game.settings.get(
        MODULE_ID,
        "showButtonsToPlayers"
      ) as boolean;

      // Check basic requirements
      const hasRequiredSettings =
        endpointURL &&
        endpointURL.trim() !== "" &&
        sessionId &&
        sessionId !== 0;

      if (!hasRequiredSettings) {
        return false;
      }

      // Always show to GMs, only show to players if enabled
      return game.user?.isGM || showToPlayers;
    }
  });
});

// Initialize socket listener for survey URLs
Hooks.once("ready", () => {
  console.log("Session Report | Module ready");

  // Listen for socket messages (for showing survey URLs to players)
  game.socket?.on("module.session-report", (data: any) => {
    if (data.action === "showSurveyUrl" && data.userId === game.user?.id) {
      // Show the survey URL dialog to this user
      const dialog = new SurveyUrlDialogApp(data.url);
      dialog.render(true);
    }
  });
});

/**
 * Close the survey and disconnect from Pusher
 */
function closeSurvey() {
  console.log("Session Report | Closing survey and disconnecting from Pusher");
  pusherManager.disconnect();
  ui.notifications?.info("Survey closed. No longer listening for results.");
}
