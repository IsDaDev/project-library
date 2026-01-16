// import node modules
const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcrypt");
const env = require("dotenv").config;
const Fuse = require("fuse.js");

// initialize env
env({ quiet: true });

// define a constant for the port
const PORT = 3000;

// start the app
const app = express();

// sets up express sessions with the key from the env and other options
app.use(
  session({
    secret: process.env.key,
    resave: false,
    saveUninitialized: true,
  })
);

// option to enable parsing nested json and json in general
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// sets the view engine to use ejs
app.set("view engine", "ejs");

// static folder public is served publically
app.use(express.static(path.join(__dirname, "public")));

// imports all important functions from the helper function
const {
  modifyBook,
  fetchAllBooks,
  borrowBookAway,
  returnBook,
  fetchBorrowedBooks,
  queryUser,
  usernameToID,
  fetchGenres,
  createBook,
} = require("./helpers/database.js");

// starts the service on the port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// route for the root dir, passes the user
app.get("/", (req, res) => {
  res.render("home", { user: req.session.user });
});

// route to impressum, passes the user
app.get("/impressum", (req, res) => {
  res.render("impressum", { user: req.session.user });
});

// route to privacy, passes the user
app.get("/privacy", (req, res) => {
  res.render("privacy", { user: req.session.user });
});

// route to login, passes the user and the redirect
app.get("/login", (req, res) => {
  res.render("login", {
    user: req.session.user,
    redirect: req.headers.referer,
  });
});

// route to logout, destroys the session
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// route to the book overview, passes the user and genres
app.get("/book-overview", (req, res) => {
  res.render("book_overview", {
    user: req.session.user,
    genres: fetchGenres(),
  });
});

// route to the search api requst, takes a search parameter and
// fetches all books similar to that using the fuze fuzzing library
app.get("/api/search", async (req, res) => {
  const search = req.query.param;
  const books = fetchAllBooks();

  if (search == "") {
    res.json(books);
    return;
  }

  const fuse = new Fuse(books, {
    keys: ["title"],
    threshold: 0.4,
  });

  res.json(fuse.search(search));
});

// api to fetch all books
app.post("/api/fetchBooks", (req, res) => {
  const books = fetchAllBooks();
  res.json(books);
});

// post api to modify a given book
app.post("/api/modifyBook", (req, res) => {
  const { title, author, genre, isbn, bookid } = req.body;

  try {
    modifyBook(title, author, genre, isbn, bookid);
    res.send(200);
    return;
  } catch (error) {
    res.send(500);
  }
});

// api to fetch the status of a book (borrowed or available)
app.post("/api/getBookStatus", (req, res) => {
  const bookid = req.body.id;
  res.json(fetchBorrowedBooks(bookid));
});

// post route to delete a book
app.post("/api/deleteBook", (req, res) => {
  const id = req.body.bookid;
  deletebook(id);
  res.send(200);
});

// route to create a new book
app.post("/api/createNewBook", (req, res) => {
  const { title, isbn, author, genre } = req.body;

  const ret = createBook([title, isbn, author, genre]);

  res.status(200).send(ret);
});

// api route to borrow a book
app.post("/api/book/borrow", (req, res) => {
  const { name, date, bookid } = req.body;
  const username = usernameToID(req.session.user.username);

  // user validation
  if (!username) {
    res.status(403);
    return;
  }
  try {
    borrowBookAway(username, bookid, date, name);
    res.status(200).send();
  } catch (error) {
    res.status(500).send();
  }
});

// post route to return a book that was borrowed
app.post("/api/returnBook", (req, res) => {
  try {
    const bookid = req.body.bookid;
    returnBook(bookid);
    res.status(200).send();
  } catch (error) {
    res.status(500).send();
  }
});

// login route that checks the password using bcrypt
app.post("/api/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const query = queryUser(username).password;

  // if no user exists or the password is wrong the code is 403
  if (!query || !(await bcrypt.compare(password, query))) {
    res.status(403).json({ message: "Forbidden", code: 403 });
    return;
  }

  // compares the password and creates a new session if its valid
  if ((await bcrypt.compare(password, query)) == true) {
    const payload = { username: username, valid: true };
    req.session.user = payload;
    res.status(200).json({ message: "Logged in successfuly", code: 200 });
    return;
  }

  // returns an internal server error if anything else goes wrong
  return res
    .status(500)
    .json({ message: "Time out or another error", code: 500 });
});
