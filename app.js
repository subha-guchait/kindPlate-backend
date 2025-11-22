require("dotenv").config();
const express = require("express");
const cors = require("cors");

const errorMiddleware = require("./middlewares/errorMiddleware");
const authRoutes = require("./routes/authRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const postRoutes = require("./routes/postRoutes");
const userRoutes = require("./routes/userRoutes");
const priceRoutes = require("./routes/priceRoutes");
const adRoutes = require("./routes/adRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const analyticRoutes = require("./routes/admin/analyticsRoutes");
const userAdminRoutes = require("./routes/admin/userAdminRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");
require("./cronJobs/archivePostsJob");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/price", priceRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/analytics", analyticRoutes);
app.use("/api/admin/users", userAdminRoutes);
app.use("/api/admin/admins", adminRoutes);
app.use("/api/ai", aiRoutes);
// Error middleware
app.use(errorMiddleware);

module.exports = app;
