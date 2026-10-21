const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Attendance = require("../models/attendance");
const { authMiddleware } = require("../Middleware/authMiddleware");

const router = express.Router();

// Create uploads folder if it does not exist
const uploadDir = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Configure selfie storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + ".jpg";
    cb(null, uniqueName);
  },
});

// Accept image files only, with a 5 MB limit
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload an image file"));
    }
  },
});

router.post(
  "/mark",
  authMiddleware,
  upload.single("selfie"),
  async (req, res) => {
    try {
      const employeeId = req.employee.id;
      const { latitude, longitude } = req.body;

      // Selfie and location are required
      if (!req.file) {
        return res.status(400).json({
          message: "Please capture a selfie first",
        });
      }

      if (latitude == null || longitude == null) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: "Location is required",
        });
      }

      const today = new Date().toISOString().split("T")[0];

      const existingAttendance = await Attendance.findOne({
        employeeId,
        date: today,
      });

      if (existingAttendance) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: "Attendance already marked for today",
        });
      }

      let city = "";
      let state = "";

      try {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          {
            headers: {
              "User-Agent": "EmployeeAttendanceApp/1.0",
            },
          }
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          const address = geoData.address || {};

          city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            "";

          state = address.state || "";
        }
      } catch (error) {
        console.log("Reverse geocoding error:", error.message);
      }

      const attendance = new Attendance({
        employeeId,
        date: today,
        status: "Present",
        checkInTime: new Date().toLocaleTimeString(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        city,
        state,
        selfie: req.file.filename,
      });

      await attendance.save();

      res.status(201).json({
        message: "Attendance marked successfully",
        attendance,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (error.code === 11000) {
        return res.status(400).json({
          message: "Attendance already marked for today",
        });
      }

      console.error("Mark attendance error:", error);

      res.status(500).json({
        message: "Failed to mark attendance",
        error: error.message,
      });
    }
  }
);

router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const today = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (!attendance) {
      return res.status(404).json({
        message: "Please mark your check-in first",
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        message: "Check-out already recorded for today",
      });
    }

    attendance.checkOutTime = new Date().toLocaleTimeString();

    await attendance.save();

    return res.status(200).json({
      message: "Check-out recorded successfully",
      attendance,
    });
  } catch (error) {
    console.error("Check-out error:", error);

    return res.status(500).json({
      message: "Failed to record check-out",
      error: error.message,
    });
  }
});



router.get("/selfie/:filename", authMiddleware, async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);

    const attendance = await Attendance.findOne({
      selfie: filename,
    });

    if (!attendance) {
      return res.status(404).json({ message: "Selfie not found" });
    }

    const isOwner =
      attendance.employeeId.toString() === req.employee.id;

    const isAdmin = req.employee.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const filePath = path.join(__dirname, "../uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Selfie file not found",
      });
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error("Selfie loading error:", error);
    return res.status(500).json({
      message: "Failed to load selfie",
      error: error.message,
    });
  }
});



router.get("/all", authMiddleware, async (req, res) => {
  try {
    if (req.employee.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin only.",
      });
    }

    const attendance = await Attendance.find()
      .populate("employeeId", "name employeeId")
      .sort({ date: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch all attendance",
      error: error.message,
    });
  }
});

router.get("/my-attendance", authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const attendance = await Attendance.find({ employeeId }).sort({
      date: -1,
    });

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch attendance",
      error: error.message,
    });
  }
});


router.get("/employee/:employeeId", authMiddleware, async (req, res) => {
  try {
    if (req.employee.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin only.",
      });
    }

    const attendance = await Attendance.find({
      employeeId: req.params.employeeId,
    }).sort({ date: -1 });

    return res.status(200).json(attendance);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch employee attendance",
      error: error.message,
    });
  }
});


module.exports = router;
