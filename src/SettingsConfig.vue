<template>
  <div class="settings-config">
    <div class="settings-header mb-4">
      <p class="text-lg">
        Configure the API endpoint and authentication settings for the Session
        Report module.
      </p>
    </div>

    <div class="settings-form">
      <div class="form-group mb-4">
        <label for="endpoint-url" class="form-label">
          {{ localize("SESSION_REPORT.Settings.EndpointURL.Name") }}
        </label>
        <input
          id="endpoint-url"
          type="text"
          v-model="endpointURL"
          :placeholder="'https://api.example.com/session-report'"
          class="form-input"
        />
        <p class="form-hint text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ localize("SESSION_REPORT.Settings.EndpointURL.Hint") }}
        </p>
      </div>

      <div class="form-group mb-4">
        <label for="api-key" class="form-label">
          {{ localize("SESSION_REPORT.Settings.ApiKey.Name") }}
        </label>
        <input
          id="api-key"
          type="password"
          v-model="apiKey"
          placeholder="Optional API key for authentication"
          class="form-input"
        />
        <p class="form-hint text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ localize("SESSION_REPORT.Settings.ApiKey.Hint") }}
        </p>
      </div>

      <div class="test-section mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h3 class="font-bold mb-2">Test Connection</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Send a test request to verify the endpoint is reachable.
        </p>
        <button
          @click="testConnection"
          :disabled="!endpointURL || testing"
          class="btn btn-test"
        >
          {{ testing ? "Testing..." : "Test Connection" }}
        </button>
        <div
          v-if="testResult"
          class="test-result mt-3 p-3 rounded"
          :class="
            testResult.success
              ? 'bg-green-100 dark:bg-green-900'
              : 'bg-red-100 dark:bg-red-900'
          "
        >
          <p
            class="text-sm"
            :class="
              testResult.success
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            "
          >
            {{ testResult.message }}
          </p>
        </div>
      </div>
    </div>

    <div class="footer-section mt-6 flex gap-3 justify-end">
      <button @click="cancel" class="btn btn-secondary">Cancel</button>
      <button @click="save" class="btn btn-primary">Save Settings</button>
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
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const testConnection = async () => {
  if (!endpointURL.value) {
    testResult.value = {
      success: false,
      message: "Please enter an endpoint URL first."
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
        message: `Connection successful! (HTTP ${response.status})`
      };
    } else {
      testResult.value = {
        success: false,
        message: `Connection failed: HTTP ${response.status} - ${response.statusText}`
      };
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: `Connection error: ${
        error instanceof Error ? error.message : String(error)
      }`
    };
  } finally {
    testing.value = false;
  }
};

const save = async () => {
  try {
    await game.settings.set("session-report", "endpointURL", endpointURL.value);
    await game.settings.set("session-report", "apiKey", apiKey.value);

    ui.notifications?.info("Session Report settings saved successfully!");
    props.dialog?.submit(true);
  } catch (error) {
    ui.notifications?.error("Failed to save settings: " + error);
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
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.dark .form-input {
  background: #2a2a2a;
  border-color: #444;
  color: #fff;
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

.btn-test {
  background: #28a745;
  color: white;
}

.btn-test:hover:not(:disabled) {
  background: #218838;
}
</style>
