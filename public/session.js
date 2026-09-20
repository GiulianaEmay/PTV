(function () {
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const res = await fetchOriginal(input, init);
    const url = typeof input === "string" ? input : input.url;
    if (res.status === 401 && !url.includes("/api/login")) {
      window.location.href = "login.html";
    }
    return res;
  };
})();
