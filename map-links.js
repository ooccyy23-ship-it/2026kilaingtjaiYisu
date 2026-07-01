const mapLocations = Object.freeze({
  youth: "https://www.google.com/maps/search/?api=1&query=臺東縣臺東市建農里知本路二段292巷139號",
  child: "https://www.google.com/maps/search/?api=1&query=臺東縣卑南鄉泰安村東園一街27號",
});

document.querySelectorAll("[data-map-location]").forEach(link => {
  const url = mapLocations[link.dataset.mapLocation];
  if (url) link.href = url;
});
