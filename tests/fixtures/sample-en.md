---
title: Sample Page
description: A sample markdown page used for testing
section: getting-started
---

# Getting Started

This is a paragraph with **bold** and _italic_ text and `inline code`.

## Installation

Run the following command:

```bash
npm install pi-docs
```

Or with pnpm:

```sh
pnpm add pi-docs
```

### Requirements

- Node.js 18+
- npm, pnpm, or yarn
- A [GitHub](https://github.com) account

> **Note:** This project uses Pi v2 under the hood.

## Usage

Visit `https://pi.dev/docs/latest` for documentation.

### Code Example

```ts
import { createApp } from "pi";

const app = createApp({
  name: "my-app",
  version: "1.0.0"
});

app.start();
```

| Option    | Type   | Default | Description      |
| --------- | ------ | ------- | ---------------- |
| `name`    | string | —       | Application name |
| `version` | string | —       | App version      |

Here is an inline image: ![Pi Logo](/docs-assets/pi-logo.svg)

For more details, see the [reference guide](/docs/latest/reference).

SvelteKit is the framework of choice. OpenRouter provides the LLM gateway.

Another paragraph with `/absolute/path/to/config` and `npm run build` command.

```html
<div class="container">
  <p>Hello World</p>
</div>
```
