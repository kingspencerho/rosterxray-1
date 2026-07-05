import React from "react";

// Hardcoded colors, not var(--token) — if App itself crashed before mounting,
// the <style> tag that defines the :root tokens (rendered as part of App's
// own JSX) may never have made it into the DOM, so this fallback can't
// safely depend on those tokens existing.
const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "24px",
    textAlign: "center",
    backgroundColor: "#0a0a0a",
    color: "#fafafa",
    fontFamily: "sans-serif",
  },
  message: {
    fontSize: "18px",
    color: "#fafafa",
  },
  button: {
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#0a0a0a",
    backgroundColor: "#a78bfa",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("RosterXRay crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.wrap}>
          <div style={styles.message}>Something went wrong.</div>
          <button style={styles.button} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
