# n8n-nodes-klib-comfyui

这是一个用于n8n的ComfyUI节点集合，允许您在n8n工作流中与ComfyUI服务器进行交互。

## 功能特点

这个节点包提供了以下功能：

1. **ComfyUI 触发器**：监听ComfyUI WebSocket事件，当特定事件发生时触发工作流
4. **ComfyUI 模型管理**：获取可用模型、采样器、调度器等资源列表
7. **ComfyUI 系统控制**：管理队列、中断执行、清理历史记录等

## Installation

1. Navigate to n8n custom nodes directory
```bash
cd ~/.n8n/custom
```

2. Clone this repository
```bash
git clone https://github.com/yorkane/n8n-nodes-klib-comfyui.git
```

3. Install dependencies
```bash
cd n8n-nodes-klib-comfyui
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
## 节点说明



通过WebSocket监听ComfyUI的执行状态和图像数据�?
**操作**�?- 监听执行状态：监听特定提示ID的执行状�?- 监听图像数据：监听并接收图像数据

### ComfyUI 模型管理

获取ComfyUI服务器上可用的模型和资源�?
**操作**�?- 获取所有模型：获取所有可用模型的列表
- 获取特定类型模型：获取特定类型的模型列表
- 获取采样器列表：获取可用的采样器列表
- 获取调度器列表：获取可用的调度器列表
- 获取扩展列表：获取已安装的扩展列�?- 获取嵌入向量列表：获取可用的嵌入向量列表

### ComfyUI 系统控制

管理ComfyUI系统和队列�?
**操作**�?- 获取队列状态：获取当前队列状�?- 清空队列：清空当前队列中的所有任�?- 中断执行：中断当前正在执行的任务
- 清空历史记录：清空所有历史记�?- 删除历史记录项：删除特定的历史记录项
- 获取系统信息：获取系统信�?
## 使用示例


### 示例3：自动化模型管理

1. 使用ComfyUI模型管理节点获取当前可用模型列表
2. 使用Function节点检查是否需要更新模�?3. 如果需要更新，使用HTTP Request节点下载新模�
