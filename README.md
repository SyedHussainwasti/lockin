# Pomodoro

A Pomodoro focus timer: 25-minute work / 5-minute break cycles with a progress
ring, cycle counter, and an audible beep on every phase change.

## How to use

Open `index.html`. Optionally change the work/break lengths, hit **Start**.
**Pause** freezes the clock; **Reset** returns to a fresh work session.
The ring drains as time passes; two beeps mark each work↔break switch.

## How it works

- A tiny state machine (`idle → work → break → work…`) driven by wall-clock
  timestamps, so pausing the tab or throttled timers can't skew the countdown.
- Progress ring is an SVG circle whose `stroke-dashoffset` tracks completion.
- The beep is synthesized with the WebAudio API (two sine tones) — no audio
  files, no network.

## Files

- `index.html` — the page layout (the words and boxes you see)
- `styles.css` — all the colors and styling, with plain-words notes
- `app.js` — the timer logic, with plain-words notes on every step
