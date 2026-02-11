import Pusher from "pusher-js";

// Declare Foundry VTT global
declare const ChatMessage: any;

/**
 * Manages Pusher connection for real-time survey results
 */
export class PusherManager {
  private pusher: Pusher | null = null;
  private channel: any = null;
  private readonly MODULE_ID = "session-report";
  private isConnected = false;

  constructor() {
    console.log("PusherManager | Initializing");
  }

  /**
   * Initialize Pusher connection
   */
  async connect(): Promise<boolean> {
    try {
      const pusherKey = game.settings.get(
        this.MODULE_ID,
        "pusherAppKey"
      ) as string;
      const pusherCluster = game.settings.get(
        this.MODULE_ID,
        "pusherCluster"
      ) as string;
      const sessionId = game.settings.get(
        this.MODULE_ID,
        "sessionId"
      ) as number;

      if (!pusherKey || !pusherCluster) {
        console.warn(
          "PusherManager | Pusher credentials not configured, skipping connection"
        );
        return false;
      }

      if (!sessionId) {
        console.warn(
          "PusherManager | No session ID configured, skipping connection"
        );
        return false;
      }

      // Initialize Pusher
      this.pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
        forceTLS: true,
        authorizer: (channel: any) => {
          return {
            authorize: async (socketId: string, callback: any) => {
              try {
                const authEndpoint = this.getAuthEndpoint();
                if (!authEndpoint) {
                  callback(new Error("Auth endpoint not configured"), null);
                  return;
                }

                const response = await fetch(authEndpoint, {
                  method: "POST",
                  headers: {
                    ...this.getAuthHeaders(),
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    socket_id: socketId,
                    channel_name: channel.name
                  })
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error(
                    `PusherManager | Auth failed: ${response.status} - ${errorText}`
                  );
                  callback(new Error(`Auth failed: ${response.status}`), null);
                  return;
                }

                const data = await response.json();
                callback(null, data);
              } catch (error: any) {
                console.error("PusherManager | Auth error:", error);
                callback(error, null);
              }
            }
          };
        }
      });

      // Set up connection state listeners
      this.pusher.connection.bind("connected", () => {
        console.log("PusherManager | Connected to Pusher");
        this.isConnected = true;
        ui.notifications?.info("Connected to survey results channel");
      });

      this.pusher.connection.bind("disconnected", () => {
        console.log("PusherManager | Disconnected from Pusher");
        this.isConnected = false;
      });

      this.pusher.connection.bind("error", (err: any) => {
        console.error("PusherManager | Connection error:", err);
        // Only show notification for auth errors, not connection issues
        if (err?.error?.type === "AuthError") {
          console.error(
            "PusherManager | Authentication failed. Check Pusher credentials and API key."
          );
        }
      });

      // Subscribe to the session channel
      const channelName = `private-session-${sessionId}`;
      console.log(`PusherManager | Subscribing to channel: ${channelName}`);

      this.channel = this.pusher.subscribe(channelName);

      // Set up channel event listeners
      this.channel.bind("pusher:subscription_succeeded", () => {
        console.log(
          `PusherManager | Successfully subscribed to ${channelName}`
        );
      });

      this.channel.bind("pusher:subscription_error", (status: any) => {
        console.error(
          `PusherManager | Subscription error for ${channelName}:`,
          status
        );
        ui.notifications?.error(
          "Failed to subscribe to survey results channel"
        );
      });

      // Listen for survey completion events
      this.channel.bind("client-survey-completed", (data: any) => {
        console.log("PusherManager | Received survey completion:", data);
        this.handleSurveyCompletion(data);
      });

      return true;
    } catch (error) {
      console.error("PusherManager | Failed to initialize Pusher:", error);
      ui.notifications?.error("Failed to connect to survey results channel");
      return false;
    }
  }

  /**
   * Disconnect from Pusher
   */
  disconnect(): void {
    try {
      if (this.channel) {
        this.channel.unbind_all();
        if (this.pusher) {
          this.pusher.unsubscribe(this.channel.name);
        }
        this.channel = null;
      }

      if (this.pusher && this.pusher.connection.state !== "disconnected") {
        this.pusher.disconnect();
      }
      this.pusher = null;

      this.isConnected = false;
      console.log("PusherManager | Disconnected");
    } catch (error) {
      console.warn("PusherManager | Error during disconnect:", error);
      // Force cleanup even if error occurs
      this.pusher = null;
      this.channel = null;
      this.isConnected = false;
    }
  }

  /**
   * Get authentication endpoint for private channels
   */
  private getAuthEndpoint(): string | undefined {
    const endpointURL = game.settings.get(
      this.MODULE_ID,
      "endpointURL"
    ) as string;

    if (!endpointURL) return undefined;

    // Remove trailing slash if present
    const cleanUrl = endpointURL.replace(/\/$/, "");
    const authUrl = `${cleanUrl}/pusher/auth`;

    console.log(`PusherManager | Auth endpoint: ${authUrl}`);
    return authUrl;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const apiKey = game.settings.get(this.MODULE_ID, "apiKey") as string;
    const headers: Record<string, string> = {};

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
      console.log("PusherManager | Using API key for auth");
    } else {
      console.warn("PusherManager | No API key configured");
    }

    return headers;
  }

  /**
   * Handle incoming survey completion data
   */
  private async handleSurveyCompletion(result: any): Promise<void> {
    try {
      // Only GMs should process results
      if (!game.user?.isGM) {
        return;
      }

      // Get existing results
      const existingResults =
        (game.settings.get(this.MODULE_ID, "surveyResults") as any[]) || [];

      // Add new result with received timestamp
      const newResult = {
        ...result,
        receivedAt: new Date().toISOString()
      };

      existingResults.push(newResult);

      // Save updated results
      await game.settings.set(this.MODULE_ID, "surveyResults", existingResults);

      // Update survey progress tracking
      let progress = (game.settings.get(
        this.MODULE_ID,
        "surveyProgress"
      ) as any) || {
        sessionId: null,
        expected: 0,
        received: 0
      };

      // Only track progress if this is for the current survey session
      // Use == instead of === to allow string/number comparison
      if (progress.sessionId == result.sessionId) {
        progress.received++;
        await game.settings.set(this.MODULE_ID, "surveyProgress", progress);
        console.log(
          "PusherManager | Progress updated:",
          `${progress.received}/${progress.expected}`
        );
      } else {
        console.warn(
          "PusherManager | Session ID mismatch - skipping progress update"
        );
      }

      // Look up player name from ownerId (Foundry user ID)
      const player = game.users?.find((u: any) => u.id === result.ownerId);
      const playerName = player?.name || result.ownerId || "Unknown Player";
      const characterName = result.characterName || "Unknown Character";

      // Notify GM with player name, character name, and progress
      const progressText =
        progress.sessionId == result.sessionId
          ? ` (${progress.received}/${progress.expected})`
          : "";

      ui.notifications?.info(
        `Survey completed by ${playerName} (${characterName})${progressText}`
      );

      // Send GM-only chat message
      const gmUsers = game.users?.filter((u: any) => u.isGM) || [];
      const gmUserIds = gmUsers.map((u: any) => u.id);

      if (gmUserIds.length > 0) {
        await ChatMessage.create({
          content: `<div class="session-report-survey-completion">
            <h3>📋 Survey Completed</h3>
            <p><strong>Player:</strong> ${playerName}</p>
            <p><strong>Character:</strong> ${characterName}</p>
            <p><strong>Progress:</strong> ${progress.received}/${progress.expected} surveys completed</p>
          </div>`,
          whisper: gmUserIds,
          speaker: { alias: "Session Report" }
        });
      }

      // Check if all surveys are completed
      if (
        progress.sessionId == result.sessionId &&
        progress.received >= progress.expected
      ) {
        ui.notifications?.info(
          `All surveys completed! ${progress.received}/${progress.expected} players responded.`
        );

        // Send completion chat message
        if (gmUserIds.length > 0) {
          await ChatMessage.create({
            content: `<div class="session-report-survey-completion">
              <h3>✅ All Surveys Completed!</h3>
              <p><strong>Total Responses:</strong> ${progress.received}/${progress.expected}</p>
              <p>All players have submitted their surveys. You can now view the results.</p>
            </div>`,
            whisper: gmUserIds,
            speaker: { alias: "Session Report" }
          });
        }
      }

      console.log("PusherManager | Survey result saved:", result);
    } catch (error) {
      console.error("PusherManager | Failed to save survey result:", error);
      ui.notifications?.error("Failed to save survey result");
    }
  }

  /**
   * Check if currently connected
   */
  isConnectedToPusher(): boolean {
    return this.isConnected && this.pusher?.connection.state === "connected";
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    return this.pusher?.connection.state || "disconnected";
  }
}

// Export singleton instance
export const pusherManager = new PusherManager();
