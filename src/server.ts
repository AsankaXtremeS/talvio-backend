import { env } from "./config/env"
import app from "./app"

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`)
})

app.route("/").get((req, res) => {
  res.send("Welcome to Talvio Backend API")
})