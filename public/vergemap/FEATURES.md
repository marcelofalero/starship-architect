# The Verge Map - Feature Overview

The Verge Map is an interactive, real-time 3D Virtual Tabletop (VTT) designed for fleet management and stellar navigation in the Starship Architect ecosystem.

## Core Features
- **Interactive 3D Environment:** Navigate a fully realized 3D map of star systems and ships using your mouse (pan, zoom, rotate).
- **Distance Calculator:** Quickly calculate the exact distance (in Light Years) between any two entities on the map.
- **Travel System:** Select a ship and plot a course to another star system. Enter the travel distance to automatically animate the ship moving along the vector route.
- **Data Persistence:** All map data (ships, stars, logs) is saved locally in your browser (`localStorage`) and can be exported/imported as YAML files for backups or sharing.

## Entity Management
- **Ships:** Track fleet positions in 3D space.
- **Star Systems:** Define star systems as navigational anchors. Supports classes O, B, A, F, G, K, M.
- **Points of Interest (POIs):** Define stations, derelict ships, or space anomalies.
  - *Default Visual Markers:* Space Stations (cyan 3D cubes), Derelict Ships (gray 3D tetrahedrons), and Space Anomalies (large glowing magenta spheres).
- **Custom Tokens:** Upload local PNG/WebP images to represent Ships, Star Systems, or POIs. Includes a built-in token editor to adjust scale, rotation, and automatically remove background colors (e.g., top-left pixel transparency).
- **Token Library:** Decouples token images from entity positions. Custom uploads are saved to a global library registry, allowing multiple entities (e.g., identical standard ships) to reuse the same token. This optimizes network sync payloads over MQTT and prepares the app for Cloudflare R2 integration.

## Role-Based Access Modes
The map enforces UI and capability restrictions based on URL query parameters (`?mode=`). If no mode is specified, it defaults to Navigation mode.

- **`?mode=ro` (Read-Only):** 
  - Designed for players who only need to view the map.
  - Can search for entities and calculate distances.
  - All editing, movement, and data management controls are hidden.
- **`?mode=nav` (Navigation - Default):** 
  - Designed for standard players.
  - Can move ships and use the travel controls.
  - Cannot create or delete entities, and cannot access the data export/import tools.
- **`?mode=gm` (Game Master):** 
  - Designed for the session runner.
  - Full access to all creation, deletion, and editing tools.

## Game Master (GM) Capabilities
GMs possess advanced tools for orchestrating the map environment:
- **Entity Editor Modal:** Click any entity and select "Edit Details" to modify its properties dynamically.
- **Rich Text Descriptions:** Add HTML-supported descriptions to entities to provide lore and context.
- **Public & Private Notes:** Add public notes visible to everyone, or private notes visible *only* to the GM.
- **Hidden Entities:** Toggle a "Hidden from Players" setting on any entity. Hidden items appear as semi-transparent ghosts for the GM, but are completely erased from the map and search dropdowns for all other modes.
- **Movement Log Management:** View a real-time log of all ship movements. GMs have the exclusive ability to delete specific log entries to clean up the history.

## Real-Time Collaboration
- **Backend Sessions:** Map data is synchronized to a backend session system (via `?session=` URL parameters).
- **MQTT Real-Time Updates:** Ship movements are broadcasted via MQTT, ensuring that when a player or GM moves a ship, it instantly updates on the screens of all other connected users viewing the same session.
- **Quick Share:** A built-in share button copies the exact session URL to your clipboard for easy distribution to players.

## Localization
- **Bilingual Interface:** Includes a toggle to switch the user interface between English and Spanish on the fly.
