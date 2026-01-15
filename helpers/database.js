const path = require("path");
const db = require("better-sqlite3")(
  path.join(__dirname, "..", "bibliothek.db")
);

console.log(db);

const Fuse = require("fuse.js");

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

const fetchAllBooks = () => {
  const query =
    "SELECT b.title, b.bookid, b.author, b.genre, b.isbn, b.available, g.genrename FROM book AS b INNER JOIN genres AS g ON b.genre = g.genreid;";
  try {
    return db.prepare(query).all();
  } catch (error) {
    console.log(error);
  }
};

const deleteBook = (bookid) => {
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
      "INSERT INTO rental (bookid, rental_giv, rental_date, rental_receiver, returned) VALUES (?, ?, ?, ?, 0)";
    const modifybooks = "UPDATE book SET available = 0 WHERE bookid = ?";

    db.prepare(insernewrental).run(bookid, userid.userid, date, customername);
    db.prepare(modifybooks).run(bookid);
  } catch (error) {
    console.error(error);
  }
};

const returnBook = (bookid) => {
  try {
    db.prepare("UPDATE rental SET returned = 1 WHERE bookid = ?").run(bookid);
    db.prepare("UPDATE book SET available = 1 WHERE bookid = ?").run(bookid);
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  modifyBook,
  deleteBook,
  borrowBookAway,
  returnBook,
  fetchBorrowedBooks,
  queryUser,
  usernameToID,
  fetchAllBooks,
};
