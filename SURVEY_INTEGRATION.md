# Survey Results Integration

## Overview

This module uses **Pusher Channels** for real-time communication between your external survey website and Foundry VTT. When a player completes a survey on your website, the result is instantly pushed to Foundry VTT via Pusher's WebSocket infrastructure.

## Why Pusher?

- **Real-time**: Results appear in Foundry VTT instantly when surveys are completed
- **No polling**: More efficient than repeatedly checking for new results
- **Reliable**: Pusher handles connection management and reconnection
- **Secure**: Uses private channels with server-side authentication
- **Easy setup**: Simple integration on both sides

## Architecture

```
Player completes survey on your website
         ↓
Your backend triggers Pusher client event
         ↓
Pusher Channels (WebSocket relay)
         ↓
Foundry VTT receives event
         ↓
GM sees notification and can view results
```

## Setup Steps

### 1. Create a Pusher Account

1. Sign up at [https://pusher.com](https://pusher.com)
2. Create a new Channels app
3. Note your:
   - App ID
   - App Key (for client-side)
   - App Secret (for server-side)
   - Cluster (e.g., `us2`, `eu`, `ap1`)

### 2. Enable Client Events

In your Pusher dashboard:

1. Go to your app settings
2. Enable **Client Events**
3. This allows your website to trigger events directly

### 3. Configure Foundry VTT

In Foundry VTT module settings:

1. **API Endpoint URL**: `https://your-survey-site.com/api`
2. **API Key**: Your secure API key
3. **Session ID**: Current session number
4. **Pusher App Key**: Your Pusher app key (from step 1)
5. **Pusher Cluster**: Your Pusher cluster (e.g., `us2`)

## Implementation Guide

### Required Endpoints

Your website needs to provide two endpoints:

#### 1. `/pusher/auth` - Channel Authentication

Foundry VTT calls this to authenticate private channel subscriptions.

- Each result must have:
  - `userId`: The Foundry VTT user ID
  - `timestamp`: ISO 8601 formatted timestamp

### Optional Fields

- `playerName`: Display name for the player
- `characterName`: Name of the character
- `votes`: Array of character ratings
- `feedback`: Free-form text feedback
- `responses`: Key-value pairs of survey questions and answers

## Implementation Guide

### 1. Store Survey Results

When a player completes a survey:

````javascript
// Your backend code (Node.js/Express example)
app.post("/api/survey/submit", async (req, res) => {
  const surveyResult = {
    userId: req.body.userId,
    playerName: req.body.playerName,
    characterName: req.body.characterName,
    timestamp: new Date().toISOString(),
    votes: req.body.votes,
    feedback: req.body.feedback,
    responses: req.body.responses
  };

  // Store in your database
  await db.surveyResults.insert(surveyResult);

#### 1. `/pusher/auth` - Channel Authentication


Foundry VTT calls this to authenticate private channel subscriptions.

```javascript
// Node.js/Express example
const Pusher = require('pusher');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

app.post('/api/pusher/auth', (req, res) => {
  // Verify API key
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (apiKey !== process.env.FOUNDRY_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;

  // Authenticate the channel subscription
  const auth = pusher.authenticate(socketId, channel);
  res.send(auth);
});
````

#### 2. `/get-url` - Generate Survey URLs

Foundry VTT calls this when GM clicks "Send Player Surveys".

```javascript
app.post("/api/get-url", async (req, res) => {
  const { sessionId, playerIds } = req.body;

  // Verify API key
  const apiKey = req.headers.authorization?.replace("Bearer ", "");
  if (apiKey !== process.env.FOUNDRY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const urls = {};

  for (const userId of playerIds) {
    // Generate a signed/unique URL that includes the userId
    const token = generateSecureToken({ userId, sessionId });
    urls[userId] = `https://your-survey-site.com/survey/${token}`;
  }

  res.json({ urls });
});
```

### Sending Survey Results to Foundry VTT

When a player completes a survey, trigger a Pusher client event:

```javascript
// Your backend code after player submits survey
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

app.post("/api/survey/submit", async (req, res) => {
  const surveyData = {
    userId: req.body.userId,
    playerName: req.body.playerName,
    characterName: req.body.characterName,
    timestamp: new Date().toISOString(),
    votes: req.body.votes,
    feedback: req.body.feedback,
    responses: req.body.responses
  };

  // Store in your database
  await db.surveyResults.insert(surveyData);

  // Trigger Pusher event to notify Foundry VTT
  const sessionId = req.body.sessionId;
  const channelName = `private-session-${sessionId}`;

  await pusher.trigger(channelName, "client-survey-completed", surveyData);

  res.json({ success: true });
});
```

## Survey Data Format

### Required Fields

- `userId`: Foundry VTT user ID (string)
- `timestamp`: ISO 8601 formatted timestamp (string)

### Optional Fields

```json
{
  "userId": "foundry-user-id",
  "playerName": "Player Name",
  "characterName": "Character Name",
  "timestamp": "2026-02-08T10:30:00Z",

  "votes": [
    {
      "characterName": "Character A",
      "rating": 5
    },
    {
      "characterName": "Character B",
      "rating": 4
    }
  ],

  "feedback": "Great session! Really enjoyed the story.",

  "responses": {
    "What did you enjoy most?": "The combat encounters",
    "What could be improved?": "More roleplay opportunities"
  }
}
```

## How It Works in Detail

1. **GM starts the session**:
   - Configures Pusher credentials in Foundry settings
   - Sets a session ID
   - Foundry connects to Pusher channel `private-session-{sessionId}`

2. **GM sends survey invitations**:
   - Clicks "Send Player Surveys" button
   - Foundry calls your `/get-url` endpoint with player IDs
   - Your server generates unique URLs for each player
   - Foundry shows URL dialogs to each player

3. **Player completes survey**:
   - Visits the unique URL on your website
   - Fills out the survey
   - Submits to your backend

4. **Your backend pushes result**:
   - Stores survey data in database
   - Triggers Pusher event `client-survey-completed` on session channel
   - Pusher relays the event to Foundry VTT in real-time

5. **Foundry receives result**:
   - PusherManager receives the event
   - Stores result in game settings
   - Shows notification to GM
   - GM can view in Survey Results modal

## Viewing Results in Foundry VTT

GMs can:

1. Click the **Survey Results** button (chart icon) in scene controls
2. View all completed surveys with:
   - Player name and timestamp
   - Character votes with star ratings
   - Additional feedback
   - Custom survey responses
3. Export results as JSON for analysis
4. Clear results when no longer needed

## Security Considerations

- **Private channels**: Use Pusher private channels with server-side authentication
- **API authentication**: Always verify the API key in your endpoints
- **HTTPS**: Use TLS for all API communication
- **Token expiry**: Generate time-limited tokens for survey URLs
- **Rate limiting**: Implement rate limits on your endpoints
- **Input sanitization**: Sanitize all user-provided text

## Testing Your Integration

### 1. Test Pusher Connection

In Foundry VTT browser console (F12):

```javascript
// Check if Pusher is connected
console.log(pusherManager.getConnectionState());
// Should show: "connected"

console.log(pusherManager.isConnectedToPusher());
// Should show: true
```

### 2. Test Survey Submission (Manually)

You can manually trigger a test event from your backend or Pusher console:

```javascript
// In Pusher Debug Console or your backend
pusher.trigger("private-session-123", "client-survey-completed", {
  userId: "test-user-id",
  playerName: "Test Player",
  timestamp: new Date().toISOString(),
  votes: [{ characterName: "Test Character", rating: 5 }],
  feedback: "This is a test"
});
```

### 3. Test Full Flow

1. Configure Pusher credentials in Foundry settings
2. Set a test session ID
3. Click "Send Player Surveys"
4. Complete a survey on your website
5. Check Foundry console for "Received survey completion" message
6. View results in Survey Results modal

## Troubleshooting

### Connection Issues

**"Failed to connect to survey results channel"**

- Verify Pusher App Key and Cluster are correct
- Check that `/pusher/auth` endpoint is accessible
- Ensure API key is valid
- Check browser console for detailed errors

**"Subscription error"**

- Verify the channel name format: `private-session-{sessionId}`
- Ensure Client Events are enabled in Pusher dashboard
- Check that `/pusher/auth` returns proper auth response

### Event Not Received

**Survey completed but no notification in Foundry**

- Check that the event name is exactly `client-survey-completed`
- Verify sessionId matches between Foundry and your backend
- Check Pusher dashboard for event delivery
- Ensure your backend successfully triggered the event

**"Pusher credentials not configured"**

- Add Pusher App Key and Cluster in module settings
- Save settings and reload Foundry

## Example Code

### Complete Node.js/Express Backend

```javascript
const express = require("express");
const Pusher = require("pusher");
const app = express();

app.use(express.json());

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Authenticate Pusher private channels
app.post("/api/pusher/auth", (req, res) => {
  const apiKey = req.headers.authorization?.replace("Bearer ", "");
  if (apiKey !== process.env.FOUNDRY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const auth = pusher.authenticate(req.body.socket_id, req.body.channel_name);
  res.send(auth);
});

// Generate survey URLs
app.post("/api/get-url", (req, res) => {
  const { sessionId, playerIds } = req.body;
  const urls = {};

  for (const userId of playerIds) {
    const token = generateToken({ userId, sessionId });
    urls[userId] = `https://survey.example.com/s/${token}`;
  }

  res.json({ urls });
});

// Handle survey submission
app.post("/api/survey/submit", async (req, res) => {
  const surveyData = {
    userId: req.body.userId,
    playerName: req.body.playerName,
    timestamp: new Date().toISOString(),
    votes: req.body.votes,
    feedback: req.body.feedback
  };

  // Store in database
  await db.surveys.insert(surveyData);

  // Push to Foundry via Pusher
  const sessionId = req.body.sessionId;
  await pusher.trigger(
    `private-session-${sessionId}`,
    "client-survey-completed",
    surveyData
  );

  res.json({ success: true });
});

app.listen(3000);
```

## Resources

- [Pusher Channels Documentation](https://pusher.com/docs/channels/)
- [Private Channels Guide](https://pusher.com/docs/channels/using_channels/private-channels/)
- [Client Events](https://pusher.com/docs/channels/using_channels/events/#triggering-client-events)
- [pusher-js Library](https://github.com/pusher/pusher-js)

## Support

For issues or questions:

- Check Foundry VTT console (F12) for error messages
- Check Pusher dashboard for connection/event logs
- Verify all credentials are correct
- Check your backend server logs
