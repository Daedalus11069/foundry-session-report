import { VueDialog } from "./VueDialog";
import SessionReportModal from "./SessionReportModal.vue";
import SettingsConfig from "./SettingsConfig.vue";

import "./session-report.css";

/**
 * Session Report Module
 * Sends character and session data to an external endpoint
 */

const MODULE_ID = "session-report";

// Register module settings
Hooks.once("init", () => {
  console.log("Session Report | Initializing module");

  // Register endpoint URL setting
  game.settings.register(MODULE_ID, "endpointURL", {
    name: game.i18n.localize("SESSION_REPORT.Settings.EndpointURL.Name"),
    hint: game.i18n.localize("SESSION_REPORT.Settings.EndpointURL.Hint"),
    scope: "world",
    config: false, // We'll use a custom UI
    type: String,
    default: ""
  });

  // Register API key setting
  game.settings.register(MODULE_ID, "apiKey", {
    name: game.i18n.localize("SESSION_REPORT.Settings.ApiKey.Name"),
    hint: game.i18n.localize("SESSION_REPORT.Settings.ApiKey.Hint"),
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
    name: game.i18n.localize("SESSION_REPORT.Settings.GameId.Name"),
    hint: game.i18n.localize("SESSION_REPORT.Settings.GameId.Hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  // Register Session ID setting
  game.settings.register(MODULE_ID, "sessionId", {
    name: game.i18n.localize("SESSION_REPORT.Settings.SessionId.Name"),
    hint: game.i18n.localize("SESSION_REPORT.Settings.SessionId.Hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });
});

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
Hooks.on("getSceneControlButtons", (controls: any[]) => {
  // Only show to GMs
  if (!game.user?.isGM) return;

  // Find the notes control group (or you can add to a different group)
  const notesControl = controls.find(c => c.name === "notes");

  if (notesControl) {
    notesControl.tools.push({
      name: "session-report",
      title: game.i18n.localize("SESSION_REPORT.Button.SendReport"),
      icon: "fas fa-file-export",
      button: true,
      onClick: () => openSessionReportModal()
    });
  }
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
  const characters = game.actors?.filter((actor: any) => actor.isPc()) || [];

  // Open the modal
  const result = await VueDialog.show(
    SessionReportModal,
    {
      characters: characters.map((char: any) => ({
        id: char.id,
        name: char.name,
        img: char.img,
        ownerId: char.ownership
          ? Object.keys(char.ownership).find(
              userId => char.ownership[userId] === 3 && userId !== "default"
            )
          : null
      })),
      gmId: game.users?.find((u: any) => u.isGM && u.active)?.id || null
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
    const { game_id, session_id } = await sendSessionReport(result);
    await game.settings.set(MODULE_ID, "gameId", game_id);
    await game.settings.set(MODULE_ID, "sessionId", session_id);
  }
}

/**
 * Send the session report to the configured endpoint
 */
async function sendSessionReport(data: any) {
  const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;
  const apiKey = game.settings.get(MODULE_ID, "apiKey") as string;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${endpointURL}/set-characters`, {
      method: "POST",
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    ui.notifications?.info(game.i18n.localize("SESSION_REPORT.Modal.Success"));

    return await response.json();
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
    tooltip: "View session report",
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
      return (
        endpointURL && endpointURL.trim() !== "" && sessionId && sessionId !== 0
      );
    }
  });
});

// Log when module is ready
Hooks.once("ready", () => {
  console.log("Session Report | Module ready");
});
