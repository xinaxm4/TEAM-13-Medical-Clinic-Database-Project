/* Get elements from HTML */
/*grabbing parts of the page so JS can control them*/
                                                            /* document = your webpage */
const loginButton = document.getElementById("btn");         /* getElementById("btn") = find the LOGIN button */
const message = document.getElementById("message");         /* getElementById("message") = find the message area */

/* Wait for button click */
loginButton.addEventListener("click", async function (event) {    /* What this means:“When the button is clicked → run this function” (This is how your app reacts to user actions) */
  /* Debug message */
  console.log("Button clicked");      /* What this means:Prints a message in DevTools console (Used for testing/debugging) */
  /* Stop page refresh */
  event.preventDefault();     /* What this means:Stops the form from reloading the page (Without this, the page refreshes and kills your JS) */

  /* Get user input */
  const email = document.getElementById("email").value.trim();          /* What this means:Gets what the user typed (Now you have the login info) */
  const password = document.getElementById("password").value.trim();    /* .value = input text, .trim() = removes extra spaces */

  /* Check if empty */
  if (!email || !password) {          /* What this means:If either field is empty → show message, return stops the function (Basic validation) */
    message.textContent = "Please enter both email and password.";      
    return;
  }

  /* Try to talk to backend */
  try {         /* What this means:“Try this code — if it fails, go to catch” (Used for handling errors safely) */
    
    /* Send request to backend */
    const response = await fetch("http://localhost:3000/api/auth/login", {      /* What this means:Send request to your server (This is the connection:This is the connection:Frontend → Backend) */
      
      /* Define request type */
      method: "POST",         /* What this means:You are sending data (login info), POST = send data, GET = receive data*/
      
      /* Tell server it's JSON */
      headers: {          /* What this means:“I am sending JSON data” */
        "Content-Type": "application/json"
      },
      
      /* Send the actual data */
      body: JSON.stringify({ email, password })         /* What this means:Convert JS object → JSON string, Send email + password */
    });

    /* Wait for server response */
    const data = await response.json();         /* What this means:Convert response back into usable data */

    /* If login successful */
    if (response.ok) {          /* What this means:Status 200 → success */
      message.textContent = "Login successful!";
      localStorage.setItem("user", JSON.stringify(data.user));          /* What this means:Saves user info in browser, This is how your app remembers the user (This is your “session”) */

      setTimeout(() => {          /* What this means:Wait 1 second, Redirect to dashboard */
        window.location.href = "patient_dashboard.html";
      }, 1000);
      
      /* If login fails */
    }else {          /* (Show error message from backend) */
      message.textContent = data.error;
    }

    /* If something breaks */
  } catch (err) {         /* What this means:If fetch fails → show error */
    message.textContent = "Server error";
  }
});