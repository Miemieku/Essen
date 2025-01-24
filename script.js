// 1️⃣ 创建一个全局变量 `map`
var map;

document.addEventListener("DOMContentLoaded", function() {
    // 1️⃣ 初始化地图
    map = L.map('map', {
        center: [51.2277, 6.7735],
        zoom: 12,
        zoomControl: false // 禁用默认控件
    });

    // 2️⃣ 添加放大缩小控件
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // 3️⃣ 加载地图瓦片（OpenStreetMap）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 4️⃣ 读取 `data.json` 并加载数据
    loadGeoJSON();

    // 🔹 侧边栏控制逻辑
    var sidebar = document.getElementById("sidebar-container"); // ✅ 选取 `#sidebar-container`
    var menuToggle = document.getElementById("menu-toggle");
    
    menuToggle.addEventListener("click", function() {
        sidebar.classList.toggle("active"); // ✅ 让 `active` 类正确作用在 `#sidebar-container`
    });
});

function loadGeoJSON() {
    const geojsonFiles = [
        { url: "kitas_2024_2025.geojson", color: "green", name: "Kindertagesstaetten" },
        { url: "Schulen_2024_2025.geojson", color: "blue", name: "Schulen" },
        { url: "Stadtteile_WGS84.geojson", color: "green", name: "Stadtteile" }
        { url: "Stadtbezirke_WGS84.geojson", color: "purple", name: "Stadtbezirke" },
        { url: "Stadtgrenze_WGS84.geojson", color: "red", name: "Stadtgrenze" },

    ];

    geojsonFiles.forEach(file => {
        fetch(file.url)
            .then(response => response.json())
            .then(data => {
                console.log(`Geladene Daten von ${file.name}:`, data);

                L.geoJSON(data, {
                    style: function(feature) {
                        return { color: file.color, weight: 2, fillOpacity: 0.3 };
                    },
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, { radius: 6, color: file.color });
                    },
                    onEachFeature: function(feature, layer) {
                        if (feature.properties && feature.properties.name) {
                            layer.bindPopup(`<b>${file.name}:</b> ${feature.properties.name}`);
                        }
                    }
                }).addTo(map);
            })
            .catch(error => console.error(`❌ Fehler beim Laden von ${file.name}:`, error));
    });
}

