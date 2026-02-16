<template>
  <div class="session-report-modal">
    <div class="header-section">
      <p>
        Select the characters to include in the session report. This will send
        character data, player ownership information, and the GM player ID to
        the configured endpoint.
      </p>
    </div>

    <div class="character-list" v-if="characters.length > 0">
      <div class="select-all">
        <label class="select-all-label">
          <input
            type="checkbox"
            :checked="allSelected"
            @change="toggleSelectAll"
          />
          <span class="select-all-text">Select All Characters</span>
        </label>
      </div>

      <div class="character-items">
        <div
          v-for="folder in charactersByFolder"
          :key="folder.name"
          class="folder-group"
        >
          <div class="folder-header">
            <label class="folder-label">
              <input
                type="checkbox"
                :checked="isFolderSelected(folder.name)"
                @change="toggleFolder(folder.name)"
              />
              <i class="fas fa-folder" style="color: #8b6914"></i>
              <span>{{ folder.name }}</span>
              <span class="folder-count">({{ folder.characters.length }})</span>
            </label>
          </div>

          <div class="folder-characters">
            <div
              v-for="character in folder.characters"
              :key="character.id"
              class="character-item"
            >
              <label class="character-label">
                <input
                  type="checkbox"
                  v-model="selectedCharacters"
                  :value="character.id"
                />
                <img
                  :src="character.img"
                  :alt="character.name"
                  class="character-img"
                />
                <div class="character-info">
                  <div class="character-name">
                    {{ character.name }}
                  </div>
                  <div class="character-owner">
                    Owner: {{ getOwnerName(character.ownerId) }}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="no-characters">
      <p>{{ localize("SESSION_REPORT.Modal.NoCharacters") }}</p>
    </div>

    <div class="footer-section">
      <div class="session-status">
        Session: <strong>{{ sessionIdDisplay }}</strong>
      </div>
      <div class="button-row">
        <button
          @click="createSession"
          :disabled="creating"
          class="btn btn-secondary"
        >
          {{ creating ? "Creating..." : "Create Session" }}
        </button>
        <div class="button-group-right">
          <button @click="cancel" class="btn btn-secondary">
            {{ localize("SESSION_REPORT.Modal.CancelButton") }}
          </button>
          <button
            @click="submit"
            :disabled="selectedCharacters.length === 0"
            class="btn btn-primary"
          >
            {{ localize("SESSION_REPORT.Modal.SendButton") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const localize = (key: string): string => {
  return game.i18n.localize(key);
};

interface Character {
  id: string;
  name: string;
  img: string;
  folderId: string | null;
  folderName: string;
  ownerId: string | null;
}

interface Props {
  characters: Character[];
  gmId: string | null;
  initialSelection?: string[];
  dialog?: any;
}

const props = defineProps<Props>();

const selectedCharacters = ref<string[]>([]);

const allSelected = computed(() => {
  return (
    props.characters.length > 0 &&
    selectedCharacters.value.length === props.characters.length
  );
});

const charactersByFolder = computed(() => {
  // Group characters by folder
  const folderMap = new Map<string, Character[]>();

  props.characters.forEach(char => {
    const folderName = char.folderName;
    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, []);
    }
    folderMap.get(folderName)!.push(char);
  });

  // Convert to array and sort folders
  const folders = Array.from(folderMap.entries())
    .map(([name, characters]) => ({
      name,
      characters: characters.sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => {
      // "No Folder" goes last
      if (a.name === "No Folder") return 1;
      if (b.name === "No Folder") return -1;
      return a.name.localeCompare(b.name);
    });

  return folders;
});

const isFolderSelected = (folderName: string) => {
  const folder = charactersByFolder.value.find(f => f.name === folderName);
  if (!folder) return false;

  const folderCharIds = folder.characters.map(c => c.id);
  return (
    folderCharIds.length > 0 &&
    folderCharIds.every(id => selectedCharacters.value.includes(id))
  );
};

const toggleFolder = (folderName: string) => {
  const folder = charactersByFolder.value.find(f => f.name === folderName);
  if (!folder) return;

  const folderCharIds = folder.characters.map(c => c.id);
  const allSelected = folderCharIds.every(id =>
    selectedCharacters.value.includes(id)
  );

  if (allSelected) {
    // Deselect all in folder
    selectedCharacters.value = selectedCharacters.value.filter(
      id => !folderCharIds.includes(id)
    );
  } else {
    // Select all in folder
    const newSelections = folderCharIds.filter(
      id => !selectedCharacters.value.includes(id)
    );
    selectedCharacters.value.push(...newSelections);
  }
};

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedCharacters.value = [];
  } else {
    selectedCharacters.value = props.characters.map(c => c.id);
  }
};

const getOwnerName = (ownerId: string | null): string => {
  if (!ownerId) return "No Owner";
  const user = game.users?.get(ownerId);
  return user?.name || "Unknown User";
};

const submit = () => {
  const reportData = {
    gmId: props.gmId,
    characters: props.characters
      .filter(c => selectedCharacters.value.includes(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        img: c.img,
        ownerId: c.ownerId,
        ownerName: c.ownerId
          ? game.users?.get(c.ownerId)?.name || "Unknown User"
          : "No Owner"
      })),
    timestamp: new Date().toISOString(),
    worldName: game.world?.title || "Unknown World"
  };

  props.dialog?.submit(reportData);
};

const cancel = () => {
  props.dialog?.submit(null);
};

const creating = ref(false);
const sessionId = ref<number | null>(
  (game.settings.get("session-report", "sessionId") as number) || null
);

const sessionIdDisplay = computed(() => {
  return sessionId.value && sessionId.value !== 0
    ? String(sessionId.value)
    : "(none)";
});

const createSession = async () => {
  const endpointURL = game.settings.get(
    "session-report",
    "endpointURL"
  ) as string;
  const apiKey = game.settings.get("session-report", "apiKey") as string;
  const gameId = game.settings.get("session-report", "gameId") as number;

  if (!endpointURL || endpointURL.trim() === "") {
    ui.notifications?.warn(localize("SESSION_REPORT.Modal.NoEndpoint"));
    return;
  }

  try {
    creating.value = true;

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const payload: any = {
      characters: props.characters.map(c => ({
        id: c.id,
        name: c.name,
        img: c.img,
        ownerId: c.ownerId
      }))
    };

    // Include game_id if it exists in settings
    if (gameId && gameId !== 0) {
      payload.game_id = gameId;
    }

    const response = await fetch(`${endpointURL}/set-characters`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const data = await response.json();

    await game.settings.set("session-report", "gameId", data.game_id);
    await game.settings.set("session-report", "sessionId", data.session_id);

    sessionId.value = data.session_id;

    ui.notifications?.info(`Session ${data.session_id} created successfully`);
  } catch (error) {
    console.error(
      "Session Report | Failed to create session from modal:",
      error
    );
    ui.notifications?.error(
      "Failed to create session. See console for details."
    );
  } finally {
    creating.value = false;
  }
};

// Initialize selection from saved selection or default to all
if (props.initialSelection && props.initialSelection.length > 0) {
  // Use provided selection, but only include characters that still exist
  const existingCharIds = props.characters.map(c => c.id);
  selectedCharacters.value = props.initialSelection.filter(id =>
    existingCharIds.includes(id)
  );

  // Note: If the filtered selection is empty, we keep it empty rather than
  // selecting all. This allows for explicit "no selection" when tokens are
  // selected on the canvas but their actors don't match the character type filter.
} else {
  // No saved selection, select all by default
  selectedCharacters.value = props.characters.map(c => c.id);
}
</script>

<style scoped>
.session-report-modal {
  padding: 1rem;
  min-width: 500px;
  color: #444;
  background: url("/ui/parchment.jpg") no-repeat center center;
  background-size: cover;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-section {
  margin-bottom: 1rem;
}

.header-section p {
  font-size: 1.125rem;
  line-height: 1.5;
}

.character-list {
  max-height: 400px;
  overflow-y: auto;
}

.select-all {
  margin-bottom: 1rem;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.select-all-text {
  font-weight: bold;
}

.character-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.folder-group {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
}

.folder-header {
  margin-bottom: 0.5rem;
}

.folder-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  background: #e5e7eb;
  border-radius: 4px;
  font-weight: 600;
}

.folder-count {
  font-size: 0.875rem;
  color: #6b7280;
  margin-left: 0.5rem;
}

.folder-characters {
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.character-item {
  border: 1px solid #ddd;
  border-radius: 4px;
}

.character-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 4px;
}

.character-label:hover {
  background: rgba(0, 0, 0, 0.05);
}

.character-img {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
}

.character-info {
  flex: 1;
}

.character-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.character-owner {
  font-size: 0.875rem;
  color: #6b7280;
}

input[type="checkbox"] {
  cursor: pointer;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.footer-section {
  margin-top: 1.5rem;
}

.session-status {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.button-group-right {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.no-characters {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4a90e2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #357abd;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.dark .folder-label {
  background: #374151;
}

.dark .folder-count {
  color: #9ca3af;
}

.dark .character-item {
  border-color: #444;
}

.dark .character-label:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dark .character-owner {
  color: #9ca3af;
}
</style>
