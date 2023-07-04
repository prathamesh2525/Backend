const jwt = require("jsonwebtoken")

const secret = "Qwerty9090"

let token = jwt.sign(
  {
    email: "pmm@gmail.com",
    password: "12345",
  },
  secret
)

console.log(token)

jwt.verify(token, secret, (err, orignalString) => {
  if (err) throw err
  console.log(orignalString)
})
