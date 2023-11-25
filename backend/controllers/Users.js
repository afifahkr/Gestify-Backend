import Users from "../models/UserModel.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { UnknownConstraintError } from "sequelize"

export const getUsers = async(req, res) => {
    try {
        const users = await Users.findAll({
            //hanya menampilkan data brkt
            attributes: ['id', 'name', 'email']
        })
        res.json(users)

    } catch (error) {
        console.log(error)

    }
}

export const Register = async(req, res) => {
    const { name, email, password, confpassword } = req.body
    if (password !== confpassword)
        return res.status(400).json({
            message: "Password dan confirm password tidak cocok"
        })
    const salt = await bcrypt.genSalt()
    const hashPassword = await bcrypt.hash(password, salt)

    try {
        await Users.create({
            name: name,
            email: email,
            password: hashPassword
        })
        res.json({
            message: "Register berhasil"
        })
    } catch (error) {
        console.log(error)
    }

}

export const Login = async(req, res) => {
    try {
        const user = await Users.findAll({
                where: {
                    email: req.body.email
                }
            })
            //if email ditemukan, compare password
        const match = await bcrypt.compare(req.body.password, user[0].password)
        if (!match)
            return res.status(400).json({
                message: "Wrong password"
            })
        const userId = user[0].id //ambil id dari db
        const name = user[0].name
        const email = user[0].email
        const accessToken = jwt.sign({ userId, name, email }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '20s'
            }) // payload -> {}, secret key
        const refreshToken = jwt.sign({ userId, name, email }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '1d'
        })
        await Users.update({
            refresh_token: refreshToken
        }, {
            where: {
                id: userId
            }
        })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 //dalam ms
                //secure: true
        })
        res.json({
            accessToken
        })

    } catch (error) {
        res.status(404).json({
            message: "Email tidak ditemukan"
        })
    }
}

export const Logout = async(req, res) => {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) return res.sendStatus(204) //no content
    const user = await Users.findAll({
        where: {
            refresh_token: refreshToken
        }
    })
    if (!user[0]) return res.sendStatus(204)
    const userId = user[0].id
    await Users.update({ refresh_token: null }, {
        where: {
            id: userId
        }
    })
    res.clearCookie('refreshToken')
    return res.sendStatus(200)
}