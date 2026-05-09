# AI Newsfeed

A local daily AI news dashboard with a lightweight server-side agent.

## Run

```bash
npm start
```

Then open `http://localhost:4173`.

## What The Agent Does

- Fetches AI-focused RSS and Atom feeds from frontier labs, industry outlets, and open source communities.
- Scores each story against your interest profile.
- Filters terms you do not want in your daily brief.
- Groups selected stories into topics like Agents, Consumer Tools, Models, Research, Policy and Safety, and Business.
- Explains why each article was selected.

Your interests are stored locally in the browser. Edit the topic list in the sidebar and refresh the digest to change what gets prioritized.

## Customize Sources

Edit the `SOURCES` list in `server.mjs` to add, remove, or rename feeds.
