# Session Report Module for Foundry VTT

A Foundry VTT module that allows Game Masters to send session and character data to an external API endpoint for tracking and reporting.

## Features

- **GM-Only Access**: Only Game Masters can access the session report functionality
- **Character Selection**: Select which player characters to include in the report
- **Configurable Endpoint**: Set your own API endpoint URL
- **Optional Authentication**: Support for Bearer token authentication
- **Connection Testing**: Test your API connection before sending data
- **Vue.js Integration**: Modern UI built with Vue 3 and PrimeVue

## Installation

1. Download the module files to your Foundry VTT modules directory:
   ```
   FoundryVTT/Data/modules/session-report/
   ```

2. Install dependencies:
   ```bash
   cd session-report
   npm install
   ```

3. Build the module:
   ```bash
   npm run build
   ```

4. Enable the module in Foundry VTT's module management screen

## Usage

### Configure the Module

1. As a GM, go to **Game Settings** → **Configure Settings** → **Module Settings**
2. Find "Session Report" and click **Settings**
3. Enter your API endpoint URL (e.g., `https://api.example.com/session-report`)
4. Optionally, enter an API key for authentication
5. Click **Test Connection** to verify the endpoint is reachable
6. Click **Save Settings**

### Send a Session Report

1. Click the **Session Report** button in the scene controls (notes section)
2. Select the characters you want to include in the report
3. Click **Send Report**
4. The module will send a POST request with the following data:

```json
{
  "gmId": "user-id-of-active-gm",
  "characters": [
    {
      "id": "character-id",
      "name": "Character Name",
      "img": "path/to/character/image.jpg",
      "ownerId": "user-id-of-player"
    }
  ],
  "timestamp": "2025-12-18T10:30:00.000Z",
  "worldName": "My Campaign World"
}
```

## API Endpoint Requirements

Your API endpoint should:
- Accept POST requests
- Accept JSON payload with `Content-Type: application/json`
- Optionally verify Bearer token authentication
- Return HTTP 2xx status for success

### Example Express.js Endpoint

```javascript
app.post('/session-report', (req, res) => {
  const { gmId, characters, timestamp, worldName } = req.body;
  
  // Verify API key if needed
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  // Process the session report data
  console.log('Session report received:', {
    gmId,
    characterCount: characters.length,
    timestamp,
    worldName
  });
  
  res.json({ success: true, message: 'Report received' });
});
```

## Development

### Build for Development (with watch mode)
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Compatibility

- **Foundry VTT**: v12 or higher
- **Vue**: 3.x
- **PrimeVue**: 3.x

## License

This module is provided as-is for use with Foundry VTT.

## Support

For issues or questions, please create an issue on the GitHub repository.
