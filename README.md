# AI Newsfeed

A personal AI news dashboard that builds a daily reading list from trusted AI
feeds, then ranks stories around the topics you care about.

This app is meant for people who read a lot of AI news and want a cleaner way
to answer: "What should I actually pay attention to today?"

## Demo

Run the app locally and open:

```text
http://localhost:4173
```

The dashboard includes editable interests, topic filters, relevance scores,
source links, and a light/dark mode toggle.

## Features

- Personalized AI news digest
- RSS and Atom feed fetching
- Interest-based story ranking
- Skip-term filtering for topics you do not want
- Topic tabs for quick scanning
- Short digest text for each article
- "Why selected" explanation on each story
- Light and dark mode with saved preference
- No API keys required

## Built With

- Node.js
- Native `http` server
- Browser `fetch`
- HTML, CSS, and vanilla JavaScript
- Public RSS and Atom feeds

No framework or package install is required for the current version.

## Quick Start

Clone or open the project folder, then run:

```bash
npm start
```

Open the dashboard:

```text
http://localhost:4173
```

The default port is `4173`.

## Usage

1. Edit the **Interests** box with the AI topics you care about.
2. Add unwanted topics to **Skip terms**.
3. Select **Refresh Digest**.
4. Use the topic tabs to scan stories by category.
5. Open any article with the **Read** link.
6. Use the theme toggle in the top bar to switch light or dark mode.

Your interests, skip terms, and theme preference are saved in your browser.

## How The Agent Works

The server fetches a set of AI-focused feeds, parses the latest articles, and
scores each story using:

- direct matches against your interests
- related keyword matches
- article freshness
- duplicate filtering
- blocked terms

The dashboard receives the ranked digest from `/api/digest` and renders the
stories as reading cards.

## Customize Sources

Edit the `SOURCES` list in `server.mjs` to add, remove, or rename feeds.

Example:

```js
{ name: "Example AI Blog", topic: "Research", url: "https://example.com/feed.xml" }
```

Each source needs:

- `name`: the label shown in the dashboard
- `topic`: the fallback topic category
- `url`: the RSS or Atom feed URL

## Project Structure

```text
ai_newsfeed/
  public/
    app.js        Dashboard behavior
    index.html    Dashboard markup
    styles.css    Dashboard styling and themes
  package.json
  README.md
  server.mjs      Local server, feed fetching, parsing, and ranking
```

## Privacy

This app does not require API keys, accounts, or credentials.

Your profile is stored locally in your browser through `localStorage`. The
server receives that profile only when you refresh the digest so it can rank
articles for the current request.

## Troubleshooting

### The dashboard loads but there are no stories

Check your network connection. The app needs internet access to fetch RSS and
Atom feeds.

### Some feeds could not be reached

That usually means a source is temporarily unavailable, changed its feed URL,
or blocked the request. The dashboard will still show articles from sources
that respond successfully.

### The port is already in use

Start the app on another port:

```bash
$env:PORT=4174
npm start
```

Then open:

```text
http://localhost:4174
```

## Roadmap

- Add saved reading history
- Add source management in the UI
- Add daily scheduled refreshes
- Add richer topic controls
- Add optional summarization through an AI model

## License

No license has been selected yet.
