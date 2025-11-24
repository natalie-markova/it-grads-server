const jwt = require("jsonwebtoken");
const jwtConfig = require("./jwt.config");

const generateToken = (payload) => {

    return {
        accessToken: jwt.sign(payload, "ACCESS_SECRET_KEY", {
            expiresIn: jwtConfig.access
        }),
        refreshToken: jwt.sign(payload, "REFRESH_SECRET_KEY", {
            expiresIn: jwtConfig.refresh
        })
    }
}
module.exports = generateToken