const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("better-sqlite3")("bibliothek.db");
const env = require("dotenv").config;

env({ quiet: true });

const Fuse = require("fuse.js");

const PORT = 3000;

const app = express();

app.use(
  session({
    secret: process.env.key,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "styles")));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.render("home", { user: req.session.user });
});

app.get("/login", (req, res) => {
  res.render("login", {
    user: req.session.user,
    redirect: req.headers.referer,
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/book-overview", (req, res) => {
  res.render("book_overview", { user: req.session.user });
});

app.get("/manage-books", (req, res) => {
  res.render("manage_books", { user: req.session.user });
});

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

app.post("/api/fetchBooks", (req, res) => {
  const books = fetchAllBooks();
  res.json(books);
});

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

app.post("/api/getBookStatus", (req, res) => {
  const bookid = req.body.id;
  res.json(fetchBorrowedBooks(bookid));
});

app.post("/api/deleteBook", (req, res) => {
  const id = req.body.bookid;

  deletebook(id);

  res.send(200);
});

app.post("/api/book/borrow", (req, res) => {
  const { name, date, bookid } = req.body;
  console.log(req.session);
  console.log(req.session.username);
  const username = usernameToID(req.session.user.username);

  if (!username) {
    res.status(403);
    return;
  }
  try {
    borrowBookAway(username, bookid, date, name);
    res.status(200);
  } catch (error) {
    res.status(500);
  }
});

app.post("/api/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const query = queryUser(username).password;

  if (!query || !(await bcrypt.compare(password, query))) {
    res.status(403).json({ message: "Forbidden", code: 403 });
    return;
  }

  if ((await bcrypt.compare(password, query)) == true) {
    const payload = { username: username, valid: true };
    req.session.user = payload;
    res.status(200).json({ message: "Logged in successfuly", code: 200 });
    return;
  }

  return res
    .status(500)
    .json({ message: "Time out or another error", code: 500 });
});

const fetchAllBooks = () => {
  const query =
    "SELECT b.title, b.bookid, b.author, b.genre, b.isbn, b.available, g.genrename FROM book AS b INNER JOIN genres AS g ON b.genre = g.genreid;";
  try {
    return db.prepare(query).all();
  } catch (error) {
    console.log(error);
  }
};

const mapGenres = (genre) => {
  const allGenres = db.prepare("SELECT * FROM genres").all();

  const fuse = new Fuse(allGenres, {
    keys: ["genrename"],
    threshold: 0.4,
  });

  const search = fuse.search(genre)[0].item.genreid;
  if (!search) {
    return 1;
  }

  return search;
};

const modifyBook = (title, author, genre, isbn, bookid) => {
  const gID = mapGenres(genre);
  try {
    db.prepare(
      "UPDATE book SET title = ?, author = ?, genre = ?, isbn = ? WHERE bookid = ?"
    ).run(title, author, gID, isbn, bookid);
  } catch (error) {
    console.log(error);
  }
};

const deletebook = (bookid) => {
  try {
    db.prepare("DELETE FROM book WHERE bookid = ?").run(bookid);
  } catch (error) {
    console.log(error);
  }
};

const queryUser = (username) => {
  const query = "SELECT password FROM users WHERE username = ?";
  return db.prepare(query).get(username);
};

const fetchBorrowedBooks = (bookid) => {
  const query =
    "SELECT users.username, rental_date, rental_receiver FROM rental INNER JOIN book ON book.bookid = rental.bookid INNER JOIN users ON rental.rental_giv = users.userid WHERE book.bookid = ?;";

  return db.prepare(query).all(bookid);
};

const usernameToID = (username) =>
  db.prepare("SELECT userid FROM users WHERE username = ?").get(username);

const borrowBookAway = (userid, bookid, date, customername) => {
  try {
    const insernewrental =
      "INSERT INTO rental (bookid, rental_giv, rental_date, rental_receiver) VALUES (?, ?, ?, ?)";
    const modifybooks = "UPDATE book SET available = 0 WHERE bookid = ?";

    db.prepare(insernewrental).run(bookid, userid.userid, date, customername);
    db.prepare(modifybooks).run(bookid);
  } catch (error) {
    console.error(error);
  }
};
