const scrapping = require('./scrapping')
const fs = require('fs')
const express = require('express')
const app = express()
require('dotenv').config()

const hostname = process.env.HOSTNAME
const port = process.env.PORT

app.use(express.json())


app.get('/month', (req, res) => {
    res.sendFile("./month_agenda.json", { root: __dirname })
})

app.get('/day', (req, res) => {
    res.sendFile("./day_agenda.json", { root: __dirname })
})

app.get('/current', (req, res) => {
    res.sendFile("./current_event.json", { root: __dirname })
})


app.listen(port, () => {
    console.log(`listening on port ${port}`)
})

scrapping()
