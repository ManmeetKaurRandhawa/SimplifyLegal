import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "The app could not load.",
    };
  }

  componentDidCatch(error) {
    console.error("SimplifyLegal render error:", error);
  }

  render() {
    if (this.state.hasError) {
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
              maxWidth: "640px",
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
            <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "2rem", marginBottom: "10px" }}>
              The app hit a startup problem
            </h1>
            <p style={{ color: "#6f7c96", marginBottom: "8px" }}>
              Please refresh once. If the problem continues, this message helps us diagnose the deployment faster.
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
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
