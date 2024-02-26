# Atomate

A minimal, free news reader for the web.

Atomate lets you add news source, blogs, microblogs, newsletters, Youtube channels, social media accounts or any site with a **public RSS or Atom** feed and merges them into a single chronological feed.

## Features

- Single chronological feed for all your RSS & Atom feeds.
- Read the contents of the news without leaving the app.
- Ability to add social feed from Mastodon, Bluesky, Tumblr, Youtube etc.
- Progressive web app. Installable on mobile phones.
- 100% Free & Open-source.
- Ad free (_and I wish to stay that way_)

## How to run locally

### Prerequisite

- Node.js
- MongoDb

Fork this repo and then clone it:

```
git clone https://github.com/<your_name>/atomate.git
```

You need MongoDB to run this application. If you don't already have MongoDB, go to the [official documentation](https://docs.mongodb.com/manual/installation/) and follow the instructions there. Once you have MongoDB installed, run

```
mongo
```

to start the MongoDB instance. Then cd into directory where the repo was cloned and install the dependencies:

```
npm install
```

Then just run

```
npm start
```

to start the development server on port 3000. Your Atomate instance will be running on http://localhost:755.

## LICENSE

MIT
