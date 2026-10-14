# arcade

Tiny text-mode games in a Claude Code pane.

- `/doom`: a small raycaster. WASD or arrow keys move and turn (left/right arrows turn, A/D strafe), space shoots the `@` enemies when they are centred under the `+` crosshair, `q` closes. A minimap sits in the top-right corner.
- `/snake`: WASD or arrows steer, `r` restarts, `q` closes.

## Terminal size

- Doom: at least 40 columns by 16 rows of pane for a playable view; the minimap (16 columns by 12 rows) only appears when the pane is at least 20 columns wide and 14 rows tall. 80x30 or larger looks best. The view scales to the pane.
- Snake: needs 26 columns by 16 rows.
- Panes dock beside the transcript from about 110 terminal columns, else open inline above the prompt, so a fullscreen terminal of 120x40 or more is ideal.
- Keys only reach a game while its pane has focus (`/doom` asks for focus; click the pane if keys go to the prompt). Esc returns focus to the prompt and closes the pane.
- Key presses move in steps (the terminal gives no key-up), so tap rather than hold.
