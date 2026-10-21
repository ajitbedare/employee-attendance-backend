const express = require("express");
const router = express.Router();

const Shift = require("../models/shift");
const Employee = require("../models/employee");
const {authMiddleware,isAdmin} = require("../Middleware/authMiddleware");



router.post("/create",authMiddleware,isAdmin, async (req, res) => {
  try {
    const { name, startTime, endTime, employeeIds } = req.body;

    if (
      !name ||
      !startTime ||
      !endTime ||
      !Array.isArray(employeeIds) ||
      employeeIds.length === 0
    ) {
      return res.status(400).json({
        message: "Please provide shift details and employee IDs",
      });
    }

    const employees = await Employee.find({
      _id: { $in: employeeIds },
    });

    if (employees.length !== new Set(employeeIds).size) {
      return res.status(404).json({
        message: "One or more employees not found",
      });
    }

    const shift = new Shift({
      name,
      startTime,
      endTime,
      employees: employees.map((employee) => employee._id),
    });

    await shift.save();

    res.status(201).json({
      message: "Shift created successfully",
      shift,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});


router.put("/update/:id",authMiddleware,isAdmin, async (req, res) => {
  try {
    const { name, startTime, endTime, employeeIds } = req.body;

    if (
      !name ||
      !startTime ||
      !endTime ||
      !Array.isArray(employeeIds) ||
      employeeIds.length === 0
    ) {
      return res.status(400).json({
        message: "Please provide shift details and employee IDs",
      });
    }

    const employees = await Employee.find({
      _id: { $in: employeeIds },
    });

    if (employees.length !== new Set(employeeIds).size) {
      return res.status(404).json({
        message: "One or more employees not found",
      });
    }

    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      {
        name,
        startTime,
        endTime,
        employees: employees.map((employee) => employee._id),
      },
      { new: true, runValidators: true }
    );

    if (!shift) {
      return res.status(404).json({
        message: "Shift not found",
      });
    }

    res.status(200).json({
      message: "Shift updated successfully",
      shift,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});


router.get("/", authMiddleware, async (req, res) => {
  try {
    const shifts = await Shift.find().populate(
      "employees",
      "name employeeId"
    );

    res.status(200).json({
      message: "Shifts fetched successfully",
      shifts,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});


router.get("/my-shift",authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const shift = await Shift.findOne({
      employees: employeeId,
    });

    if (!shift) {
      return res.status(404).json({
        message: "No shift assigned to you",
      });
    }

    res.status(200).json({
      message: "Shift fetched successfully",
      shift: {
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
