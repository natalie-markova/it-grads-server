require('dotenv').config();
const express = require("express");
const serverConfig = require("./serverConfig");
const userRouter = require('./userRouter/userRouter');
const generateToken = require('./utils/generateToken');
const cookieConfig = require('./utils/cookie.config');
const verifyRefreshToken = require('./middleware/verifyRefreshToken');
const verifyAccessToken = require('./middleware/verifyAccessToken');
const app = express();
const PORT = process.env.PORT || 6001;
serverConfig(app);
app.get('/api/status', verifyAccessToken, (_, res) => {
    res.json({ message: 'ok', uptime: process.uptime() })
});
app.use("/api/users", userRouter);
app.get("/api/tokens/refresh", verifyRefreshToken, (req, res) => {
    const { accessToken, refreshToken } = generateToken({ user: res.locals.user })
    res
        .cookie("refreshToken", refreshToken, cookieConfig)
        .json({ accessToken, user: res.locals.user })
});
app.listen(PORT, () => {
    console.log("server started on port: ", PORT)
});