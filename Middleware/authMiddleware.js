const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Token required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.employee = decoded;

    next();
  }catch (error) {
  console.log("JWT verification failed:", error.name, error.message);

  return res.status(401).json({
    message: "Invalid or expired token",
  });
}
};

const isAdmin = (req, res, next) => {
  if (req.employee?.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Admin only.",
    });
  }

  next();
};

module.exports = {authMiddleware,isAdmin};