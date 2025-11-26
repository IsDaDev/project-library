CREATE TABLE users (
    userid INT PRIMARY_KEY AUTO INCREMENT NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(128) NOT NULL
);

CREATE TABLE genres (
    genreid INT PRIMARY_KEY AUTO INCREMENT NOT NULL,
    genrename VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE book (
    bookid INT PRIMARY_KEY AUTO INCREMENT NOT NULL,
    title VARCHAR(100) NOT NULL,
    author VARCHAR(100),
    genre INT,
    content TEXT,
    isbn VARCHAR(20) UNIQUE,
    available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (genre) REFERENCES genres (genreid)
);

CREATE TABLE rental (
    rentalid INT PRIMARY_KEY AUTO INCREMENT NOT NULL,
    bookid INT NOT NULL,
    rental_giv INT NOT NULL,
    rental_rec DATE,
    FOREIGN KEY (bookid) REFERENCES book (bookid),
    FOREIGN KEY (rental_giv) REFERENCES users (userid)
);
