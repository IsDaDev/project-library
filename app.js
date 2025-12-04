const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("better-sqlite3")("bibliothek.db");

const Fuse = require("fuse.js");

const PORT = 3000;

const app = express();

app.use(express.json());
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "styles")));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/book-overview", (req, res) => {
  res.render("book_overview");
});

app.get("/api/search", async (req, res) => {
  const search = req.query.param;

  const books = fetchAllBooks();

  if (search == "") res.json(books);

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

app.post("/api/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  return res.send(await createHash(password));
});

const fetchAllBooks = () => db.prepare("SELECT * FROM book").all();

const createHash = async (payload) => {
  return await bcrypt.hash(payload, 10);
};
