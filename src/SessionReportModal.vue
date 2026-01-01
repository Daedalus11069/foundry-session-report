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
          v-for="character in characters"
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
              <div class="character-name font-bold">{{ character.name }}</div>
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
  ownerId: string | null;
}

interface Props {
  characters: Character[];
  gmId: string | null;
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

// Select all by default
selectedCharacters.value = props.characters.map(c => c.id);
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

.character-item {
  border: 1px solid #ddd;
  margin-bottom: 0.5rem;
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
