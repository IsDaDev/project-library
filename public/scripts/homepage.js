// fetches the theader, searchbutton and body of the table
const thead = document.querySelector("#thead");
const tbody = document.querySelector("#tbody");
const searchbtn = document.querySelector("#searchbtn");

// define the json header as a var to not repeat it every time
const jsonHeader = { "Content-Type": "application/json" };

// parses the user from out ejs template
const user = JSON.parse(document.getElementById("user-data").textContent);

// eventlistener on the searchbutton that fetches the value and sends an api request
searchbtn.addEventListener("click", async () => {
  const searchValue = document.querySelector("#searchbar").value;
  const req = await fetch(`/api/search?param=${searchValue}`);
  const res = await req.json();

  // refreshes the page with the new content
  refresh(res);
});

// prints the table header
const printHeader = () => {
  const tr = document.createElement("tr");
  let dataTags = ["Title", "Author", "Genre", "Isbn", "Available"];

  // if the user is logged in, the actions are also pushed
  if (user) {
    dataTags.push("Actions");
  }

  // creates a new tableheader with the elements
  for (let i = 0; i < dataTags.length; i++) {
    const th = document.createElement("th");
    th.innerHTML = dataTags[i];
    tr.appendChild(th);
  }
  thead.appendChild(tr);
};

// removes the p tag
const setEmpty = (message) => {
  const p = document.createElement("p");
  p.innerHTML = message;
  p.style.padding = "1rem";

  tbody.appendChild(p);
};

// fetches all books and refreshes the page with it
const getUpdate = async () => {
  const req = await fetch("/api/fetchBooks", { method: "POST" });
  const res = await req.json();
  refresh(res);
};

// fetches all modified input fields in the edit mode and
// sends a post request with the new data to update information on a given book
const doApply = async (targetID) => {
  const dataTags = ["title", "author", "genre", "isbn", "bookid"];
  const allModifiedValues = document.querySelectorAll(".modifiedValue");
  let body = {};

  for (let i = 0; i < 4; i++) {
    const val = allModifiedValues[i]?.value;
    body[dataTags[i]] = val;
  }

  body[dataTags[4]] = targetID;

  const req = await fetch("/api/modifyBook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: jsonHeader,
  });
  if (req.status == 200) {
    getUpdate();
  }
};

// prompts the user to input a specific string and if the string is entered the book is deleted
const doDelete = (targetISBN) => {
  const userPrompt =
    'You are trying to delete a book here. If you are sure you want to do that type "CONFIRM".';
  prompt(userPrompt) == "CONFIRM"
    ? fetch("/api/deleteBook", {
        method: "POST",
        body: JSON.stringify({ bookid: targetISBN }),
        headers: jsonHeader,
      })
    : console.log("not deleting");
  getUpdate();
};

// inputfields with the values pre-filled are generated
const deployInputFieldsWithValue = (newRow, children) => {
  for (let i = 0; i < 4; i++) {
    const contentTD = document.createElement("td");
    const content = document.createElement("input");
    content.value = children[i].innerText;
    content.classList.add("modifiedValue");
    contentTD.appendChild(content);
    newRow.appendChild(contentTD);
  }
};

// deploys buttons for deletion and applying and adds an eventlistener
// calling either doapply or doDelete depending on the button pressed
const deployButtonsForActions = (newRow, bookid) => {
  const buttonObjects = [
    { content: "Apply", class: "applybtn" },
    { content: "Delete", class: "deletebtn" },
  ];
  for (let i = 0; i < 2; i++) {
    const buttonTD = document.createElement("td");
    const button = document.createElement("button");

    button.innerHTML = buttonObjects[i].content;
    button.classList.add(buttonObjects[i].class);
    buttonTD.classList.add("smallColumn");
    button.dataset.isbn = bookid;

    buttonTD.appendChild(button);
    newRow.appendChild(buttonTD);

    button.addEventListener("click", (e) => {
      const btn = e.srcElement.classList[0];
      btn == "applybtn" ? doApply(bookid) : doDelete(bookid);
    });
  }
};

// this function closes or opens the edit section / edit mode
// if it is open it gets closed and if it isn't it is opened
const toggleEditSection = (e, btn) => {
  const isOpen = document.querySelector(".editRow") || null;
  if (isOpen) isOpen.remove();

  const currentRow = btn.closest("tr");
  const children = currentRow.childNodes;

  const newRow = document.createElement("tr");

  deployInputFieldsWithValue(newRow, children);

  deployButtonsForActions(newRow, currentRow.dataset.id);

  newRow.classList.add("editRow");

  currentRow.insertAdjacentElement("afterend", newRow);

  if (btn.innerText == "Toggle") {
    document.querySelector(".editRow").remove();
    btn.innerText = "Edit";
    return;
  }

  btn.innerText = "Toggle";
};

// helper function to create a label with input
function labeledInput(labelText, type = "text") {
  const label = document.createElement("label");
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = type;

  return [label, input];
}

// toggles the borrow section
const toggleBorrowSection = async (e, btn) => {
  const isOpen = document.querySelector(".editRow") || null;
  if (isOpen) isOpen.remove();

  const currentRow = btn.closest("tr");
  const id = currentRow.dataset.id;
  const av = currentRow.dataset.av;

  const newRow = document.createElement("tr");

  const td = document.createElement("td");

  newRow.appendChild(td);
  newRow.classList.add("boborder");
  td.colSpan = 6;

  // if the book is not available it fetches who borrowed the book
  if (av == 0) {
    const req = await fetch("/api/getBookStatus", {
      method: "POST",
      headers: jsonHeader,
      body: JSON.stringify({ id: id }),
    });
    const res = await req.json();

    // displays who borrowed the book and creates a button to return the book
    if (res.length !== 0) {
      const rental = res[0];
      td.innerHTML = `
            <div class="rental-history">
                <div class="rental-details">
                    <div class="rental-detail">
                        <span class="detail-label">Borrowed by:</span>
                        <span class="detail-value">${
                          rental.rental_receiver
                        }</span>
                    </div>
                    <div class="rental-detail">
                        <span class="detail-label">Library User:</span>
                        <span class="detail-value">${rental.username}</span>
                    </div>
                    <div class="rental-detail">
                        <span class="detail-label">Rental Date:</span>
                        <span class="detail-value">${rental.rental_date}</span>
                    </div>
                </div>
                <button class="return-book-btn" data-id="${
                  rental.book_id || ""
                }">
                    Mark as Returned
                </button>
            </div>
        `;

      const btn = newRow.querySelector(".return-book-btn");

      // event listener on that return button that sends an API
      // request to return the book when clicked
      btn.addEventListener("click", async () => {
        const editRow = document.querySelector("tr.editRow");
        const rowAbove = editRow?.previousElementSibling;

        const bookid = rowAbove.dataset.id;

        const req = await fetch("/api/returnBook", {
          method: "POST",
          headers: jsonHeader,
          body: JSON.stringify({ bookid }),
        });

        if (req.ok) window.location.href = "/book-overview";
        else alert("Error");
      });
    }
  } else {
    // if the book is available it generates a form to borrow
    // the book to a specific user
    newRow.innerHTML = `
        <td>
          <label>Rent book to:</label>
          <label>Rented book on:</label>
        </td>
        <td colspan="2">
          <input type="text" class="rentname">
          <br>
          <input type="date" class="rentdate">
        </td>
        <td colspan="3">
          <button type="button" class="borrow-book-btn">Borrow</button>
        </td>
      `;

    const btn = newRow.querySelector(".borrow-book-btn");

    // adds an event listener so that the book can be borrowed away
    btn.addEventListener("click", async () => {
      const customerName = newRow.querySelector(".rentname").value;
      const customerDate = newRow.querySelector(".rentdate").value;

      const editRow = document.querySelector("tr.editRow");
      const rowAbove = editRow?.previousElementSibling;

      const req = await fetch("/api/book/borrow", {
        method: "POST",
        headers: jsonHeader,
        body: JSON.stringify({
          name: customerName,
          date: customerDate,
          bookid: rowAbove.dataset.id,
        }),
      });

      console.log(req);

      // refreshes the page
      if (req.status == 200) window.location.href = "/book-overview";
      else alert("There was an error, please try again");
    });
  }

  newRow.classList.add("editRow");

  currentRow.insertAdjacentElement("afterend", newRow);

  if (btn.innerText == "Toggle") {
    document.querySelector(".editRow").remove();
    btn.innerText = "Borrow";
    return;
  }

  btn.innerText = "Toggle";
};

// creates the table with all the books etc given
const refresh = (data) => {
  const dataTags = ["title", "author", "genrename", "isbn", "available"];

  if (user) dataTags.push("actions");

  // clear content
  thead.innerHTML = tbody.innerHTML = "";

  // returns an error if there is no data or there was a problem
  if (!data || data.length == 0) {
    setEmpty("No books found. Search for a different title.");
    return;
  }

  // checks if the data is more than 0
  if (data.length > 0) {
    printHeader();
    data.forEach((element) => {
      let e = element;

      // reassigns element.item to the variable e
      if (element?.item) e = element.item;

      // creates a new row
      const tr = document.createElement("tr");

      // it loops through each datatag
      for (let i = 0; i < dataTags.length; i++) {
        // creates a new tabledata element
        const td = document.createElement("td");
        // if the dataTag is for the availability it makes the
        // column small and adds a emoji instead of 1 and 0
        if (dataTags[i] === "available") {
          td.innerText = e[dataTags[i]] ? "✅" : "❌";
          td.classList.add("smallColumn");
          td.classList.add("center");

          // if it is action the new buttons for
          // editing and borrowing are created
        } else if (dataTags[i] == "actions") {
          const btn = document.createElement("button");
          btn.innerText = "Edit";
          btn.classList.add("editbtn");
          btn.dataset.id = e[dataTags[3]];

          td.appendChild(btn);

          const btnBorrow = document.createElement("button");
          btnBorrow.innerText = "Borrow";
          btnBorrow.classList.add("borrowbtn");
          btnBorrow.dataset.id = e[dataTags[3]];

          td.appendChild(btnBorrow);
          td.classList.add("smallColumn");
          // otherwise the data is just appended normally
        } else td.innerText = e[dataTags[i]];

        // appends the td to the new row
        tr.appendChild(td);
      }

      // sets the id and availability on the row
      tr.dataset.id = element.bookid;
      tr.dataset.av = element.available;

      // appends the row
      tbody.appendChild(tr);
    });

    // selects edit and borrowbuttons
    const editBtns = document.querySelectorAll(".editbtn");
    const borrowBtns = document.querySelectorAll(".borrowbtn");

    // creates an event listener for each and calls the
    // toggleEdit or toggleBorrow function on click
    editBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => toggleEditSection(e, btn));
    });

    borrowBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => toggleBorrowSection(e, btn));
    });
  }
};

// updates the table when the page is loaded
document.addEventListener("DOMContentLoaded", async () => {
  getUpdate();
});
