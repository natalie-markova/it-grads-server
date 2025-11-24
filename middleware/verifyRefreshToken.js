const jwt = require("jsonwebtoken");
const verifyRefreshToken = (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        
        if (!refreshToken) {
            return res.status(401).json({ error: "Refresh token not found" });
        }
        
        const { user } = jwt.verify(refreshToken, "REFRESH_SECRET_KEY");
        res.locals.user = user;
        next();
    } catch (error) {
        
        console.log("INVALID REFRESH TOKEN:", error.message);
        res.status(401).json({ error: "Invalid or expired refresh token" });
    }
}
module.exports = verifyRefreshToken;