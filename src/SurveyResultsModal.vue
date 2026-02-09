<template>
  <div class="survey-results-modal">
    <div class="results-header">
      <i class="fas fa-chart-bar header-icon"></i>
      <div>
        <h2>{{ localize("SESSION_REPORT.SurveyResults.Title") }}</h2>
        <p class="subtitle">
          {{ localize("SESSION_REPORT.SurveyResults.Subtitle") }}
        </p>
      </div>
    </div>

    <!-- GM-Only Rewards that apply to all characters -->
    <div v-if="gmRewardsForAll.length > 0 && isGM" class="gm-rewards-section">
      <h3>
        GM Rewards (All Characters)
        <span class="hint-text">- Right click to subtract</span>
      </h3>
      <div class="gm-buttons">
        <button
          v-for="reward in gmRewardsForAll"
          :key="reward.title"
          class="btn btn-gm"
          :title="reward.description"
          @click="addGmRewardToAll(reward)"
          @contextmenu.prevent="removeGmRewardFromAll(reward)"
        >
          <i class="fas fa-star"></i>
          {{ reward.title }} (+{{ reward.value }})
        </button>
      </div>
    </div>

    <div class="results-content" v-if="characterResults.length > 0">
      <div class="table-wrapper">
        <table class="results-table">
          <thead>
            <tr>
              <th class="character-header">Character</th>
              <th
                v-for="reward in playerRewards"
                :key="reward.title"
                class="reward-header"
              >
                <div class="rotated-header" :title="reward.description">
                  <span>{{ reward.title }}</span>
                </div>
              </th>
              <th class="total-header">Total</th>
              <th
                v-if="gmRewardsPerCharacter.length > 0 && isGM"
                class="gm-header"
              >
                GM Rewards
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="char in characterResults" :key="char.character_id">
              <td class="character-cell">
                <div class="character-info">
                  <strong>{{ char.character_name }}</strong>
                  <span class="player-name">{{
                    getPlayerName(char.owner_id)
                  }}</span>
                </div>
              </td>
              <td
                v-for="reward in playerRewards"
                :key="reward.title"
                class="tally-cell"
                :title="reward.description"
              >
                <span
                  v-if="char.reward_tallies[reward.title] > 0"
                  class="tally-value"
                >
                  {{ char.reward_tallies[reward.title] }}
                </span>
                <span v-else class="tally-empty">-</span>
              </td>
              <td class="total-cell">
                <div class="total-display">
                  <div class="base-total">{{ char.total_value }}</div>
                  <div
                    v-if="getGmBonusTotal(char.character_id) > 0"
                    class="gm-bonus"
                  >
                    +{{ getGmBonusTotal(char.character_id) }}
                  </div>
                  <div class="final-total">= {{ getFinalTotal(char) }}</div>
                </div>
              </td>
              <td
                v-if="gmRewardsPerCharacter.length > 0 && isGM"
                class="gm-cell"
              >
                <div class="gm-rewards-list">
                  <div
                    v-for="reward in gmRewardsPerCharacter"
                    :key="reward.title"
                    class="gm-reward-row"
                  >
                    <button
                      class="btn btn-gm-subtract"
                      :title="`Remove ${reward.title}`"
                      @click="removeGmReward(char.character_id, reward)"
                      :disabled="
                        getGmRewardCount(char.character_id, reward.title) === 0
                      "
                    >
                      <i class="fas fa-minus"></i>
                    </button>
                    <span class="gm-reward-count">
                      {{ getGmRewardCount(char.character_id, reward.title) }}
                    </span>
                    <button
                      class="btn btn-gm-add"
                      :title="`Add ${reward.title} (+${reward.value})`"
                      @click="addGmReward(char.character_id, reward)"
                    >
                      <i class="fas fa-plus"></i>
                    </button>
                    <span class="gm-reward-label">{{ reward.title }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else class="no-results">
      <i class="fas fa-inbox"></i>
      <p>{{ localize("SESSION_REPORT.SurveyResults.NoResults") }}</p>
    </div>

    <div class="results-footer">
      <button v-if="isGM" @click="broadcastResults" class="btn btn-info">
        <i class="fas fa-broadcast-tower"></i>
        Send Results to System
      </button>
      <button @click="close" class="btn btn-primary">
        {{ localize("SESSION_REPORT.SurveyResults.CloseButton") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from "vue";

// Access Foundry's global objects
declare const game: any;
declare const Hooks: any;
declare const ui: any;

const localize = (key: string): string => {
  return game.i18n.localize(key);
};

const isGM = computed(() => {
  return game?.user?.isGM ?? false;
});

interface CharacterResult {
  character_id: number;
  character_name: string;
  owner_id: string;
  reward_tallies: Record<string, number>;
  total_value: number;
}

interface PlayerReward {
  title: string;
  description: string;
  value: number;
}

interface GmReward {
  title: string;
  description: string;
  value: number;
  applies_to_all: boolean;
}

interface ApiResults {
  characters: CharacterResult[];
  player_rewards: PlayerReward[];
  gm_rewards: GmReward[];
}

interface Props {
  dialog?: any;
  apiResults?: ApiResults;
}

const props = defineProps<Props>();

// Track GM-awarded rewards per character
const gmAwardedRewards = reactive<Record<number, Record<string, number>>>({});

const characterResults = computed(() => {
  return props.apiResults?.characters || [];
});

const playerRewards = computed(() => {
  return props.apiResults?.player_rewards || [];
});

const gmRewards = computed(() => {
  return props.apiResults?.gm_rewards || [];
});

const gmRewardsForAll = computed(() => {
  return gmRewards.value.filter(r => r.applies_to_all);
});

const gmRewardsPerCharacter = computed(() => {
  return gmRewards.value.filter(r => !r.applies_to_all);
});

// Calculate final totals including GM rewards
function getFinalTotal(char: CharacterResult): number {
  const gmBonus = getGmBonusTotal(char.character_id);
  return char.total_value + gmBonus;
}

// Get GM bonus for a character
function getGmBonusTotal(characterId: number): number {
  const awards = gmAwardedRewards[characterId];
  if (!awards) return 0;

  return Object.entries(awards).reduce((total, [rewardTitle, count]) => {
    const reward = gmRewards.value.find(r => r.title === rewardTitle);
    return total + (reward?.value || 0) * count;
  }, 0);
}

// Get count of GM reward for character
function getGmRewardCount(characterId: number, rewardTitle: string): number {
  return gmAwardedRewards[characterId]?.[rewardTitle] || 0;
}

// Add GM reward to character
function addGmReward(characterId: number, reward: GmReward) {
  if (!gmAwardedRewards[characterId]) {
    gmAwardedRewards[characterId] = {};
  }
  if (!gmAwardedRewards[characterId][reward.title]) {
    gmAwardedRewards[characterId][reward.title] = 0;
  }
  gmAwardedRewards[characterId][reward.title]++;
}

// Remove GM reward from character
function removeGmReward(characterId: number, reward: GmReward) {
  if (!gmAwardedRewards[characterId]?.[reward.title]) return;

  gmAwardedRewards[characterId][reward.title]--;

  // Clean up if count reaches 0
  if (gmAwardedRewards[characterId][reward.title] <= 0) {
    delete gmAwardedRewards[characterId][reward.title];
  }
}

// Add GM reward to all characters
function addGmRewardToAll(reward: GmReward) {
  characterResults.value.forEach(char => {
    addGmReward(char.character_id, reward);
  });
}

// Remove GM reward from all characters
function removeGmRewardFromAll(reward: GmReward) {
  characterResults.value.forEach(char => {
    removeGmReward(char.character_id, reward);
  });
}

// Get all selected rewards for a character (for the hook)
function getCharacterRewards(char: CharacterResult): string[] {
  const rewards: string[] = [];

  // Add voted rewards
  Object.entries(char.reward_tallies).forEach(([title, count]) => {
    for (let i = 0; i < count; i++) {
      rewards.push(title);
    }
  });

  // Add GM rewards
  const gmAwards = gmAwardedRewards[char.character_id];
  if (gmAwards) {
    Object.entries(gmAwards).forEach(([title, count]) => {
      for (let i = 0; i < count; i++) {
        rewards.push(title);
      }
    });
  }

  return rewards;
}

// Broadcast results to Foundry hook
function broadcastResults() {
  const results = characterResults.value.map(char => ({
    player_id: char.owner_id,
    character_id: char.character_id,
    character_name: char.character_name,
    total: getFinalTotal(char),
    reasons: getCharacterRewards(char)
  }));

  // Fire Foundry hook
  Hooks.callAll("sessionReportResults", results);

  ui.notifications?.info(
    `Survey results broadcast to system (${results.length} characters)`
  );
}

function getPlayerName(ownerId: string): string {
  const player = game.users?.find((u: any) => u.id === ownerId);
  return player?.name || ownerId || "Unknown Player";
}

function close() {
  props.dialog?.close();
}
</script>

<style scoped>
.survey-results-modal {
  padding: 0;
  width: 95vw;
  max-width: 100%;
  background: #f8f9fa;
  color: #333;
  display: flex;
  flex-direction: column;
  height: 85vh;
  overflow: hidden;
}

.results-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex-shrink: 0;
}

.header-icon {
  font-size: 2rem;
  color: white;
  margin-top: 0.25rem;
}

.results-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
}

.subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.results-content {
  overflow: auto;
  min-height: 0;
}

.table-wrapper {
  width: 100%;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: white;
}

.results-table thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.results-table th,
.results-table td {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  text-align: center;
}

.results-table tbody tr:hover {
  background-color: #f8f9fa;
}

.character-header,
.character-cell {
  text-align: left;
  min-width: 180px;
  background: #f0f4ff;
  position: sticky;
  left: 0;
  z-index: 5;
}

.character-header {
  z-index: 15;
}

.character-cell {
  background: white;
}

.results-table tbody tr:hover .character-cell {
  background-color: #f8f9fa;
}

.character-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.character-info strong {
  font-size: 14px;
  color: #333;
}

.player-name {
  font-size: 11px;
  color: #666;
  font-weight: normal;
}

.reward-header {
  height: 120px;
  min-width: 50px;
  max-width: 50px;
  padding: 5px;
  transform: translateY(-1rem);
  vertical-align: bottom;
  position: relative;
}

.rotated-header {
  transform: rotate(-75deg);
  transform-origin: center;
  white-space: nowrap;
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%) rotate(-75deg);
  font-size: 11px;
  font-weight: 600;
  cursor: help;
}

.tally-cell {
  background: white;
  font-weight: 500;
  cursor: help;
}

.tally-value {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 4px;
  font-weight: 600;
  min-width: 30px;
}

.tally-empty {
  color: #ccc;
}

.total-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-weight: 700;
  min-width: 120px;
}

.total-cell {
  background: #f0f4ff;
  font-weight: 700;
}

.total-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 14px;
}

.base-total {
  color: #666;
}

.gm-bonus {
  color: #28a745;
  font-weight: 600;
}

.final-total {
  color: #667eea;
  font-weight: 700;
  font-size: 16px;
}

.gm-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-width: 200px;
}

.gm-cell {
  background: #fff8f0;
  padding: 0.5rem;
}

.gm-rewards-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gm-reward-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  justify-content: center;
}

.btn-gm-subtract,
.btn-gm-add {
  padding: 0.25rem 0.4rem;
  font-size: 11px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
}

.btn-gm-subtract {
  background: #dc3545;
  color: white;
}

.btn-gm-subtract:hover:not(:disabled) {
  background: #c82333;
}

.btn-gm-subtract:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-gm-add {
  background: #28a745;
  color: white;
}

.btn-gm-add:hover {
  background: #218838;
}

.gm-reward-count {
  min-width: 20px;
  text-align: center;
  font-weight: 600;
  color: #333;
}

.gm-reward-label {
  font-size: 11px;
  color: #666;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gm-rewards-section {
  padding: 1rem 1.5rem;
  background: linear-gradient(
    135deg,
    rgba(102, 126, 234, 0.1) 0%,
    rgba(118, 75, 162, 0.1) 100%
  );
  border-bottom: 2px solid #667eea;
  flex-shrink: 0;
}

.gm-rewards-section h3 {
  margin: 0 0 0.75rem 0;
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gm-rewards-section h3 .hint-text {
  font-size: 11px;
  font-weight: normal;
  color: #999;
  text-transform: none;
  letter-spacing: normal;
}

.gm-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-gm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 12px;
  padding: 0.5rem 0.9rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-gm:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.btn-gm i {
  margin-right: 0;
}

.no-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: #999;
}

.no-results i {
  font-size: 4rem;
}

.no-results p {
  margin: 0;
  font-size: 14px;
}

.results-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  background: white;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #5568d3 0%, #653a8b 100%);
}

.btn-info {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
  color: white;
}

.btn-info:hover {
  background: linear-gradient(135deg, #138496 0%, #0f6674 100%);
}
</style>
