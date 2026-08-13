# 七夕动态情书

这是送给郭静恬的七夕动态情书网站。正文唯一来源为 `assets/七夕.txt`，图片与 BGM 均使用 `assets/` 中的现有素材。

## 打开方式

1. 在 `E:\七夕` 目录打开 PowerShell。
2. 运行：

   ```powershell
   npm run serve
   ```

3. 浏览器打开：

   ```text
   http://localhost:4173
   ```

如果电脑只有 Node.js、没有 npm，也可以直接运行：

```powershell
node scripts/serve.mjs
```

不要直接双击 `index.html`：浏览器通常会阻止 `file://` 页面读取 `assets/七夕.txt`。

## 修改恋爱开始时间

只需要修改 `js/content.js` 顶部这一处：

```js
export const relationshipStart = "2026-06-10T00:00:00+08:00";
```

## 操作

- 点击开场信封开始播放并启动 BGM。
- 每幕动画完成后，点击“♡ 轻触继续”。
- 右上角音乐按钮可以暂停或继续 BGM。
- 手工书场景点击顶层照片可循环翻看。
- 结尾可重播，或打开两个照片相册。
