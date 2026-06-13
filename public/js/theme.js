(function () {
  const KEY = "medora_theme_v3";
  const icon = document.getElementById("themeIcon");
  const toggle = document.getElementById("themeToggle");

  if (!toggle || !icon) return;

  function apply(mode) {
    if (mode === "light") {
      document.body.classList.add("light-mode");
      icon.className = "bi bi-sun";
    } else {
      document.body.classList.remove("light-mode");
      icon.className = "bi bi-moon";
    }
  }

  const saved = localStorage.getItem(KEY) || "dark";
  apply(saved);

  toggle.onclick = () => {
    const mode = document.body.classList.toggle("light-mode") ? "light" : "dark";
    apply(mode);
    localStorage.setItem(KEY, mode);
  };
})();
