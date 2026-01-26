# n8n NocoBase Custom Node

This is a custom n8n node for NocoBase, designed for deep integration and ease of use with AI-powered workflows.

## Features

- **Full CRUD Support:** Create, Read, Update, and Delete records in any NocoBase collection.
- **Virtual Bulk Create:** Efficiently create multiple records at once via a virtual batching handler.
- **Workflow Integration:** Trigger and manage NocoBase workflows directly from n8n.
- **File Management:** Upload and manage attachments within your collections.
- **AI-Ready:** Optimized with `usableAsTool` support for seamless integration with n8n AI Agents.
- **Robust Data Parsing:** Advanced `safeParseJsonParameter` utility handles both raw JSON strings and structured objects, preventing common AI stringification errors like `[object Object]`.

## AI Agent Integration

This node is optimized for use with **n8n AI Agents**. It includes the `usableAsTool` flag, allowing it to be recognized as a native tool within the AI Agent node.

## Usage as a Tool

1. **Connect** this node to an AI Agent node in n8n.
2. **Dynamic Discovery:** The AI Agent will automatically identify available operations like Create, Bulk Create, and Update.
3. **Automatic Parsing:** The node automatically detects if the AI is passing raw objects or JSON strings, ensuring reliable data transfer without manual conversion.

## Installation

1. Navigate to your n8n custom nodes directory:
   ```bash
   cd ~/.n8n/custom

2. Clone this repository
```bash
git clone https://github.com/yorkane/n8n-nodes-nocobase.git
```

3. Install dependencies
```bash
cd n8n-nodes-nocobase
pnpm install
```

4. Build the nodes
```bash
pnpm run build
```

## Publishing to npm

1. Make sure you have an npm account and are logged in
```bash
npm login
```

2. Update the version in package.json if needed
```bash
npm version patch  # or minor, or major
```

3. Build the package
```bash
pnpm run build
```

4. Publish to npm
```bash
npm publish --tag latest
```

Note: Make sure you have the correct npm registry configured and have the necessary permissions to publish the package.

```
rm -rf dist && pnpm build && docker restart n8n && npm publish --tag latest
```
