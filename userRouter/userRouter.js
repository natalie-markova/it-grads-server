const express = require("express");
const userRouter = express.Router();
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");
const cookieConfig = require("../utils/cookie.config");
const { Graduates, Employers } = require("../db/models");
userRouter.get("/", (req, res) => {
    res.json({ message: "ok" })
});
userRouter.post("/registration", async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        console.log(req.body)  
        if (!(username && email && password && role)) {
            res.status(400).json({ error: "Все поля обязательны для заполнения" });
            return;
        }
        if (role !== 'graduate' && role !== 'employer') {
            res.status(400).json({ error: "Роль должна быть 'graduate' или 'employer'" });
            return;
        }
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)
        
        const UserModel = role === 'graduate' ? Graduates : Employers;
        
        const existingUser = await UserModel.findOne({ where: { email } });
        if (existingUser) {
            res.status(409).json({ error: "Пользователь с таким email уже существует" });
            return;
        }
        
        const user = await UserModel.create({
            username,
            email,
            password: hashedPassword,
            role
        });
        
        console.log("USER: ", user.get());
        const cleanUser = user.get()
        delete cleanUser.password
        delete cleanUser.createdAt
        delete cleanUser.updatedAt
        const { accessToken, refreshToken } = generateToken({ user: cleanUser })
        res
        .cookie("refreshToken", refreshToken, cookieConfig)
        .json({ accessToken, user: cleanUser })
    } catch (error) {
        console.log("ERROR: ", error.message);
        res.status(400).json({ error: "Произошла ошибка при регистрации" })
    }   
});
userRouter.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("REQ.BODY: ", req.body);
        
        let user = await Graduates.findOne({ where: { email } });
        
        if (!user) {
            user = await Employers.findOne({ where: { email } });
        }
        
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(403).json({ error: "Неверный пароль" });
        }
        
        const transferUser = user.get();
        delete transferUser.createdAt;
        delete transferUser.updatedAt;
        delete transferUser.password;

        
        const { accessToken, refreshToken } = generateToken({ user: transferUser });
        res.cookie("refreshToken", refreshToken, cookieConfig);
        res.json({ message: "ok", accessToken, user: transferUser });
    } catch (error) {
        console.log("ERROR: ", error.message);
        res.status(400).json({ error: "Произошла ошибка авторизации" });
    }
});

userRouter.get("/logout", (req, res) => {
    res
        .clearCookie("refreshToken")
        .status(200)
        .end()
});

module.exports = userRouter;