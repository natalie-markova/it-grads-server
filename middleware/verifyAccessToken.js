const jwt = require("jsonwebtoken");
const verifyAccessToken = (req, res, next) => {
    try {
        const accessToken = req.headers.authorization.split(" ")[1]
        const { user } = jwt.verify(accessToken, "ACCESS_SECRET_KEY")
        res.locals.user = user
        next()       
    } catch (error) {
        console.log("INVALID ACCESS TOKEN");
        res.status(403).end()
    }
}
module.exports = verifyAccessToken;