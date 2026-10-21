const express = require("express");
const bcrypt = require("bcryptjs");
const Employee = require("../models/employee");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { employeeId, name, email, password } = req.body;

    const existingEmployee = await Employee.findOne({
      email: email,
    });

    if (existingEmployee) {
      return res.status(400).json({
        message: "Employee already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = new Employee({
      employeeId,
      name,
      email,
      password: hashedPassword,
    });

    await employee.save();

    res.status(201).json({
      message: "Employee registered successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

router.post("/login",async (req,res)=>{
    try{
        const {employeeId,password}= req.body;

        const employee= await Employee.findOne({employeeId});

        if(!employee){
             return res.status(400).json({
             message: "Invalid Employee ID or Password",
        })
    }

        const isPasswordCorrect= await bcrypt.compare(
            password,
            employee.password
        );

        if(!isPasswordCorrect){
             return res.status(400).json({
             message: "Invalid Employee ID or Password",
      })
    }
        const token = jwt.sign(
      {
        id: employee._id,
        employeeId: employee.employeeId,
        role: employee.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token: token,
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  }
   catch (error) {
     res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
})

module.exports = router;