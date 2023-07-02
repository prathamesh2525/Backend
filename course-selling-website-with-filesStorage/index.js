const express = require("express")
const { v4: uuid } = require("uuid")
const fs = require("fs")
const cors = require("cors")
const app = express()

app.use(cors())
app.use(express.json())

let ADMINS = []
let USERS = []
let COURSES = []

try {
  ADMINS = JSON.parse(fs.readFile("admin.json", "utf-8"))
  USERS = JSON.parse(fs.readFile("user.json", "utf-8"))
} catch {
  ADMINS = []
  USERS = []
  COURSES = []
}

const adminAuthentication = (req, res, next) => {
  const { email, password } = req.headers

  fs.readFile("admin.json", "utf-8", (err, data) => {
    if (err) throw err
    ADMINS = JSON.parse(data)

    const admin = ADMINS.find(
      (admin) => admin.email === email && admin.password === password
    )
    if (admin) {
      next()
    } else {
      res.status(403).json({
        message: "Admin authentication failed",
      })
    }
  })
}

const userAuthentication = (req, res, next) => {
  const { email, password } = req.headers

  fs.readFile("user.json", "utf-8", (err, data) => {
    if (err) throw err
    USERS = JSON.parse(data)

    const user = USERS.find(
      (user) => user.email === email && user.password === password
    )
    if (user) {
      req.user = user
      next()
    } else {
      res.status(403).json({
        message: "Admin authentication failed",
      })
    }
  })
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
    const admins = JSON.parse(data)
    admins.push(newAdmin)
    fs.writeFile("admin.json", JSON.stringify(admins), (err) => {
      if (err) throw err
      res.status(201).json(newAdmin)
    })
  })
})

app.post("/admin/login", adminAuthentication, (req, res) => {
  // logic to log in admin
  res.json({ message: "Admin Logged in successfully" })
})

app.post("/admin/courses", adminAuthentication, (req, res) => {
  // logic to create a course

  const newCourse = req.body
  newCourse.courseId = Date.now()
  COURSES.push(newCourse)

  fs.writeFileSync("course.json", JSON.stringify(COURSES))
  res.json({
    message: "Course created successfully",
    courseId: newCourse.courseId,
  })
})

app.put("/admin/courses/:courseId", adminAuthentication, (req, res) => {
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

app.get("/admin/courses", adminAuthentication, (req, res) => {
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
      res.status(201).json(newUser)
    })
  })
})

app.post("/users/login", userAuthentication, (req, res) => {
  // logic to log in user
  res.json({ message: "User logged in successfully" })
})

app.get("/users/courses", userAuthentication, (req, res) => {
  // logic to list all courses
  fs.readFile("course.json", "utf-8", (err, data) => {
    if (err) throw err
    COURSES = JSON.parse(data)

    let filteredCourses = []
    for (let i = 0; i < COURSES.length; i++) {
      if (COURSES[i].published) {
        filteredCourses.push(COURSES[i])
      }
    }
    res.json({ courses: filteredCourses })
  })
})

app.post("/users/courses/:courseId", userAuthentication, (req, res) => {
  // logic to purchase a course
  fs.readFile("course.json", "utf-8", (err, data) => {
    if (err) throw err
    COURSES = JSON.parse(data)

    const course = COURSES.find(
      (course) =>
        course.courseId === parseInt(req.params.courseId) && course.published
    )
    if (course) {
      req.user.purchasedCourses.push(course)
      fs.writeFileSync("user.json", JSON.stringify(USERS))
      res.json({ message: "Course purchased successfully" })
    } else {
      res.status(404).json({ message: "Course not found or not available" })
    }
  })
})

app.get("/users/purchasedCourses", userAuthentication, (req, res) => {
  // logic to view purchased courses
  let purchasedCourses = req.user.purchasedCourses
  // console.log(purchasedCoursesIds)
  // let purchasedCourses = []
  // for (let i = 0; i < COURSES.length; i++) {
  //   if (purchasedCoursesIds.indexOf(COURSES[i].id) !== -1) {
  //     purchasedCourses.push(COURSES[i])
  //   }
  // }
  res.json({ purchasedCourses: purchasedCourses })
})

app.listen(8080, () => {
  console.log("Server is listening on port http://localhost:8080")
})
