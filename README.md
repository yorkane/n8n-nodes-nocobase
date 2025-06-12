# n8n File System Operations Custom Node

This is a custom n8n node for nocobase.

## Features

## Installation

1. Navigate to n8n custom nodes directory
```bash
cd ~/.n8n/custom
```

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
