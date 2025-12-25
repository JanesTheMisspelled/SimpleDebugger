# Debug Server

This application acts as an interactive debugger for a separate client application. It pauses the client execution at specific steps (Pre/Post) and allows a user to inspect and modify data via a web interface.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the server and UI:
    ```bash
    npm run dev
    ```
    - The UI will be available at `http://localhost:5173` (or the port Vite selects).
    - The API Server will be running on `http://localhost:3001`.

## Usage

1.  **Client Application**: Your client application should make HTTP POST requests to `http://localhost:3001/api/debug/wait` to pause execution.
    - **Payload Format**:
      ```json
      {
        "metadata": {
          "runId": "unique-run-id",
          "stepName": "StepName",
          "configName": "ConfigName",
          "configResource": "Resource",
          "type": "Pre" // or "Post"
        },
        "data": { ... your json data ... }
      }
      ```
    - The request will hang until you interact with the UI.

2.  **Web Interface**:
    - Open the UI.
    - It will show "Waiting for Client Connection..." until a request is received.
    - **Pre-Step**: You will see the data sent by the client. You can edit it. Clicking "Send & Continue" will return the (modified) data to the client application.
    - **Post-Step**: You will see the original "Pre" data (if available from the same run/step), the current "Post" data (editable), and a diff view.

## Notes
- The server stores "Pre" step data in memory to facilitate the diff view in the "Post" step. Ensure `runId` and `stepName` match between the Pre and Post calls.