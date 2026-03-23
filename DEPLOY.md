# 课表网站部署说明

这个网站已经是纯静态版本，适合直接部署到静态托管平台。

可部署文件：
- `index.html`
- `styles.css`
- `app.js`
- `schedule-data.js`
- `manifest.json`
- `service-worker.js`

推荐部署方式：
1. 上传到 GitHub Pages
2. 上传到 Vercel 静态站点
3. 上传到 Netlify
4. 放到你自己的服务器目录

手机使用建议：
1. 部署后用手机浏览器打开网址
2. 如果浏览器支持，会出现“安装”按钮
3. 安装后可像小程序/应用一样从桌面打开

注意：
- `service-worker.js` 和安装能力通常只在 `https://` 或本机 `localhost` 下生效
- 直接双击 `index.html` 可以看页面，但“安装到手机桌面”功能可能不会启用
