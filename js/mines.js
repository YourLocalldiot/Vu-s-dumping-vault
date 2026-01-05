fetch("../json/mines.json")
  .then(res => res.json())
  .then(data => renderMaps(data.maps))
  .catch(err => console.error(err));

function renderMaps(maps) {
  const container = document.getElementById("mapsContainer");
  container.innerHTML = "";

  maps.forEach(map => {
    const col = document.createElement("div");
    col.className = "col-md-3 col-sm-6";

    col.innerHTML = `
      <div class="card map-card h-100" style="cursor:pointer">
        <img src="${map.img}" class="card-img-top" alt="${map.name}">
        <div class="card-body text-center">
          <h5 class="card-title mb-1">${map.name}</h5>
        </div>
      </div>
    `;

    col.querySelector(".map-card").onclick = () => {
      window.location.href =
        `minesplay.html?map=${encodeURIComponent(map.name)}`;
    };

    container.appendChild(col);
  });
}
