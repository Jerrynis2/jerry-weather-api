# JerryWeatherAPI

自动获取访问者 IP 地理位置并返回对应天气信息的 API，可部署在 Vercel 上。

## 功能

- 自动检测访问者 IP 并定位（城市/经纬度/时区）
- 返回全面的天气数据：
  - 当前天气：温度、体感温度、湿度、气压、风速风向、阵风、云量、降水量、能见度、紫外线指数
  - 逐时预报：未来 48 小时
  - 每日预报：未来 7 天（含日出日落时间）
  - 天气描述支持中英双语
- 5 分钟内存缓存，减少 API 调用
- CORS 支持，可直接前端调用
- 内置本地测试服务器和可视化测试页面

## 快速开始

### 本地测试

```bash
# 安装依赖
npm install

# 启动本地服务器
npm run dev
```

打开浏览器访问 `http://localhost:3000` 即可看到测试页面，页面会自动获取天气数据。

### API 调用示例

```bash
# 自动检测 IP
curl http://localhost:3000/api/weather

# 指定 IP 测试
curl "http://localhost:3000/api/weather?ip=8.8.8.8"
```

## 返回数据结构

```json
{
  "success": true,
  "location": {
    "ip": "8.8.8.8",
    "city": "San Jose",
    "region": "California",
    "country": "United States",
    "countryCode": "US",
    "latitude": 37.2585,
    "longitude": -121.9103,
    "timezone": "America/Los_Angeles"
  },
  "current": {
    "temperature": 18.2,
    "apparentTemperature": 17.5,
    "weatherCode": 0,
    "weatherDescription": "Clear sky",
    "weatherDescriptionZh": "晴天",
    "humidity": 55,
    "pressure": 1015.2,
    "windSpeed": 12.5,
    "windDirection": 270,
    "windDirectionText": "W",
    "windGusts": 18.3,
    "cloudCover": 0,
    "precipitation": 0,
    "uvIndex": 3.2,
    "visibility": 16000,
    "isDay": true,
    "observedAt": "2026-08-10T10:00:00"
  },
  "hourly": [ ... ],
  "daily": [ ... ],
  "units": {
    "temperature": "°C",
    "windSpeed": "km/h",
    "precipitation": "mm",
    "pressure": "hPa",
    "visibility": "meters",
    "humidity": "%"
  }
}
```

## 部署到 Vercel

### 方式一：CLI 部署

```bash
# 安装 Vercel CLI（已包含在 devDependencies 中）
npm install

# 登录 Vercel
npx vercel login

# 部署到生产环境
npm run deploy
```

### 方式二：GitHub 自动部署

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 控制台点击 "Import Project"
3. 选择仓库，Vercel 会自动识别配置
4. 点击 Deploy

### 方式三：vercel dev 测试

```bash
# 使用 Vercel CLI 的开发服务器（模拟 Vercel 环境）
npm run vercel-dev
```

## 项目结构

```
weather-api/
├── api/
│   └── weather.ts          # Vercel Serverless Function
├── lib/
│   ├── types.ts            # TypeScript 类型定义
│   ├── weatherCodes.ts     # WMO 天气代码映射（中英双语）
│   ├── geolocation.ts      # IP 地理定位
│   └── weather.ts          # 天气数据获取
├── public/
│   └── index.html          # 测试页面
├── server.js               # 本地测试服务器
├── package.json
├── tsconfig.json
├── vercel.json             # Vercel 配置
└── README.md
```

## 技术栈

- **天气数据**: [Open-Meteo](https://open-meteo.com/) — 免费，无需 API Key
- **IP 定位**: Vercel 内置地理定位 Headers + [ipwho.is](https://ipwho.is/) + [ip-api.com](http://ip-api.com/) 三重备用
- **运行时**: Vercel Serverless Functions (Node.js 18+)
- **语言**: TypeScript

## IP 定位策略

API 按以下顺序获取地理位置：

1. **Vercel Headers** — 部署在 Vercel 上时自动可用，零延迟
2. **ipwho.is** — 免费 HTTPS API，无需 API Key
3. **ip-api.com** — 免费 HTTP API 备用

## 无需 API Key

所有外部 API 都是免费的，不需要注册或获取 API Key：
- Open-Meteo: 每日 10,000 次免费请求
- ipwho.is: 免费 HTTPS
- ip-api.com: 每分钟 45 次免费请求

## 限制

- 内存缓存在 Serverless 环境中是实例级的，不同实例不共享
- ip-api.com 免费版仅支持 HTTP（非 HTTPS）
- Open-Meteo 免费版不支持商业用途
