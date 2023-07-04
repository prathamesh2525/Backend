const express = require("express")
const { v4: uuid } = require("uuid")
const fs = require("fs")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const app = express()

app.use(cors())
app.use(express.json())

let ADMINS = []
let USERS = []
let COURSES = []

const secretKey = "SECRET_KEY_HERE"

try {
  ADMINS = JSON.parse(fs.readFileSync("admin.json", "utf-8"))
  USERS = JSON.parse(fs.readFileSync("user.json", "utf-8"))
  COURSES = JSON.parse(fs.readFileSync("course.json", "utf8"))
} catch {
  ADMINS = []
  USERS = []
  COURSES = []
}

const generateJwt = (user) => {
  const payload = { email: user.email }
  return jwt.sign(payload, secretKey, { expiresIn: "1h" })
}

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (authHeader) {
    const token = authHeader.split(" ")[1]

    jwt.verify(token, secretKey, (err, user) => {
      if (err) return res.sendStatus(403)

      req.user = user
      next()
    })
  } else {
    res.sendStatus(401)
  }
}

// Admin routes
app.post("/admin/signup", (req, res) => {
  // logic to sign up admin
  const newAdmin = {
    email: req.body.email,
    password: req.body.password,
  }
  fs.readFile("admin.json", "utf-8", (err, data) => {
    if (err) throw err
    ADMINS = JSON.parse(data)
    const existingAdmin = ADMINS.find((a) => a.email === newAdmin.email)
    if (existingAdmin) {
      res.status(403).json({
        message: "Admin already exists",
      })
    } else {
      ADMINS.push(newAdmin)
      fs.writeFile("admin.json", JSON.stringify(ADMINS), (err) => {
        if (err) throw err
        const token = generateJwt(newAdmin)
        res.json({ message: "Admin created successfully", token })
      })
    }
  })
})

app.post("/admin/login", (req, res) => {
  // logic to log in admin
  fs.readFile("admin.json", "utf-8", (err, data) => {
    if (err) throw err
    ADMINS = JSON.parse(data)
    const { email, password } = req.body
    const admin = ADMINS.find(
      (a) => a.email === email && a.password === password
    )
    if (admin) {
      const token = generateJwt(admin)
      res.json({ message: "Admin Logged in successfully", token })
    } else {
      res.status(403).json({
        message: "Admin authentication failed",
      })
    }
  })
})

app.post("/admin/courses", authenticateJwt, (req, res) => {
  // logic to create a course
  console.log(req.user.email)
  fs.readFile("course.json", "utf-8", (err, data) => {
    if (err) throw err
    COURSES = JSON.parse(data)

    const newCourse = req.body
    newCourse.courseId = COURSES.length + 1
    COURSES.push(newCourse)

    fs.writeFileSync("course.json", JSON.stringify(COURSES))
    res.json({
      message: "Course created successfully",
      courseId: newCourse.courseId,
    })
  })
})

app.put("/admin/courses/:courseId", authenticateJwt, (req, res) => {
  // logic to edit a course

  fs.readFile("course.json", "utf-8", (err, data) => {
    if (err) throw err
    COURSES = JSON.parse(data)

    let course = COURSES.find(
      (c) => c.courseId === parseInt(req.params.courseId)
    )
    console.log(course)
    if (course) {
      Object.assign(course, req.body)
      fs.writeFile("course.json", JSON.stringify(COURSES), (err) => {
        if (err)
          return res.status(500).json({ error: "Failed to update course" })
        res.json({ message: "Course updated successfully" })
      })
    } else {
      res.status(404).json({ message: "Course not found" })
    }
  })
})

app.get("/admin/courses", authenticateJwt, (req, res) => {
  // logic to get all courses
  fs.readFile("course.json", "utf-8", (err, data) => {
    if (err) throw err
    COURSES = JSON.parse(data)
    console.log(COURSES)
    res.json({ courses: COURSES })
  })
})

// User routes
app.post("/users/signup", (req, res) => {
  // logic to sign up user
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    purchasedCourses: [],
  }
  fs.readFile("user.json", "utf-8", (err, data) => {
    if (err) throw err
    const users = JSON.parse(data)
    users.push(newUser)
    fs.writeFile("user.json", JSON.stringify(users), (err) => {
      if (err) throw err
      const token = generateJwt(newUser)
      res.status(201).json({ message: "User created successfully", token })
    })
  })
})

app.post("/users/login", authenticateJwt, (req, res) => {
  // logic to log in user
  res.json({ message: "User logged in successfully" })
})

app.get("/users/courses", authenticateJwt, (req, res) => {
  // logic to list all courses
  fs.readFile("course.json", "utf-8", (err, data) => {
    if (err) throw err
    COURSES = JSON.parse(data)

    let filteredCourses = COURSES.filter((c) => c.published)
    res.json({ courses: filteredCourses })
  })
})

app.post("/users/courses/:courseId", authenticateJwt, (req, res) => {
  // logic to purchase a course
  fs.readFile("course.json", "utf-8", (err, data) => {
    if (err) throw err
    COURSES = JSON.parse(data)

    const course = COURSES.find(
      (course) =>
        course.courseId === parseInt(req.params.courseId) && course.published
    )
    if (course) {
      const user = USERS.find((u) => u.email === req.user.email)
      if (user) {
        if (!user.purchasedCourses) {
          user.purchasedCourses = []
        }
        user.purchasedCourses.push(course)
        fs.writeFileSync("user.json", JSON.stringify(USERS))
        res.json({ message: "Course purchased successfully" })
      } else {
        res.status(403).json({ message: "User not found" })
      }
    } else {
      res.status(404).json({ message: "Course not found or not available" })
    }
  })
})

app.get("/users/purchasedCourses", authenticateJwt, (req, res) => {
  // logic to view purchased courses
  const user = USERS.find((u) => u.email === req.user.email)
  if (user && user.purchasedCourses) {
    let purchasedCourses = user.purchasedCourses
    // console.log(purchasedCoursesIds)
    // let purchasedCourses = []
    // for (let i = 0; i < COURSES.length; i++) {
    //   if (purchasedCoursesIds.indexOf(COURSES[i].id) !== -1) {
    //     purchasedCourses.push(COURSES[i])
    //   }
    // }
    res.json({ purchasedCourses: purchasedCourses })
  } else {
    res.status(404).json({
      message: "No course purchased",
    })
  }
})

app.listen(8080, () => {
  console.log("Server is listening on port http://localhost:8080")
})
