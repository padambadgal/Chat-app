const socket = io("http://localhost:5000", {
  auth: {
    token: localStorage.getItem("token")
  },
  autoConnect: false
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket error:", err.message);
});

// AFTER LOGIN
socket.connect();