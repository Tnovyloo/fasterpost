// /lib/api.js
import axios from "axios";

let isCheckingToken = false;

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  withCredentials: true, // important for cookies
});

api.interceptors.request.use(
  (config) => {
    console.log("Outgoing request:", config.data);
    // Optional: Add auth headers here if needed
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401 && !isCheckingToken) {
      isCheckingToken = true;
      try {
        // Step 1: Check token health
        const health = await api.get("/accounts/user/token-health/");
        const reason = health.data?.reason;

        // Step 2: If expired or invalid → logout and clear
        if (health.data.valid === false && ["expired", "invalid"].includes(reason)) {
          console.warn(`Token invalid (${reason}) — clearing session.`);
          await api.post("/accounts/user/logout");
          localStorage.removeItem("isLoggedIn");
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        } else {
          console.info("Token is still valid, ignoring 401.");
        }
      } catch (checkErr) {
        console.error("Token health check failed:", checkErr);
      } finally {
        isCheckingToken = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
