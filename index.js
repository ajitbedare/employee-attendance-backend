const express= require("express")
const cors= require("cors")
const mongoose= require("mongoose");
require("dotenv").config();
const authRoutes = require("./routes/auth");
const app= express()
const { authMiddleware } = require("./Middleware/authMiddleware");
const attendanceRoutes = require("./routes/attendance");
const Employee= require("./models/employee")
const shiftRoutes = require("./routes/shift");

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/shifts", shiftRoutes);

app.get("/api/employees", authMiddleware, async (req, res) => {
  try {
    const employees = await Employee.find().select(
      "employeeId name email role"
    );

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
});

app.get("/", (req,res)=>{
    res.send("The Backend is running")
})

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    message: "You can access this protected route",
    employee: req.employee,
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB Connection error:", err.message);
    process.exit(1);
  });