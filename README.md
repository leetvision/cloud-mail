<p align="center">
    <img src="doc/demo/logo.png" width="80px" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center">A simple, responsive email service designed to run on Cloudflare Workers 🎉</p>
    <p align="center">
        <a href="https://github.com/maillab/cloud-mail/tree/main?tab=MIT-1-ov-file" target="_blank">
            <img src="https://img.shields.io/badge/license-MIT-green" />
        </a>
        <a href="https://github.com/maillab/cloud-mail/releases" target="_blank">
            <img src="https://img.shields.io/github/v/release/maillab/cloud-mail" alt="releases" />
        </a>
        <a href="https://github.com/maillab/cloud-mail/issues">
            <img src="https://img.shields.io/github/issues/maillab/cloud-mail" alt="issues" />
        </a>
        <a href="https://github.com/maillab/cloud-mail/stargazers" target="_blank">
            <img src="https://img.shields.io/github/stars/maillab/cloud-mail" alt="stargazers" />
        </a>
        <a href="https://github.com/maillab/cloud-mail/forks" target="_blank">
            <img src="https://img.shields.io/github/forks/maillab/cloud-mail" alt="forks" />
        </a>
    </p>
    <p align="center">
        <a href="https://trendshift.io/repositories/20459" target="_blank">
            <img src="https://trendshift.io/api/badge/repositories/20459" alt="trendshift" />
        </a>
    </p>
</p>

## Description

With one domain, you can create multiple email addresses similar to major email platforms. This project runs on Cloudflare Workers, reducing server costs while providing a self-hosted email service.

## Project Showcase

- [Live Demo](https://skymail.ink)<br>
- [Deployment Guide](https://doc.skymail.ink/en/)<br>

## Features

- **💰 Low-Cost Usage**: No server required—deploy to Cloudflare Workers to reduce costs.
- **💻 Responsive Design**: Automatically adapts to desktop and most mobile browsers.
- **📧 Email Sending**: Integrates with Resend and supports bulk delivery, inline images, attachments, and delivery status.
- **🛡️ Admin Features**: Manage users and email with role-based access controls and resource limits.
- **📦 Attachment Support**: Send and receive attachments stored in Cloudflare R2.
- **🔔 Email Push**: Forward received email to Telegram bots or other email providers.
- **📡 Open API**: Create users in bulk and query email with multiple filters.
- **🔢 Verification-Code Recognition**: Detect verification codes automatically with Workers AI.
- **📈 Data Visualization**: Visualize system data and user/email growth with ECharts.
- **🎨 Personalization**: Customize the site title, login background, and opacity.
- **🤖 CAPTCHA**: Integrates Cloudflare Turnstile to limit automated registration.
- **📜 More Features**: Additional features are under development.

## Tech Stack

- **Platform**: [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **Web Framework**: [Hono](https://hono.dev/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Frontend Framework**: [Vue 3](https://vuejs.org/)
- **UI Framework**: [Element Plus](https://element-plus.org/)
- **Email Service**: [Resend](https://resend.com/)
- **Cache**: [Cloudflare KV](https://developers.cloudflare.com/kv/)
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/)
- **File Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/)

## Project Structure

```text
cloud-mail
├── mail-worker                 # Worker backend project
│   ├── src
│   │   ├── api                 # API layer
│   │   ├── const               # Project constants
│   │   ├── dao                 # Data-access layer
│   │   ├── email               # Email processing and receiving
│   │   ├── entity              # Database entities
│   │   ├── error               # Custom errors
│   │   ├── hono                # Web framework, middleware, and global errors
│   │   ├── i18n                # Internationalization
│   │   ├── init                # Database and cache initialization
│   │   ├── model               # Response models
│   │   ├── security            # Authentication and authorization
│   │   ├── service             # Business-service layer
│   │   ├── template            # Message templates
│   │   ├── utils               # Utilities
│   │   └── index.js            # Entry point
│   ├── package.json            # Project dependencies
│   └── wrangler.jsonc          # Project configuration
│
├── mail-vue                    # Vue frontend project
│   ├── src
│   │   ├── axios               # Axios configuration
│   │   ├── components          # Custom components
│   │   ├── echarts             # ECharts component imports
│   │   ├── i18n                # Internationalization
│   │   ├── init                # Application initialization
│   │   ├── layout              # Main layout components
│   │   ├── perm                # Permission checks
│   │   ├── request             # API requests
│   │   ├── router              # Router configuration
│   │   ├── store               # Global state management
│   │   ├── utils               # Utilities
│   │   ├── views               # Page components
│   │   ├── App.vue             # Root component
│   │   ├── main.js             # Entry point
│   │   └── style.css           # Global CSS
│   ├── package.json            # Project dependencies
│   └── .env.release            # Release environment configuration
```

## Sponsor

[Support the project](https://doc.skymail.ink/support.html)

## License

This project is licensed under the [MIT License](LICENSE).

## Community

[Telegram](https://t.me/cloud_mail_tg)
