<template>
  <div class="session-report-modal">
    <div class="header-section mb-4">
      <p class="text-lg">
        Select the characters to include in the session report. This will send
        character data, player ownership information, and the GM player ID to
        the configured endpoint.
      </p>
    </div>

    <div class="character-list" v-if="characters.length > 0">
      <div class="select-all mb-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="allSelected"
            @change="toggleSelectAll"
            class="cursor-pointer"
          />
          <span class="font-bold">Select All Characters</span>
        </label>
      </div>

      <div class="character-items">
        <div
          v-for="folder in charactersByFolder"
          :key="folder.name"
          class="folder-group mb-4"
        >
          <div class="folder-header">
            <label
              class="flex items-center gap-2 cursor-pointer p-2 bg-gray-200 dark:bg-gray-700 rounded font-semibold"
            >
              <input
                type="checkbox"
                :checked="isFolderSelected(folder.name)"
                @change="toggleFolder(folder.name)"
                class="cursor-pointer"
              />
              <i class="fas fa-folder" style="color: #8b6914"></i>
              <span>{{ folder.name }}</span>
              <span class="text-sm text-gray-600 dark:text-gray-400 ml-2"
                >({{ folder.characters.length }})</span
              >
            </label>
          </div>

          <div class="folder-characters ml-6 mt-2">
            <div
              v-for="character in folder.characters"
              :key="character.id"
              class="character-item"
            >
              <label
                class="flex items-center gap-3 cursor-pointer p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <input
                  type="checkbox"
                  v-model="selectedCharacters"
                  :value="character.id"
                  class="cursor-pointer"
                />
                <img
                  :src="character.img"
                  :alt="character.name"
                  class="character-img"
                />
                <div class="character-info flex-1">
                  <div class="character-name font-bold">
                    {{ character.name }}
                  </div>
                  <div
                    class="character-owner text-sm text-gray-600 dark:text-gray-400"
                  >
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
      <p class="text-center text-gray-500 py-8">
        {{ localize("SESSION_REPORT.Modal.NoCharacters") }}
      </p>
    </div>

    <div class="footer-section mt-6 flex gap-3 justify-end">
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

// Initialize selection from saved selection or default to all
if (props.initialSelection && props.initialSelection.length > 0) {
  // Use saved selection, but only include characters that still exist
  const existingCharIds = props.characters.map(c => c.id);
  selectedCharacters.value = props.initialSelection.filter(id =>
    existingCharIds.includes(id)
  );

  // If saved selection is empty after filtering, select all
  if (selectedCharacters.value.length === 0) {
    selectedCharacters.value = props.characters.map(c => c.id);
  }
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

.character-list {
  max-height: 400px;
  overflow-y: auto;
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

.folder-characters {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.character-item {
  border: 1px solid #ddd;
  border-radius: 4px;
}

.character-img {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
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

.dark .character-item {
  border-color: #444;
}
</style>
