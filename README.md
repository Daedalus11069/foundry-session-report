# Session Report Module for Foundry VTT

A Foundry VTT module that allows Game Masters to send session and character data to an external API endpoint for tracking and reporting.

## Features

- **GM-Only Access**: Only Game Masters can access the session report functionality
- **Character Selection**: Select which player characters to include in the report
- **Configurable Endpoint**: Set your own API endpoint URL
- **Optional Authentication**: Support for Bearer token authentication
- **Connection Testing**: Test your API connection before sending data
- **Vue.js Integration**: Modern UI built with Vue 3 and PrimeVue

# Foundry Session Report

Foundry Session Report enables Game Masters to create and send session reports and collect attendee feedback from inside Foundry VTT. It provides configurable report payloads, survey dialogs, and optional real-time update support.

## Key Features

- Generate session reports including selected characters and metadata
- Collect attendee surveys and view results in the GM UI
- Configurable API endpoint and optional Bearer token authentication
- Connection testing and simple JSON payloads for server-side processing
- Optional Pusher integration for real-time updates (requires keys)

## Install (Recommended: GitHub Releases manifest)

This module supports installation via a Foundry manifest URL that points to the `module.json` published with each release on GitHub. When you publish a release with the `module.json` asset, use the following manifest URL in Foundry:

https://github.com/Daedalus11069/foundry-session-report/releases/latest/download/module.json

To install:

1. In Foundry VTT go to `Add-on Modules` → `Install Module` → `Install from URL`.
2. Paste the manifest URL above and click `Install`.
3. After installation, enable the module in the `Manage Modules` list for your world.

Note: The `releases/latest/download/module.json` link will always point to the `module.json` attached to your latest GitHub release.

## Development / Local Install

- For local development, place the module folder in Foundry's `Data/modules/` directory or use your dev linking helpers (e.g., `linkDevEnv.bat`).
- Install dependencies and build locally:

```bash
npm install
npm run build
```

Or run watch mode during development:

```bash
npm run dev
```

## Configuration

Configure API endpoint, authentication token, and Pusher keys from the module settings in Foundry (`Module Settings`). Use `Test Connection` to validate your endpoint.

## Contributing & Support

- Report issues or contribute on GitHub: https://github.com/Daedalus11069/foundry-session-report

## License

See the repository for license details.

---

File: [README.md](README.md)

- Optionally verify Bearer token authentication
