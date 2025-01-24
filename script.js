// 1️⃣ 创建地图，默认显示埃森（Essen）
var map;

document.addEventListener("DOMContentLoaded", function() {
    map = L.map('map', {
        center: [51.455643, 7.011555], // Essen 的坐标
        zoom: 12,
        zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // ✅ 加载 `GeoJSON`，但初始时不添加到地图
    initializeGeoJSONLayers();

    // 🔹 侧边栏控制逻辑
    var sidebar = document.getElementById("sidebar-container");
    var menuToggle = document.getElementById("menu-toggle");

    menuToggle.addEventListener("click", function() {
        sidebar.classList.toggle("active");
    });
});

// 2️⃣ 存储 GeoJSON 图层（但不默认添加到地图）
const layerGroups = {}; 

function initializeGeoJSONLayers() {
    const geojsonFiles = [
        { url: "kitas_2024_2025.geojson", color: "green", name: "kindertagesstaetten" },
        { url: "Schulen_2024_2025.geojson", color: "blue", name: "schulen" },
        { url: "Stadtteile_WGS84.geojson", color: "green", name: "stadtteile" },
        { url: "Stadtbezirke_WGS84.geojson", color: "purple", name: "stadtbezirke" },
        { url: "Stadtgrenze_WGS84.geojson", color: "red", name: "stadtgrenze" }
    ];

    geojsonFiles.forEach(file => {
        fetch(file.url)
            .then(response => response.json())
            .then(data => {
                console.log(`Geladene Daten von ${file.name}:`, data);

                let layer = L.geoJSON(data, {
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
                });

                layerGroups[file.name] = layer; // ✅ 存储图层，但不 `addTo(map)`
            })
            .catch(error => console.error(`❌ Fehler beim Laden von ${file.name}:`, error));
    });

    // 3️⃣ 绑定左侧菜单栏复选框
    setupLayerToggle();
}

// 4️⃣ 复选框控制数据可见性
function setupLayerToggle() {
    document.querySelectorAll('#data-layer-list input').forEach(input => {
        input.addEventListener('change', function() {
            if (this.checked) {
                map.addLayer(layerGroups[this.id]); // ✅ 添加图层到地图
            } else {
                map.removeLayer(layerGroups[this.id]); // ✅ 从地图移除
            }
        });
    });
}
