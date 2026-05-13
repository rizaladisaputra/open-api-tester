# ⚡ Modern API Studio

Modern API Studio is a powerful, offline-capable, and incredibly fast OpenAPI and Swagger designer built directly in the browser. It streamlines the API design workflow by providing a visual interface for constructing endpoints, generating specs, and even executing HTTP requests against your APIs.

## ✨ Features

- **Visual API Designer**: Construct endpoints, query/path parameters, headers, and request/response bodies using an intuitive visual builder instead of writing YAML by hand.
- **Raw JSON Schema Inference**: Paste raw JSON payloads, and the studio will automatically infer and construct the OpenAPI schema for you.
- **Advanced HTTP Test Runner**: A built-in Postman-like execution panel. Test your API endpoints directly from the browser with dynamic path parameters, custom headers, editable JSON bodies, and detailed response metrics (Time, Size, Status Code).
- **Format Converter**: Convert seamlessly between OpenAPI 3.0 and Swagger 2.0, as well as between JSON and YAML formats.
- **Mock Data Generator**: Automatically generates sample JSON payloads based on your defined OpenAPI schemas.
- **Real-Time Preview**: Instantly view the generated YAML or JSON specification as you build your API.
- **Tag & Component Management**: Organize your APIs into logical tags and define reusable Schema Components and Global Security configurations.
- **Local Persistence**: Works entirely offline. Your API specifications are securely saved in your local browser storage using Zustand persist.

## 🛠 Tech Stack

- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **State Management**: Zustand
- **Code Editor**: Monaco Editor (VS Code core)
- **Styling**: Vanilla CSS with a custom Catppuccin-inspired dark theme

## 📦 Project Structure

This project is structured as an npm monorepo (workspaces):

```text
OpenAPI/
├── apps/
│   ├── client/       # The main React application (Vite)
│   └── server/       # (Optional) Backend proxy or server
├── packages/
│   ├── types/        # Shared TypeScript definitions (OpenAPI specs, etc.)
│   └── utils/        # Core logic for schema inference, spec conversion, etc.
└── package.json      # Monorepo root
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm (v7+ for workspace support)

### Installation

1. Clone this repository.
2. Install dependencies at the root of the project to bootstrap the monorepo:
   ```bash
   npm install
   ```

### Development

To start the development server for the React application:

```bash
npm run dev --workspace=@modern-api-studio/client
```

Or you can navigate directly to the client directory and run the script:
```bash
cd apps/client
npm run dev
```

The app will be running at `http://localhost:5173`.

### Building for Production

To build the project for production deployment:

```bash
cd apps/client
npm run build
```

The compiled static assets will be available in the `apps/client/dist` directory.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request for new features, bug fixes, or enhancements.

## 📄 License

This project is open-source and available under the MIT License.
