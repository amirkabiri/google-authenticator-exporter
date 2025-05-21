# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

# Google Authenticator Exporter

A tool to scan, read, and export Google Authenticator QR codes.

## Features

- Scan QR codes from Google Authenticator's export screen
- **Support for both standard OTP URIs and Google's migration QR codes**
- Parse TOTP (Time-based One-Time Password) and HOTP (HMAC-based One-Time Password) URIs
- Display real-time TOTP codes with countdown timer
- Export authentication data as JSON
- Generate QR codes for importing into other authenticator apps
- **Multi-account support for migration QR codes**
- Full details display with secret key, algorithm, period, etc.
- Copy functions for codes and secrets

## Migration QR Support

This tool can parse the special migration QR codes that Google Authenticator displays when you use the "Export accounts" or "Transfer accounts" feature. These QR codes contain multiple accounts in a proprietary format, which this tool can decode.

When scanning a migration QR code:
1. All accounts in the QR code will be detected and listed
2. You can switch between accounts to view their details
3. You can export all accounts at once with the "Export All Accounts as JSON" button
4. Individual accounts can be exported as standalone QR codes or JSON files

## Usage

1. Install dependencies:
   ```
   bun install
   ```

2. Start the development server:
   ```
   bun dev
   ```

3. Open Google Authenticator on your device and export an account or use the "Transfer accounts" feature
4. Allow camera access in your browser
5. Scan the QR code displayed by Google Authenticator
6. View the parsed information and export as needed

## Technology

- React with TypeScript
- Vite for build tooling
- ZXing library for QR code scanning
- OTPAuth for handling TOTP/HOTP codes
- QRCode.js for generating QR codes
- Protocol Buffers for parsing Google's migration format

## Development

This project is built with Vite and React. To contribute:

1. Fork the repository
2. Clone your fork
3. Install dependencies with `bun install`
4. Start the dev server with `bun dev`
5. Make your changes
6. Submit a pull request

## Privacy and Security

- All processing happens directly in your browser
- No data is sent to any servers
- Consider using this tool offline for sensitive 2FA codes

## License

MIT
