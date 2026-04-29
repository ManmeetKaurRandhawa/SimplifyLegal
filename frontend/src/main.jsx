import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

function FallbackScreen({ title = "The app hit a startup problem", message }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        background: "linear-gradient(180deg, #f9fbff 0%, #eef6ff 100%)",
        color: "#1f2a44",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "680px",
          width: "100%",
          background: "#ffffff",
          border: "1px solid rgba(76, 56, 222, 0.12)",
          borderRadius: "24px",
          boxShadow: "0 24px 55px rgba(53, 68, 150, 0.1)",
          padding: "28px",
        }}
      >
        <p style={{ color: "#4c38de", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "10px" }}>
          SIMPLIFYLEGAL
        </p>
        <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "2rem", marginBottom: "10px" }}>{title}</h1>
        <p style={{ color: "#6f7c96", marginBottom: "8px" }}>
          Refresh once. If this message stays, the text below is the exact startup error we need to fix.
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#f5f8ff",
            borderRadius: "16px",
            padding: "14px",
            marginTop: "16px",
          }}
        >
          {message || "Unknown startup error."}
        </pre>
      </div>
    </div>
  );
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.stack || error?.message || "The app could not load.",
    };
  }

  componentDidCatch(error) {
    console.error("SimplifyLegal render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackScreen message={this.state.message} />;
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

function renderFallback(title, error) {
  const message = error?.stack || error?.message || String(error || "Unknown startup error.");
  console.error(title, error);
  root.render(<FallbackScreen title={title} message={message} />);
}

window.addEventListener("error", (event) => {
  renderFallback("A browser error interrupted startup", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  renderFallback("A startup promise failed", event.reason);
});

async function boot() {
  try {
    const { default: App } = await import("./App.jsx");
    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    renderFallback("The app module could not load", error);
  }
}

boot();
