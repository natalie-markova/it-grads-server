const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
    const accessSecret = process.env.JWT_SECRET || "ACCESS_SECRET_KEY";
    const refreshSecret = process.env.JWT_REFRESH_SECRET || "REFRESH_SECRET_KEY";
    const accessExpires = process.env.JWT_ACCESS_EXPIRES || "15m";
    const refreshExpires = process.env.JWT_REFRESH_EXPIRES || "7d";

    const payload = { userId };

    return {
        accessToken: jwt.sign(payload, accessSecret, {
            expiresIn: accessExpires
        }),
        refreshToken: jwt.sign(payload, refreshSecret, {
            expiresIn: refreshExpires
        })
    }
}
module.exports = generateToken