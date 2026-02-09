<template>
  <div class="settings-config">
    <div class="settings-header">
      <p class="description">
        {{ localize("SESSION_REPORT.Settings.Description") }}
      </p>
    </div>

    <div class="settings-form">
      <div class="form-group">
        <label for="endpoint-url" class="form-label">
          {{ localize("SESSION_REPORT.Settings.EndpointURL.Name") }}
        </label>
        <input
          id="endpoint-url"
          type="text"
          v-model="endpointURL"
          :placeholder="
            localize('SESSION_REPORT.Settings.EndpointURL.Placeholder')
          "
          class="form-input"
        />
        <p class="form-hint">
          {{ localize("SESSION_REPORT.Settings.EndpointURL.Hint") }}
        </p>
      </div>

      <div class="form-group">
        <label for="api-key" class="form-label">
          {{ localize("SESSION_REPORT.Settings.ApiKey.Name") }}
        </label>
        <input
          id="api-key"
          type="password"
          v-model="apiKey"
          :placeholder="localize('SESSION_REPORT.Settings.ApiKey.Placeholder')"
          class="form-input"
        />
        <p class="form-hint">
          {{ localize("SESSION_REPORT.Settings.ApiKey.Hint") }}
        </p>
      </div>

      <div class="form-group">
        <label for="pusher-app-key" class="form-label">
          {{ localize("SESSION_REPORT.Settings.PusherAppKey.Name") }}
        </label>
        <input
          id="pusher-app-key"
          type="text"
          v-model="pusherAppKey"
          placeholder="Enter your Pusher app key"
          class="form-input"
        />
        <p class="form-hint">
          {{ localize("SESSION_REPORT.Settings.PusherAppKey.Hint") }}
        </p>
      </div>

      <div class="form-group">
        <label for="pusher-cluster" class="form-label">
          {{ localize("SESSION_REPORT.Settings.PusherCluster.Name") }}
        </label>
        <input
          id="pusher-cluster"
          type="text"
          v-model="pusherCluster"
          placeholder="us2"
          class="form-input"
        />
        <p class="form-hint">
          {{ localize("SESSION_REPORT.Settings.PusherCluster.Hint") }}
        </p>
      </div>

      <div class="test-section">
        <h3 class="test-section-title">
          {{ localize("SESSION_REPORT.Settings.TestConnection.Title") }}
        </h3>
        <p class="test-section-description">
          {{ localize("SESSION_REPORT.Settings.TestConnection.Description") }}
        </p>
        <Button
          @click="testConnection"
          :disabled="!endpointURL || testing"
          class="btn-test"
          severity="secondary"
          size="small"
        >
          <i class="fas fa-plug" />
          {{
            testing
              ? localize("SESSION_REPORT.Settings.TestConnection.ButtonTesting")
              : localize("SESSION_REPORT.Settings.TestConnection.Button")
          }}
        </Button>
        <div
          v-if="testResult"
          class="test-result"
          :class="
            testResult.success ? 'test-result-success' : 'test-result-error'
          "
        >
          <i
            :class="
              testResult.success
                ? 'fas fa-check-circle'
                : 'fas fa-exclamation-circle'
            "
          />
          <span>{{ testResult.message }}</span>
        </div>
      </div>
    </div>

    <div class="footer-section">
      <button @click="cancel" class="btn btn-secondary">
        <i class="fas fa-times" />
        {{ localize("SESSION_REPORT.Settings.CancelButton") }}
      </button>
      <button @click="save" class="btn btn-primary">
        <i class="fas fa-save" />
        {{ localize("SESSION_REPORT.Settings.SaveButton") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const localize = (key: string) => {
  return game.i18n.localize(key);
};

interface Props {
  dialog?: any;
}

const props = defineProps<Props>();

const endpointURL = ref(
  (game.settings.get("session-report", "endpointURL") as string) || ""
);
const apiKey = ref(
  (game.settings.get("session-report", "apiKey") as string) || ""
);
const pusherAppKey = ref(
  (game.settings.get("session-report", "pusherAppKey") as string) || ""
);
const pusherCluster = ref(
  (game.settings.get("session-report", "pusherCluster") as string) || "us2"
);
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const testConnection = async () => {
  if (!endpointURL.value) {
    testResult.value = {
      success: false,
      message: localize(
        "SESSION_REPORT.Settings.TestConnection.ErrorNoEndpoint"
      )
    };
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (apiKey.value) {
      headers["Authorization"] = `Bearer ${apiKey.value}`;
    }

    // Send a test ping with minimal data
    const response = await fetch(endpointURL.value, {
      method: "POST",
      headers,
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      testResult.value = {
        success: true,
        message: localize("SESSION_REPORT.TestResult.Success").replace(
          "{status}",
          String(response.status)
        )
      };
    } else {
      testResult.value = {
        success: false,
        message: localize("SESSION_REPORT.TestResult.Failed")
          .replace("{status}", String(response.status))
          .replace("{statusText}", response.statusText)
      };
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: localize("SESSION_REPORT.TestResult.Error").replace(
        "{message}",
        error instanceof Error ? error.message : String(error)
      )
    };
  } finally {
    testing.value = false;
  }
};

const save = async () => {
  try {
    await game.settings.set("session-report", "endpointURL", endpointURL.value);
    await game.settings.set("session-report", "apiKey", apiKey.value);
    await game.settings.set(
      "session-report",
      "pusherAppKey",
      pusherAppKey.value
    );
    await game.settings.set(
      "session-report",
      "pusherCluster",
      pusherCluster.value
    );

    ui.notifications?.info(localize("SESSION_REPORT.Settings.SaveSuccess"));
    props.dialog?.submit(true);
  } catch (error) {
    ui.notifications?.error(
      localize("SESSION_REPORT.Settings.SaveError") + ": " + error
    );
  }
};

const cancel = () => {
  props.dialog?.submit(null);
};
</script>

<style scoped>
.settings-config {
  padding: 1rem;
  min-width: 500px;
  background: url("/ui/parchment.jpg") no-repeat center center;
  background-size: cover;
  color: #444;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-header .description {
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  color: #555;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  display: block;
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin: 0;
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-family: inherit;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}

.form-hint {
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.test-section {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.test-section-title {
  font-weight: 600;
  font-size: 14px;
  margin: 0;
  color: #333;
}

.test-section-description {
  font-size: 13px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.btn-test {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.test-result {
  padding: 0.75rem;
  border-radius: 3px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: fadeIn 0.3s;
}

.test-result-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #047857;
}

.test-result-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #b91c1c;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.footer-section {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  align-items: center;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
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

.dark .form-input {
  background: rgba(42, 42, 42, 0.9);
  border-color: #444;
  color: #ddd;
}

.dark .form-label {
  color: #ddd;
}

.dark .form-hint,
.dark .settings-header .description,
.dark .test-section-description {
  color: #aaa;
}

.dark .test-section {
  background: rgba(42, 42, 42, 0.6);
  border-color: #555;
}

.dark .test-section-title {
  color: #ddd;
}
</style>
