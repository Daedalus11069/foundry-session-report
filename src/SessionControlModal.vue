<template>
  <div class="session-control-modal">
    <div class="section">
      <h3>Session Management</h3>

      <div class="field">
        <label>Current Session ID: {{ currentSessionId || "None" }}</label>
      </div>

      <div class="field">
        <Button
          label="Create New Session"
          icon="fas fa-plus"
          @click="createNewSession"
          :loading="isCreating"
          :disabled="!canCreate"
        />
        <small v-if="!canCreate" class="text-danger">
          Please configure endpoint URL in settings first
        </small>
      </div>

      <div v-if="creationMessage" class="message" :class="messageType">
        {{ creationMessage }}
      </div>
    </div>

    <Divider />

    <div class="section">
      <h3>Player Button Visibility</h3>

      <div class="field">
        <label class="flex align-items-center gap-2">
          <Checkbox
            v-model="showButtonsToPlayers"
            binary
            @change="toggleButtonVisibility"
          />
          <span>Show Session Report buttons to players</span>
        </label>
        <small class="help-text">
          When enabled, players will see a button on their character sheets to
          access the session report
        </small>
      </div>
    </div>

    <div class="button-row">
      <Button label="Close" severity="secondary" @click="close" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Divider from "primevue/divider";
import type { VueDialog } from "./VueDialog";

interface Props {
  dialog?: VueDialog;
}

const props = defineProps<Props>();

const MODULE_ID = "session-report";

const currentSessionId = ref<number>(0);
const showButtonsToPlayers = ref<boolean>(false);
const isCreating = ref<boolean>(false);
const creationMessage = ref<string>("");
const messageType = ref<"success" | "error">("success");

const canCreate = computed(() => {
  const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;
  return endpointURL && endpointURL.trim() !== "";
});

onMounted(() => {
  // Load current settings
  currentSessionId.value = game.settings.get(MODULE_ID, "sessionId") as number;
  showButtonsToPlayers.value = game.settings.get(
    MODULE_ID,
    "showButtonsToPlayers"
  ) as boolean;
});

async function createNewSession() {
  isCreating.value = true;
  creationMessage.value = "";

  try {
    const endpointURL = game.settings.get(MODULE_ID, "endpointURL") as string;
    const apiKey = game.settings.get(MODULE_ID, "apiKey") as string;

    // Gather character data using the configured actor type filter
    const actorTypeFilter = game.settings.get(
      MODULE_ID,
      "actorTypeFilter"
    ) as string;
    const actors = game.actors || [];

    // Filter by the specified actor type (default: "pc")
    const characters = actors.filter(
      (actor: any) => actor.type === actorTypeFilter
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${endpointURL}/set-characters`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        characters: characters.map((char: any) => ({
          id: char.id,
          name: char.name,
          img: char.img,
          ownerId: char.ownership
            ? Object.keys(char.ownership).find(
                (userId: string) =>
                  char.ownership[userId] === 3 && userId !== "default"
              )
            : null
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Update settings with new IDs
    await game.settings.set(MODULE_ID, "gameId", data.game_id);
    await game.settings.set(MODULE_ID, "sessionId", data.session_id);

    currentSessionId.value = data.session_id;

    creationMessage.value = `Session created successfully! Session ID: ${data.session_id}`;
    messageType.value = "success";

    ui.notifications?.info(`Session ${data.session_id} created successfully`);
  } catch (error) {
    console.error("Failed to create session:", error);
    creationMessage.value =
      error instanceof Error ? error.message : "Failed to create session";
    messageType.value = "error";
    ui.notifications?.error("Failed to create session");
  } finally {
    isCreating.value = false;
  }
}

async function toggleButtonVisibility() {
  try {
    await game.settings.set(
      MODULE_ID,
      "showButtonsToPlayers",
      showButtonsToPlayers.value
    );
    ui.notifications?.info(
      showButtonsToPlayers.value
        ? "Session Report buttons enabled for players"
        : "Session Report buttons disabled for players"
    );
  } catch (error) {
    console.error("Failed to update button visibility:", error);
    ui.notifications?.error("Failed to update setting");
  }
}

function close() {
  props.dialog?.close();
}
</script>

<style scoped>
.session-control-modal {
  padding: 1rem;
  min-width: 500px;
}

.section {
  margin-bottom: 1rem;
}

.section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.help-text {
  display: block;
  margin-top: 0.25rem;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.message {
  padding: 0.75rem;
  border-radius: 0.375rem;
  margin-top: 1rem;
}

.message.success {
  background-color: var(--p-green-50);
  color: var(--p-green-900);
  border: 1px solid var(--p-green-200);
}

.message.error {
  background-color: var(--p-red-50);
  color: var(--p-red-900);
  border: 1px solid var(--p-red-200);
}

.button-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-border);
}

.text-danger {
  color: var(--p-red-500);
  display: block;
  margin-top: 0.25rem;
}
</style>
