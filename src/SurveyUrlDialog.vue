<template>
  <div class="survey-url-dialog">
    <div class="dialog-header">
      <i class="fas fa-poll-h header-icon"></i>
      <h2>{{ localize("SESSION_REPORT.Survey.Title") }}</h2>
    </div>

    <div class="dialog-content">
      <p class="dialog-message">
        {{ localize("SESSION_REPORT.Survey.Message") }}
      </p>

      <div class="url-box">
        <input
          type="text"
          :value="surveyUrl"
          readonly
          class="url-input"
          ref="urlInput"
        />
        <button
          @click="copyUrl"
          class="btn btn-copy"
          :title="localize('SESSION_REPORT.Survey.CopyUrl')"
        >
          <i :class="copied ? 'fas fa-check' : 'fas fa-copy'"></i>
        </button>
      </div>

      <p class="help-text">
        {{ localize("SESSION_REPORT.Survey.Help") }}
      </p>
    </div>

    <div class="dialog-footer">
      <button @click="openUrl" class="btn btn-primary">
        <i class="fas fa-external-link-alt"></i>
        {{ localize("SESSION_REPORT.Survey.OpenButton") }}
      </button>
      <button @click="close" class="btn btn-secondary">
        {{ localize("SESSION_REPORT.Survey.CloseButton") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const localize = (key: string): string => {
  return game.i18n.localize(key);
};

interface Props {
  surveyUrl: string;
  dialog?: any;
}

const props = defineProps<Props>();

const urlInput = ref<HTMLInputElement | null>(null);
const copied = ref(false);

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(props.surveyUrl);
    copied.value = true;
    ui.notifications?.info(localize("SESSION_REPORT.Survey.CopySuccess"));

    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    console.error("Failed to copy URL:", error);
    // Fallback: select the text
    urlInput.value?.select();
    ui.notifications?.warn(localize("SESSION_REPORT.Survey.CopyFallback"));
  }
};

const openUrl = () => {
  window.open(props.surveyUrl, "_blank");
  close();
};

const close = () => {
  props.dialog?.close();
};
</script>

<style scoped>
.survey-url-dialog {
  padding: 1rem;
  min-width: 500px;
  max-width: 600px;
  background: url("/ui/parchment.jpg") no-repeat center center;
  background-size: cover;
  color: #444;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
}

.header-icon {
  font-size: 2rem;
  color: #4a90e2;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dialog-message {
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  color: #555;
}

.url-box {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid #4a90e2;
  border-radius: 4px;
}

.url-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 13px;
  font-family: monospace;
  background: white;
  color: #333;
}

.url-input:focus {
  outline: none;
  border-color: #4a90e2;
}

.btn-copy {
  padding: 0.5rem 0.75rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 40px;
}

.btn-copy:hover {
  background: #357abd;
}

.btn-copy i {
  font-size: 1rem;
}

.help-text {
  font-size: 12px;
  color: #666;
  margin: 0;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 3px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background: #4a90e2;
  color: white;
}

.btn-primary:hover {
  background: #357abd;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.dark .dialog-header h2 {
  color: #ddd;
}

.dark .dialog-message,
.dark .help-text {
  color: #aaa;
}

.dark .url-input {
  background: rgba(42, 42, 42, 0.9);
  border-color: #444;
  color: #ddd;
}
</style>
