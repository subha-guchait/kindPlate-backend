require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const startServer = async (port) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to database successfully");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Error starting server:", err);
  }
};

startServer(process.env.PORT || 3000);
