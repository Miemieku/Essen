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

        // 📌 绑定搜索功能
    setupSearch();

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

function setupSearch() {
    const searchBox = document.getElementById("search-box");
    const searchButton = document.getElementById("search-button");
    
    searchButton.addEventListener("click", function () {
        const address = searchBox.value;
        if (address) {
            searchAddress(address);
        } else {
            alert("Bitte geben Sie eine Adresse ein.");
        }
    });

    // 允许用户按 "Enter" 触发搜索
    searchBox.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            searchButton.click();
        }
    });
}

function searchAddress(address) {
    // 使用 OSM Nominatim API 进行地址查询
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = data[0].lat;
                const lon = data[0].lon;
                console.log(`Adresse gefunden: ${lat}, ${lon}`);

                // 清除之前的标记
                if (window.searchMarker) {
                    map.removeLayer(window.searchMarker);
                }

                // 在地图上显示地址位置
                window.searchMarker = L.marker([lat, lon]).addTo(map)
                    .bindPopup(`<b>${address}</b><br>Latitude: ${lat}<br>Longitude: ${lon}`)
                    .openPopup();

                // 地图聚焦到新位置
                map.setView([lat, lon], 15);
            } else {
                alert("Adresse nicht gefunden. Bitte versuchen Sie es mit einer genaueren Eingabe.");
            }
        })
        .catch(error => console.error("Fehler beim Suchen der Adresse:", error));
}

// 1️⃣ 存储污染物索引
let componentIndex = {};

// 2️⃣ 获取污染物索引（改为请求 Netlify Functions 代理）
function loadComponentIndex() {
    fetch("https://your-netlify-site.netlify.app/.netlify/functions/ubaProxy") // ✅ 代理 API
        .then(response => response.json())
        .then(data => {
            console.log("🔍 Komponenten-Index:", data);
            if (!data) {
                console.error("❌ Keine Komponenten-Daten verfügbar.");
                return;
            }
            // 存储污染物索引
            for (let id in data) {
                if (!isNaN(id)) { // 只处理 ID 作为键的数据
                    componentIndex[id] = {
                        name: data[id][1],  // 组件代码 (如 "PM10")
                        symbol: data[id][2], // 组件符号 (如 "PM₁₀")
                        unit: data[id][3],  // 组件单位 (如 "µg/m³")
                        description: data[id][4] // 组件完整名称 (如 "Particulate matter")
                    };
                }
            }
            console.log("✅ Komponenten-Index gespeichert:", componentIndex);
        })
        .catch(error => console.error("❌ Fehler beim Laden der Komponenten:", error));
}
// 3️⃣ 获取最新空气质量数据
function getLatestAirQualityData(stationId) {
    if (Object.keys(componentIndex).length === 0) {
        console.warn("⚠️ Komponenten-Index noch nicht geladen, warte 2 Sekunden...");
        setTimeout(() => getLatestAirQualityData(stationId), 2000);
        return;
    }

    const today = new Date().toISOString().split("T")[0];
    const url = `https://your-netlify-site.netlify.app/.netlify/functions/airQualityProxy?date_from=${today}&date_to=${today}&time_from=0&time_to=23&station=${stationId}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log("🔍 API Luftqualität Daten:", data);
            if (!data || !data.data || !data.data[stationId]) {
                alert("❌ Keine aktuellen Luftqualitätsdaten verfügbar.");
                return;
            }

            // 4️⃣ 获取最新的测量时间
            let timestamps = Object.keys(data.data[stationId]);
            if (timestamps.length === 0) {
                alert("❌ Keine Messdaten für heute gefunden.");
                return;
            }
            let latestTimestamp = timestamps[timestamps.length - 1];
            let pollutantData = data.data[stationId][latestTimestamp].slice(3);

            // 5️⃣ 解析污染物数据
            let popupContent = `<h3>Luftqualität (${latestTimestamp})</h3>`;
            pollutantData.forEach(entry => {
                let pollutantId = entry[0].toString(); // 确保 ID 是字符串
                let value = entry[1];
                let pollutantInfo = componentIndex[pollutantId] || { name: `ID ${pollutantId}`, unit: "" };

                popupContent += `<p><b>${pollutantInfo.name} (${pollutantInfo.symbol}):</b> ${value} ${pollutantInfo.unit}</p>`;
            });

            // 6️⃣ 清除旧的空气质量点
            if (window.airQualityMarker) {
                map.removeLayer(window.airQualityMarker);
            }

            // 7️⃣ 在地图上显示空气质量点
            window.airQualityMarker = L.marker([51.455643, 7.011555])
                .bindPopup(popupContent)
                .addTo(map)
                .openPopup();

            map.setView([51.455643, 7.011555], 12);
        })
        .catch(error => console.error("❌ Fehler beim Abrufen der Luftqualität:", error));
}

// 8️⃣ 监听用户点击空气质量选项
document.addEventListener("DOMContentLoaded", function () {
    loadComponentIndex();

    document.getElementById("air-quality").addEventListener("change", function () {
        if (this.checked) {
            getLatestAirQualityData("1290"); // Essen 测量站 ID
        } else {
            if (window.airQualityMarker) {
                map.removeLayer(window.airQualityMarker);
            }
        }
    });
});
