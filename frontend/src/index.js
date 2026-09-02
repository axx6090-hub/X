import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// Telegram Mini Apps put their launch parameters in the URL hash.
// HashRouter uses that same hash for navigation, so restore the home route
// after Telegram's SDK has already read the launch data.
const telegramLaunchHash = window.location.hash;
if (
  telegramLaunchHash.includes("tgWebAppData=") ||
  telegramLaunchHash.includes("tgWebAppVersion=")
) {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#/`,
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
