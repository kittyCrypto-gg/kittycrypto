// Function to get a cookie value
const getCookie = (name) => {
  const cookies = document.cookie.split("; ");
  const cookie = cookies.find(row => row.startsWith(`${name}=`));
  return cookie ? cookie.split("=")[1] : null;
};

// Function to set a cookie
const setCookie = (name, value, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
};

// Function to delete a cookie
const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
};

// Load JSON file for UI elements
fetch('./main.json')
  .then(response => {
    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    //console.log('Loaded JSON data:', data);

    // Populate the menu
    const menu = document.getElementById('main-menu');
    if (!menu) throw new Error('Element #main-menu not found!');
    for (const [text, link] of Object.entries(data.mainMenu)) {
      const button = document.createElement('a');
      button.href = link;
      button.textContent = text;
      button.classList.add('menu-button');
      menu.appendChild(button);
    }

    // Populate the header
    const header = document.getElementById('main-header');
    if (!header) throw new Error('Element #main-header not found!');
    header.textContent = data.header;

    // Populate the footer
    const footer = document.getElementById('main-footer');
    if (!footer) throw new Error('Element #main-footer not found!');
    const currentYear = new Date().getFullYear();
    footer.textContent = data.footer.replace('${year}', currentYear);

    // Theme Toggle Button
    const themeToggle = document.createElement("button");
    themeToggle.id = "theme-toggle";
    themeToggle.classList.add("theme-toggle-button");
    document.body.appendChild(themeToggle);

    // Check if dark mode is enabled in cookies
    const isDarkMode = getCookie("darkMode") === "true";
    themeToggle.textContent = isDarkMode ? data.themeToggle.dark : data.themeToggle.default;
    document.getElementById("theme-stylesheet").setAttribute("href", isDarkMode ? "darkStyles.css" : "styles.css");

    // Toggle Dark Mode
    themeToggle.addEventListener("click", () => {
      const currentTheme = getCookie("darkMode") === "true";
      if (currentTheme) {
        deleteCookie("darkMode");
        themeToggle.textContent = data.themeToggle.default;
        document.getElementById("theme-stylesheet").setAttribute("href", "styles.css");
      } else {
        setCookie("darkMode", "true");
        themeToggle.textContent = data.themeToggle.dark;
        document.getElementById("theme-stylesheet").setAttribute("href", "darkStyles.css");
      }
    });
  })
  .catch(error => {
    console.error('Error loading JSON or updating DOM:', error);
  });
